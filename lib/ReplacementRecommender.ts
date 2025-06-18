import { ChatOpenAI } from "@langchain/openai";
import { structuredPrompt } from "./ai";
import { z } from "zod";
import _ from "lodash";
import { maximalMarginalRelevance } from "@langchain/core/utils/math";
import { createWeightedSampler } from "efficient-random-weighted";

type Candidate = {
	name: string;
	cost: number; // normalized cost attribute (0–1)
	convenience: number;
	experience: number;
	healthImpact: number;
	similarityScore: number;
	computedUtility: number;
	bucketIndex?: number;
} & z.infer<typeof AlternativeSchema>;

const gpt4oMini = new ChatOpenAI({
	modelName: "gpt-4o-mini",
	temperature: 0.7,
	timeout: 30_000, // 30s
	maxRetries: 2,
});

const ZeroToOneInclusiveSchema = z
	.number()
	.min(0, { message: "Must be at least 0" })
	.max(1, { message: "Must be at most 1" })
	.describe("<0-1>");

const AlternativeSchema = z.object({
	id: z.string(),
	name: z.string().describe("a brief noun phrase (e.g. “Drive‑thru pickup”, “Meal kit”, “Grocery delivery kit”)"),
	price: z.number().describe("cheaper than the existing spending habit price (i.e. {spendingHabitCost})"),
	pros: z.array(z.string()),
	cons: z.array(z.string()).describe("an array of tradeoffs"),
});

const spendingHabitContextSnippet = `
Given the user has a spending habit:
- name: {spendingHabitName}
- cost: {spendingHabitCost}
- recurrence: {spendingHabitRecurrence}

and the value proposition of the spending habit described by the user:

{valueProposition}
`;

const alreadyRejectedContextSnippet = (
	rejectedCandidates: Array<{ alternative: Pick<Candidate, "name">; reasons: string[] }>,
) =>
	!rejectedCandidates.length
		? ""
		: `
The following replacement spending habits were already previously rejected, please do not suggest them and please also factor this in to what you come up to help prevent it from also getting rejected:
${rejectedCandidates
	.map(({ alternative, reasons }) => `\n- "${alternative.name}" was rejected because: ${reasons.join(" and ")}`)
	.join("")}`;

const preventDupesContextSnippet = (names: string[]) =>
	!names.length
		? ""
		: `
The following replacement spending habits were already recommended, please do not suggest them as they would be considered duplicate:
${names.map((name) => `\n- "${name}"`)}
`;

const DEFAULT_WEIGHTS = { cost: 0.25, convenience: 0.25, experience: 0.25, healthImpact: 0.25 };
const DEFAULT_BUCKET_CONFIGS = [
	{ minSimilarity: 0.75, maxSimilarity: 1.0, targetCount: 3 },
	{ minSimilarity: 0.45, maxSimilarity: 0.74, targetCount: 1 },
	{ minSimilarity: 0.0, maxSimilarity: 0.44, targetCount: 1 },
];

/**
 * Replacement recommendation orchestrator
 */
export class ReplacementRecommender {
	private pool: Array<Candidate> = [];
	private weights = DEFAULT_WEIGHTS; // gets overridden by derived weights
	private bucketConfigs = DEFAULT_BUCKET_CONFIGS;

	constructor(
		private props: {
			resultSize: number;
			poolToChooseFromSize: number;
			diversityVsRelevanceTradeoffZeroToOne: number;
			basicEquivalenceSimilarityScoreThresholdZeroToOne: number;
			tooManyTradeoffsScoreThresholdZeroToOne: number;
			valueProposition: string;
			spendingHabit: { name: string; amount: `$${string}`; freq: string };
		},
	) {}

	/**
	 * Full pipeline: derive weights, generate, score, diversify, select
	 */
	async run(): Promise<Candidate[]> {
		await this.deriveWeights();
		await this.generatePool();
		await this.tagAndScorePool();
		await this.applyDiversityToPool();
		await this.selectFinalPool();
		return this.pool;
	}

	/**
	 * Derive attribute weights from the user's value proposition description
	 */
	async deriveWeights() {
		const chain = structuredPrompt(
			`
You are an expert at deriving value proposition.

${spendingHabitContextSnippet}

Assign weights to these attributes so they sum to 1: cost, convenience, experience, healthImpact.
`,
			z
				.object({
					cost: ZeroToOneInclusiveSchema,
					convenience: ZeroToOneInclusiveSchema,
					experience: ZeroToOneInclusiveSchema,
					healthImpact: ZeroToOneInclusiveSchema,
				})
				.refine(
					({ cost, convenience, experience, healthImpact }) =>
						Math.abs(cost + convenience + experience + healthImpact - 1) < 1e-6,
					{ message: "Weights must sum to 1 (within a tiny tolerance)" },
				)
				.describe("derived attribute weights"),
			gpt4oMini,
		);

		this.weights = await chain.invoke({
			valueProposition: this.props.valueProposition,
			spendingHabitCost: this.props.spendingHabit.amount,
			spendingHabitName: this.props.spendingHabit.name,
			spendingHabitRecurrence: this.props.spendingHabit.freq,
		});
	}

	/**
	 * Check candidate tradeoffs and similarity, returning pass/fail & reasons
	 */
	async checkCandidate(candidate: z.infer<typeof AlternativeSchema>) {
		const reasons: string[] = [];

		const percentageSavings = Math.round(
			((Number(this.props.spendingHabit.amount.slice(1)) - candidate.price) /
				Number(this.props.spendingHabit.amount.slice(1))) *
				100,
		);

		/**
		 * If the savings is negligible then check if it's basically the same thing
		 */
		if (percentageSavings < 40) {
			const judgeEquivalence = structuredPrompt(
				`
### SYSTEM
You are a personal-finance coach checking whether two consumer spending habits
are *functionally equivalent* (see definition below).

DEFINITION OF “FUNCTIONALLY EQUIVALENT”:
A pair is equivalent only if a typical consumer could substitute one for the
other with **negligible change** in job-to-be-done, context of use, economic
model, *and* switch-cost.

### EXAMPLES
User: Original="DoorDash", Candidate="Uber Eats"
Assistant: {{"equivalent": true, "similarity_score": 0.93, "reason": "Both are on-demand restaurant delivery apps with near-identical ordering flows, pricing, and usage contexts."}}

User: Original="DoorDash", Candidate="HelloFresh"
Assistant: {{"equivalent": false, "similarity_score": 0.27, "reason": "DoorDash delivers ready-to-eat meals; HelloFresh delivers cook-at-home meal kits requiring prep, so the job-to-be-done and context differ."}}

User: Original="Amazon Prime Video", Candidate="Netflix"
Assistant: {{"equivalent": true, "similarity_score": 0.86, "reason": "Both are flat-rate streaming video subscriptions consumed on the same devices and contexts."}}

### TASK
Original="{ORIGINAL}"
Candidate="{CANDIDATE}"
`,
				z.object({
					equivalent: z.boolean().describe("true ↔ functionally equivalent"),
					similarity_score: z.number().min(0).max(1).describe("0.0-1.0, higher = more similar"),
					reason: z.string().max(60).describe("≤ 40 words"),
				}),
				gpt4oMini,
			);

			const {
				equivalent,
				similarity_score,
				reason: equivalenceReason,
			} = await judgeEquivalence.invoke({
				ORIGINAL: this.props.spendingHabit.name,
				CANDIDATE: candidate.name,
			});

			if (equivalent && similarity_score > this.props.basicEquivalenceSimilarityScoreThresholdZeroToOne) {
				reasons.push(`Basically equivalent to user's spending habit: ${equivalenceReason}`);
			}
		}

		const judgeTradeoffs = structuredPrompt(
			`
### SYSTEM
You are a personal-finance coach who rates replacement spending habits for
*trade-offs* vs an original habit.

DEFINITION OF “MINIMAL TRADE-OFFS” (see four rules below):
1. Preserve or improve every *key attribute* of the user’s value proposition.
2. Do not appreciably worsen hygiene factors (convenience, availability,
   reliability, safety).
3. Overall weighted utility change must be ≥ 0 (no net loss).
4. No single attribute can be ≥ 2 levels worse on a 5-point scale.

### EXAMPLES
User:
  Original="DoorDash", Candidate="Home-cooked meal prep",
  ValueProposition="I value convenience and good taste but want to lower cost and
  eat a bit healthier."
Assistant:
  {{"minimal_tradeoffs": false,
   "overall_score": 0.42,
   "attribute_deltas": {{"cost": +2, "convenience": -2, "experience": -1,
                        "healthImpact": +1, "reliability": 0, "availability": 0,
                        "safety": +1}},
   "reason": "Cheaper and healthier but loses too much convenience and some taste."}}

User:
  Original="Starbucks daily latte", Candidate="Nespresso at home",
  ValueProposition="Fast caffeine hit, good taste, needs to be affordable."
Assistant:
  {{"minimal_tradeoffs": true,
   "overall_score": 0.81,
   "attribute_deltas": {{"cost": +2, "convenience": -1, "experience": 0,
                        "healthImpact": 0, "reliability": +1, "availability": +1,
                        "safety": 0}},
   "reason": "Slightly less convenient but cheaper, same taste, reliable at home."}}

### TASK
Original="{ORIGINAL}"
Candidate="{CANDIDATE}"
UserValueProposition="{VALUE_PROP}"
AttributeWeights={WEIGHTS_JSON}`,
			z.object({
				minimal_tradeoffs: z.boolean().describe("true ↔ minimal trade-offs"),
				overall_score: z.number().min(0).max(1).describe("0-1 where 1 = perfect, 0 = unacceptable"),
				attribute_deltas: z
					.object({
						cost: z.number().min(-2).max(2),
						convenience: z.number().min(-2).max(2),
						experience: z.number().min(-2).max(2),
						healthImpact: z.number().min(-2).max(2),
						reliability: z.number().min(-2).max(2),
						availability: z.number().min(-2).max(2),
						safety: z.number().min(-2).max(2),
					})
					.describe("-2..+2 per attribute (5-point scale diff)"),
				reason: z.string().max(80).describe("≤ 60 words"),
			}),
			gpt4oMini,
		);

		const {
			minimal_tradeoffs,
			overall_score,
			reason: tradeoffsReason,
		} = await judgeTradeoffs.invoke({
			ORIGINAL: this.props.spendingHabit.name,
			CANDIDATE: candidate.name,
			VALUE_PROP: this.props.valueProposition,
			WEIGHTS_JSON: JSON.stringify(this.weights),
		});

		if (!minimal_tradeoffs && overall_score < this.props.tooManyTradeoffsScoreThresholdZeroToOne) {
			reasons.push(`Too many tradeoffs to user's spending habit: ${tradeoffsReason}`);
		}

		return { reasons };
	}

	/**
	 * Generate {amountToRequest} highly relevant replacements
	 */
	private async generateRelevantCandidates(
		amountToRequest: number,
		retryConfig?: {
			alreadyRejected?: Array<{ alternative: Pick<Candidate, "name">; reasons: string[] }>;
			alreadyExisting?: Candidate[];
		},
	): Promise<Candidate[]> {
		const chain = structuredPrompt(
			`
You are an expert financial advisor assistant. Your primary goal is to help the user find compelling, cheaper alternatives to their spending habits, while not trading off on value propositions like convenience or happiness.

${spendingHabitContextSnippet}

Please suggest {amountToRequest} replacement spending habits.

{alreadyRejectedContext}

{preventDupesContext}
`,
			z
				.object({
					alternatives: z
						.array(
							AlternativeSchema.describe(
								"an alternative service that is highly similar to the user's spending habit ({spendingHabitName})",
							),
						)
						.length(amountToRequest),
				})
				.describe(
					`${amountToRequest} alternative services that are highly similar to the user's spending habit ({spendingHabitName})`,
				),
			gpt4oMini,
		);

		const alreadyRejectedContext = alreadyRejectedContextSnippet(retryConfig?.alreadyRejected ?? []);
		const preventDupesContext = preventDupesContextSnippet(retryConfig?.alreadyExisting?.map(({ name }) => name) ?? []);

		const { alternatives } = await chain.invoke({
			valueProposition: this.props.valueProposition,
			spendingHabitCost: this.props.spendingHabit.amount,
			spendingHabitName: this.props.spendingHabit.name,
			spendingHabitRecurrence: this.props.spendingHabit.freq,
			amountToRequest,
			alreadyRejectedContext,
			preventDupesContext,
		});

		const passing = [];
		const notPassing = [];
		for (const alternative of alternatives) {
			const { reasons } = await this.checkCandidate(alternative);

			if (reasons.length) {
				notPassing.push({ alternative, reasons });
			} else {
				passing.push(alternative);
			}
		}

		const results = passing.map((alternative) => ({
			...alternative,
			cost: 0,
			convenience: 0,
			experience: 0,
			healthImpact: 0,
			similarityScore: 0,
			computedUtility: 0,
		}));

		const amountNeedingRetry = amountToRequest - passing.length;

		/**
		 * Regen failed candidates
		 *
		 * Kinda morbid if you think about it
		 */
		if (amountNeedingRetry > 0) {
			return [
				...results,
				...(await this.generateRelevantCandidates(amountNeedingRetry, {
					alreadyRejected: notPassing,
					alreadyExisting: results,
				})),
			];
		}

		return results;
	}

	/**
	 * Generate {amountToRequest} diverse/unexpected replacements
	 */
	private async generateDiverseCandidates(
		amountToRequest: number,
		retryConfig?: {
			alreadyRejected?: Array<{ alternative: Pick<Candidate, "name">; reasons: string[] }>;
			alreadyExisting?: Candidate[];
		},
	): Promise<Candidate[]> {
		const chain = structuredPrompt(
			`
You are a creative helpful financial advisor assistant. Your primary goal is to help the user find compelling, cheaper alternatives to their spending habits they would have not come up with themself, while not trading off on value propositions like convenience or happiness. Try to think outside of the box to save money while still meeting the value proposition.

${spendingHabitContextSnippet}

Please suggest {amountToRequest} unconventional or contrasting replacement spending habits.

{alreadyRejectedContext}

{preventDupesContext}
`,
			z
				.object({
					alternatives: z
						.array(
							AlternativeSchema.describe(
								"an unconventional or contrasting replacement spending habit to the user's spending habit ({spendingHabitName})",
							),
						)
						.length(amountToRequest),
				})
				.describe(
					`${amountToRequest} unconventional or contrasting replacement spending habits to the user's spending habit ({spendingHabitName})`,
				),
			gpt4oMini,
		);

		const alreadyRejectedContext = alreadyRejectedContextSnippet(retryConfig?.alreadyRejected ?? []);
		const preventDupesContext = preventDupesContextSnippet(retryConfig?.alreadyExisting?.map(({ name }) => name) ?? []);

		const { alternatives } = await chain.invoke({
			valueProposition: this.props.valueProposition,
			spendingHabitCost: this.props.spendingHabit.amount,
			spendingHabitName: this.props.spendingHabit.name,
			spendingHabitRecurrence: this.props.spendingHabit.freq,
			amountToRequest,
			alreadyRejectedContext,
			preventDupesContext,
		});

		const passing = [];
		const notPassing = [];
		for (const alternative of alternatives) {
			const { reasons } = await this.checkCandidate(alternative);

			if (reasons.length) {
				notPassing.push({ alternative, reasons });
			} else {
				passing.push(alternative);
			}
		}

		const results = passing.map((alternative) => ({
			...alternative,
			cost: 0,
			convenience: 0,
			experience: 0,
			healthImpact: 0,
			similarityScore: 0,
			computedUtility: 0,
		}));

		const amountNeedingRetry = amountToRequest - passing.length;

		/**
		 * Regen failed candidates
		 *
		 * Kinda morbid if you think about it
		 */
		if (amountNeedingRetry > 0) {
			return [
				...results,
				...(await this.generateDiverseCandidates(amountNeedingRetry, {
					alreadyRejected: notPassing,
					alreadyExisting: results,
				})),
			];
		}

		return results;
	}

	/**
	 * Feed output of one candidate generator into the next to prevent duplicate results
	 */
	async generatePool() {
		// 60 : 40 split
		const relevantToGenerate = Math.round(this.props.poolToChooseFromSize * 0.6);
		const diverseToGenerate = Math.round(this.props.poolToChooseFromSize * 0.4);

		const relevantCandidates = await this.generateRelevantCandidates(relevantToGenerate);

		const diverseCandidates = await this.generateDiverseCandidates(diverseToGenerate, {
			alreadyExisting: relevantCandidates,
		});

		this.pool = [...relevantCandidates, ...diverseCandidates];
	}

	/**
	 * Deterministically compute cost, estimate the other attributes via LLM
	 */
	async tagAndScorePool() {
		const originalCost = Number(this.props.spendingHabit.amount.slice(1)); // slice removes leading $

		// todo: all in one prompt!
		for (const candidate of this.pool) {
			// Normalize cost: equal = 0.5; more expensive < 0.5; cheaper > 0.5 up to 1.0
			const ratio = candidate.price > 0 ? originalCost / candidate.price : 0;
			candidate.cost =
				Math.abs(ratio - 1) < 1e-6 ? 0.5 : ratio < 1 ? ratio * 0.5 : 0.5 + (Math.min(ratio, 2) - 1) * 0.5;

			// Similarity score
			const simChain = structuredPrompt(
				`
${spendingHabitContextSnippet}
                
On a scale from 0 to 1, how similar is replacement spending habit "{candidate}" to the user's spending habit"?`,
				z
					.object({ similarity: ZeroToOneInclusiveSchema })
					.describe(
						"0-1 similarity of replacement spending habit ({candidate}) to the user's spending habit ({spendingHabitName})",
					),
				gpt4oMini,
			);
			const { similarity } = await simChain.invoke({
				candidate: candidate.name,
				valueProposition: this.props.valueProposition,
				spendingHabitCost: this.props.spendingHabit.amount,
				spendingHabitName: this.props.spendingHabit.name,
				spendingHabitRecurrence: this.props.spendingHabit.freq,
			});

			candidate.similarityScore = similarity;

			// Estimate remaining attributes via LLM
			const attrChain = structuredPrompt(
				`
Estimate on a scale from 0 to 1 these attributes for "{candidate}": convenience, experience, healthImpact.
`,
				z.object({
					convenience: ZeroToOneInclusiveSchema,
					experience: ZeroToOneInclusiveSchema,
					healthImpact: ZeroToOneInclusiveSchema,
				}),
				gpt4oMini,
			);
			const { convenience, experience, healthImpact } = await attrChain.invoke({ candidate: candidate.name });

			candidate.convenience = convenience;
			candidate.experience = experience;
			candidate.healthImpact = healthImpact;

			// Compute utility: weighted sum
			candidate.computedUtility =
				candidate.cost * this.weights.cost +
				candidate.convenience * this.weights.convenience +
				candidate.experience * this.weights.experience +
				candidate.healthImpact * this.weights.healthImpact;
		}
	}

	/**
	 * Re-rank by MMR for diversity.
	 * Assign each candidate to a bucket.
	 */
	async applyDiversityToPool() {
		const idealEmbedding = [
			this.weights.cost,
			this.weights.convenience,
			this.weights.experience,
			this.weights.healthImpact,
		];

		const embeddings = this.pool.map((c) => [c.cost, c.convenience, c.experience, c.healthImpact]);
		const idxs = maximalMarginalRelevance(
			idealEmbedding, // e.g. same 4-D vector of the “ideal” candidate profile
			embeddings,
			this.props.diversityVsRelevanceTradeoffZeroToOne,
			this.pool.length,
		);
		const list = idxs.map((i) => this.pool[i]);

		// Now assign each candidate to its bucket based on similarityScore
		list.forEach((c) => {
			const idx = this.bucketConfigs.findIndex(
				(b) => c.similarityScore >= b.minSimilarity && c.similarityScore <= b.maxSimilarity,
			);
			c.bucketIndex = idx >= 0 ? idx : this.bucketConfigs.length - 1;
		});

		this.pool = list;
	}

	/**
	 * For each bucket, sample up to {this.props.resultSize} items by utility-weighted random.
	 * If we still have fewer than {this.props.resultSize}, backfill by sampling remaining items with weight = computedUtility + similarityScore.
	 */
	async selectFinalPool() {
		const finalList: Candidate[] = [];

		// Per-bucket weighted sampling
		this.bucketConfigs.forEach((b, i) => {
			const bucketItems = this.pool.filter((c) => c.bucketIndex === i);

			if (bucketItems.length <= b.targetCount) {
				finalList.push(...bucketItems);
			} else {
				// Build WeightedItems<Candidate>
				const weightedItems = bucketItems.map((c) => ({
					weight: c.computedUtility,
					reward: c,
				}));
				const sampler = createWeightedSampler(weightedItems);

				for (let j = 0; j < b.targetCount; j++) {
					finalList.push(sampler());
				}
			}
		});

		// Backfill up to 5 if needed
		if (finalList.length < this.props.resultSize) {
			const needed = this.props.resultSize - finalList.length;
			const remaining = _.difference(this.pool, finalList);

			if (remaining.length) {
				const weightedItems = remaining.map((c) => ({
					weight: c.computedUtility + c.similarityScore,
					reward: c,
				}));
				const sampler = createWeightedSampler(weightedItems);

				for (let j = 0; j < needed; j++) {
					finalList.push(sampler());
				}
			}
		}

		this.pool = finalList.slice(0, this.props.resultSize);
	}
}
