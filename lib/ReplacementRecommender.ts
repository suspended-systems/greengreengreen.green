import { z } from "zod";
import _ from "lodash";
import { maximalMarginalRelevance } from "@langchain/core/utils/math";

import { gpt4oMini, structuredPrompt } from "./ai";

type Candidate = z.infer<typeof AlternativeSchema> & Partial<CandidateWeights>;

type CandidateWeights = {
	//  - equal = 0.5
	//  - more expensive < 0.5
	//  - cheaper > 0.5 up to 1.0
	cost: number;

	convenience: number;
	experience: number;
	healthImpact: number;
};

const ZeroToOneInclusiveSchema = z
	.number()
	.min(0, { message: "Must be at least 0" })
	.max(1, { message: "Must be at most 1" })
	.describe("<0-1>");

export const AlternativeSchema = z.object({
	name: z.string().describe("a brief noun phrase (e.g. “Drive‑thru pickup”, “Meal kit”, “Grocery delivery kit”)"),
	price: z
		.number()
		.describe(
			"at least 40% cheaper than the existing spending habit price (i.e. {spendingHabitCost}). Ideally upwards of 80% off",
		),
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
	rejectedCandidates?: Array<{ alternative: Pick<Candidate, "name">; reasons: string[] }>,
) =>
	!rejectedCandidates
		? ""
		: `
The following replacement spending habits were already previously rejected, please do not suggest them and please also factor this in to what you come up to help prevent it from also getting rejected:
${rejectedCandidates
	.map(({ alternative, reasons }) => `\n- "${alternative.name}" was rejected because: ${reasons.join(" and ")}`)
	.join("")}`;

const preventDupesContextSnippet = (names?: string[]) =>
	!names
		? ""
		: `
The following replacement spending habits were already recommended, please do not suggest them as they would be considered duplicate:
${names.map((name) => `\n- "${name}"`)}
`;

const deriveWeightsChain = structuredPrompt(
	`
You are an expert at deriving value proposition.

${spendingHabitContextSnippet}

Assign weights to these attributes so they sum to 1: convenience, experience, healthImpact.
`,
	z
		.object({
			convenience: ZeroToOneInclusiveSchema,
			experience: ZeroToOneInclusiveSchema,
			healthImpact: ZeroToOneInclusiveSchema,
		})
		.refine(
			({ convenience, experience, healthImpact }) => Math.abs(convenience + experience + healthImpact - 1) < 1e-6,
			{ message: "Weights must sum to 1 (within a tiny tolerance)" },
		)
		.describe("derived attribute weights"),
	gpt4oMini,
);

const equivalenceChain = (count: number) =>
	structuredPrompt(
		`
### SYSTEM
You are a personal-finance coach checking whether candidate replacement consumer spending habits
are *functionally equivalent* (see definition below) to the original habit.

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
Candidates="{CANDIDATES_JSON}"
`,

		z.object({
			candidates: z
				.array(
					z.object({
						equivalent: z.boolean().describe("true ↔ functionally equivalent"),
						similarity_score: z.number().min(0).max(1).describe("0.0-1.0, higher = more similar"),
						reason: z.string().max(60).describe("≤ 40 words"),
					}),
				)
				.length(count)
				.describe("the judged candidate replacements in the same order they were sent"),
		}),

		gpt4oMini,
	);

const tradeoffsChain = (count: number) =>
	structuredPrompt(
		`
### SYSTEM
You are a personal-finance coach who rates replacement spending habits for
*trade-offs* vs an original habit.

DEFINITION OF “MINIMAL TRADE-OFFS” (see four rules below):
1. Preserve or improve every *key attribute* of the user’s value proposition.
2. Do not appreciably worsen hygiene factors (convenience, availability,
reliability, safety).

### EXAMPLES
User:
Original="DoorDash", Candidate="Home-cooked meal prep",
ValueProposition="I value convenience and good taste but want to lower cost and
eat a bit healthier."
Assistant:
{{"minimal_net_tradeoffs": false,
"score": 0.42,
"reason": "Cheaper and healthier but loses too much convenience and some taste."}}

User:
Original="Starbucks daily latte", Candidate="Nespresso at home",
ValueProposition="Fast caffeine hit, good taste, needs to be affordable."
Assistant:
{{"minimal_net_tradeoffs": true,
"score": 0.81,
"reason": "Slightly less convenient but cheaper, same taste, reliable at home."}}

### TASK
Original="{ORIGINAL}"
Candidates="{CANDIDATES_JSON}"
UserValueProposition="{VALUE_PROP}"
AttributeWeights={WEIGHTS_JSON}`,

		z.object({
			candidates: z
				.array(
					z.object({
						minimal_net_tradeoffs: z.boolean().describe("true ↔ minimal trade-offs"),
						score: z.number().min(0).max(1).describe("0-1 where 1 = perfect, 0 = unacceptable"),
						reason: z.string().max(80).describe("≤ 60 words"),
					}),
				)
				.length(count)
				.describe("the judged candidate replacements in the same order they were sent"),
		}),
		gpt4oMini,
	);

const generateRelevantCandidatesChain = (amountToRequest: number) =>
	structuredPrompt(
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

const generateDiverseCandidatesChain = (amountToRequest: number) =>
	structuredPrompt(
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

const convenienceScoresChain = (count: number) =>
	structuredPrompt(
		`
${spendingHabitContextSnippet}

And given this this JSON list of candidate replacement spending habits:
{jsonCandidatesList}

Estimate convenience on a scale from 0 to 1 for each replacement spending habit.
`,
		z.object({
			candidateScores: z
				.array(ZeroToOneInclusiveSchema)
				.length(count)
				.describe("the judged candidate replacements in the same order they were sent"),
		}),
		gpt4oMini,
	);

const experienceScoresChain = (count: number) =>
	structuredPrompt(
		`
${spendingHabitContextSnippet}

And given this this JSON list of candidate replacement spending habits:
{jsonCandidatesList}

Estimate experience on a scale from 0 to 1 for each replacement spending habit.
`,
		z.object({
			candidateScores: z
				.array(ZeroToOneInclusiveSchema)
				.length(count)
				.describe("the judged candidate replacements in the same order they were sent"),
		}),
		gpt4oMini,
	);

const healthScoresChain = (count: number) =>
	structuredPrompt(
		`
${spendingHabitContextSnippet}

And given this this JSON list of candidate replacement spending habits:
{jsonCandidatesList}

Estimate health impact on a scale from 0 to 1 for each replacement spending habit.
`,
		z.object({
			candidateScores: z
				.array(ZeroToOneInclusiveSchema)
				.length(count)
				.describe("the judged candidate replacements in the same order they were sent"),
		}),
		gpt4oMini,
	);

const PLACEHOLDER_WEIGHTS = { convenience: 0.33, experience: 0.33, healthImpact: 0.33 };

/**
 * Replacement recommendation orchestrator
 *
 * Call with `run`
 */
export class ReplacementRecommender {
	private pool: Array<Candidate> = [];
	private weights = PLACEHOLDER_WEIGHTS; // gets overridden by derived weights
	private bucketConfigs = [
		{ minCost: 0.75, maxCost: 0.84, targetPercentageDecimal: 0.6 },
		{ minCost: 0.85, maxCost: 0.924, targetPercentageDecimal: 0.2 },
		{ minCost: 0.925, maxCost: 1.0, targetPercentageDecimal: 0.2 },
		// `cost` weight legend:
		//  - equal = 0.5
		//  - more expensive < 0.5
		//  - cheaper > 0.5 up to 1.0
	];

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

	private spendingHabitsContext = {
		valueProposition: this.props.valueProposition,
		spendingHabitCost: this.props.spendingHabit.amount,
		spendingHabitName: this.props.spendingHabit.name,
		spendingHabitRecurrence: this.props.spendingHabit.freq,
	};

	/**
	 * Full pipeline
	 */
	async run(): Promise<Array<Candidate>> {
		await this.deriveWeights();
		await this.generatePool();
		await this.scorePool();
		this.bucketAndSelectTopMMR();

		return this.pool;
	}

	/**
	 * Derive attribute weights from the user's value proposition description
	 */
	async deriveWeights() {
		this.weights = await deriveWeightsChain.invoke(this.spendingHabitsContext);
	}

	/**
	 * Check candidate tradeoffs and similarity, returning pass/fail & reasons
	 */
	async verifyAlternativesMeetCriteria(candidates: Array<Candidate>) {
		const [{ candidates: equivalenceCandidates }, { candidates: tradeoffsCandidates }] = await Promise.all([
			equivalenceChain(candidates.length).invoke({
				ORIGINAL: this.props.spendingHabit.name,
				CANDIDATES_JSON: JSON.stringify(candidates),
			}),
			tradeoffsChain(candidates.length).invoke({
				ORIGINAL: this.props.spendingHabit.name,
				CANDIDATES_JSON: JSON.stringify(candidates),
				VALUE_PROP: this.props.valueProposition,
				WEIGHTS_JSON: JSON.stringify(this.weights),
			}),
		]);

		const passing: Array<Candidate> = [];
		const failing: Array<{ alternative: Candidate; reasons: string[] }> = [];

		for (const [i, candidate] of candidates.entries()) {
			const { equivalent, similarity_score, reason: equivalenceReason } = equivalenceCandidates[i];
			const { minimal_net_tradeoffs, score, reason: tradeoffsReason } = tradeoffsCandidates[i];

			const spendingHabitPrice = Number(this.props.spendingHabit.amount.slice(1)); // slice removes leading $
			const percentageSavings = Math.round(((spendingHabitPrice - candidate.price) / spendingHabitPrice) * 100);

			const reasons: string[] = [];

			/**
			 * If the savings is negligible then make sure it's not basically the same thing
			 */
			if (
				percentageSavings <= 25 &&
				equivalent &&
				similarity_score > this.props.basicEquivalenceSimilarityScoreThresholdZeroToOne
			) {
				reasons.push(`Basically equivalent to user's spending habit: ${equivalenceReason}`);
			}

			if (!minimal_net_tradeoffs && score < this.props.tooManyTradeoffsScoreThresholdZeroToOne) {
				reasons.push(`Too many tradeoffs to user's spending habit: ${tradeoffsReason}`);
			}

			if (reasons.length) {
				failing.push({ alternative: candidate, reasons });
			} else {
				passing.push(candidate);
			}
		}

		return { failing, passing };
	}

	/**
	 * Generate {amountToRequest} highly relevant replacements
	 */
	private async generateRelevantCandidates(
		amountToRequest: number,
		retryConfig?: {
			alreadyRejected?: Array<{
				alternative: Pick<Candidate, "name">;
				reasons: string[];
			}>;
			alreadyExisting?: Array<Candidate>;
		},
	): Promise<Array<Candidate>> {
		const alreadyRejectedContext = alreadyRejectedContextSnippet(retryConfig?.alreadyRejected);
		const preventDupesContext = preventDupesContextSnippet(retryConfig?.alreadyExisting?.map(({ name }) => name));

		const { alternatives } = await generateRelevantCandidatesChain(amountToRequest).invoke({
			...this.spendingHabitsContext,
			amountToRequest,
			alreadyRejectedContext,
			preventDupesContext,
		});

		const { passing, failing } = await this.verifyAlternativesMeetCriteria(alternatives);

		/**
		 * Regen failed candidates. Kinda morbid if you think about it
		 */
		const amountNeedingRetry = amountToRequest - passing.length;
		if (amountNeedingRetry > 0) {
			return [
				...passing,
				...(await this.generateRelevantCandidates(amountNeedingRetry, {
					alreadyRejected: [...(retryConfig?.alreadyRejected ?? []), ...failing],
					alreadyExisting: [...(retryConfig?.alreadyExisting ?? []), ...passing],
				})),
			];
		}

		return passing;
	}

	/**
	 * Generate {amountToRequest} diverse/unexpected replacements
	 */
	private async generateDiverseCandidates(
		amountToRequest: number,
		retryConfig?: {
			alreadyRejected?: Array<{ alternative: Pick<Candidate, "name">; reasons: string[] }>;
			alreadyExisting?: Array<Candidate>;
		},
	): Promise<Array<Candidate>> {
		const alreadyRejectedContext = alreadyRejectedContextSnippet(retryConfig?.alreadyRejected);
		const preventDupesContext = preventDupesContextSnippet(retryConfig?.alreadyExisting?.map(({ name }) => name));

		const { alternatives } = await generateDiverseCandidatesChain(amountToRequest).invoke({
			...this.spendingHabitsContext,
			amountToRequest,
			alreadyRejectedContext,
			preventDupesContext,
		});

		const { passing, failing } = await this.verifyAlternativesMeetCriteria(alternatives);

		/**
		 * Regen failed candidates. Kinda morbid if you think about it
		 */
		const amountNeedingRetry = amountToRequest - passing.length;
		if (amountNeedingRetry > 0) {
			return [
				...passing,
				...(await this.generateDiverseCandidates(amountNeedingRetry, {
					alreadyRejected: [...(retryConfig?.alreadyRejected ?? []), ...failing],
					alreadyExisting: [...(retryConfig?.alreadyExisting ?? []), ...passing],
				})),
			];
		}

		return passing;
	}

	/**
	 * Feed output of one candidate generator into the next to prevent duplicate results
	 *
	 * This could be made faster by parallelizing and handling dedupe synchronously at the end of the pipeline
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
	async scorePool() {
		/**
		 * Experimenting with having 3 prompts run in parallel, each processing a different score
		 * 
		 * Seems to work faster but at the cost of more tokens
		 */
		const [
			{ candidateScores: convenienceScores },
			{ candidateScores: experienceScores },
			{ candidateScores: healthImpactScores },
		] = await Promise.all([
			convenienceScoresChain(this.pool.length).invoke({
				...this.spendingHabitsContext,
				jsonCandidatesList: JSON.stringify(this.pool),
			}),
			experienceScoresChain(this.pool.length).invoke({
				...this.spendingHabitsContext,
				jsonCandidatesList: JSON.stringify(this.pool),
			}),
			healthScoresChain(this.pool.length).invoke({
				...this.spendingHabitsContext,
				jsonCandidatesList: JSON.stringify(this.pool),
			}),
		]);

		/**
		 * Assign scores
		 */

		const originalCost = Number(this.props.spendingHabit.amount.slice(1)); // slice removes leading $

		this.pool = this.pool.map((candidate, i) => {
			// Normalize cost:
			//  - equal = 0.5
			//  - more expensive < 0.5
			//  - cheaper > 0.5 up to 1.0
			const ratio = candidate.price > 0 ? originalCost / candidate.price : 0;
			const cost = Math.abs(ratio - 1) < 1e-6 ? 0.5 : ratio < 1 ? ratio * 0.5 : 0.5 + (Math.min(ratio, 2) - 1) * 0.5;

			// grab each weight from the respective list
			const convenience = convenienceScores[i];
			const experience = experienceScores[i];
			const healthImpact = healthImpactScores[i];

			return {
				...candidate,
				cost,
				convenience,
				experience,
				healthImpact,
			};
		});
	}

	bucketAndSelectTopMMR() {
		// Bucket by cost
		const buckets = this.bucketConfigs.map(({ minCost, maxCost, targetPercentageDecimal }) => ({
			targetCount: Math.round(this.props.resultSize * targetPercentageDecimal),
			items: this.pool.filter((c) => c.cost! >= minCost && c.cost! <= maxCost),
		}));

		// Backfill with cheapest options in the remaining pool
		for (const bucket of buckets) {
			if (bucket.items.length < bucket.targetCount) {
				const amountStillNeeded = bucket.targetCount - bucket.items.length;
				const remainingPool = _.differenceWith(
					this.pool,
					buckets.flatMap((b) => b.items),
					_.isEqual,
				);

				bucket.items.push(...remainingPool.sort((a, b) => a.price! - b.price!).slice(amountStillNeeded));
			}
		}

		// Rank items in each bucket by MMR, select {targetCount}, flatten
		this.pool = buckets.flatMap(({ targetCount, items }) => {
			const embeddings = items.map((c) => [c.convenience!, c.experience!, c.healthImpact!]);
			const idealEmbedding = [this.weights.convenience, this.weights.experience, this.weights.healthImpact];

			return maximalMarginalRelevance(
				idealEmbedding,
				embeddings,
				this.props.diversityVsRelevanceTradeoffZeroToOne,
				targetCount,
			).map((i) => items[i]);
		});
	}
}
