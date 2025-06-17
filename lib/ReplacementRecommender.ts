import { ChatOpenAI } from "@langchain/openai";
import { structuredPrompt } from "./ai";
import { z } from "zod";

// todo use structured prompt helper and type safety and test

const gpt4oMini = new ChatOpenAI({
	modelName: "gpt-4o-mini",
	temperature: 0.7,
	timeout: 30_000, // 30s
	maxRetries: 2,
});

const zeroToOneInclusive = z
	.number()
	.min(0, { message: "Must be at least 0" })
	.max(1, { message: "Must be at most 1" })
	.describe("<0-1>");

const yesOrNo = z.literal("yes").or(z.literal("no")).describe("yes/no");

/**
 * Interface definitions for attribute weights and candidates
 */
interface AttributeWeights {
	cost: number;
	convenience: number;
	experience: number;
	healthImpact: number;
}

interface Candidate {
	name: string;
	cost: number; // normalized cost attribute (0–1)
	convenience: number;
	experience: number;
	healthImpact: number;
	similarityScore: number;
	computedUtility: number;
	bucketIndex?: number;
}

interface BucketConfig {
	minSimilarity: number;
	maxSimilarity: number;
	targetCount: number;
}

/**
 * Replacement recommendation orchestrator
 */
export class ReplacementRecommender {
	private weights: AttributeWeights;
	private bucketConfigs: BucketConfig[];

	constructor() {
		// Default uniform weights until overridden by user
		this.weights = { cost: 0.25, convenience: 0.25, experience: 0.25, healthImpact: 0.25 };
		this.bucketConfigs = [
			{ minSimilarity: 0.75, maxSimilarity: 1.0, targetCount: 3 },
			{ minSimilarity: 0.45, maxSimilarity: 0.74, targetCount: 1 },
			{ minSimilarity: 0.0, maxSimilarity: 0.44, targetCount: 1 },
		];
	}

	/**
	 * Derive attribute weights from the user's value proposition description
	 */
	async deriveWeights(valueProposition: string): Promise<void> {
		const chain = structuredPrompt(
			`
You are an expert at deriving value proposition. Given this user submitted value proposition:
"{valueProposition}", assign weights to these attributes so they sum to 1: cost, convenience, experience, healthImpact.
`,
			z
				.object({
					cost: zeroToOneInclusive,
					convenience: zeroToOneInclusive,
					experience: zeroToOneInclusive,
					healthImpact: zeroToOneInclusive,
				})
				.refine(
					({ cost, convenience, experience, healthImpact }) =>
						Math.abs(cost + convenience + experience + healthImpact - 1) < 1e-6,
					{ message: "Weights must sum to 1 (within a tiny tolerance)" },
				)
				.describe("derived attribute weights"),
			gpt4oMini,
		);

		this.weights = await chain.invoke({ valueProposition });
	}

	/**
	 * Check candidate tradeoffs and similarity, returning pass/fail & reasons
	 */
	async checkCandidate(
		valueProposition: string,
		original: string,
		candidate: Pick<Candidate, "name">,
	): Promise<{ reasons: string[] }> {
		const reasons: string[] = [];

		const tradeOffChain = structuredPrompt(
			`Given spending habit "{original}" with value proposition "{valueProposition}", does replacement spending habit "{candidate}" have minimal trade-offs?`,
			z.object({ isMinimalTradeoffs: yesOrNo }).describe("are trade-offs minimal?"),
			gpt4oMini,
		);

		const { isMinimalTradeoffs } = await tradeOffChain.invoke({
			valueProposition,
			original,
			candidate: candidate.name,
		});

		if (isMinimalTradeoffs !== "yes") reasons.push("trade-offs not minimal");

		const sameChain = structuredPrompt(
			`Is spending habit "{candidate}" basically the same as spending habit "{original}"?`,
			z
				.object({ isSame: yesOrNo })
				.describe("is the candidate ({candidate}) basically the same as the original ({original})"),
			gpt4oMini,
		);
		const { isSame } = await sameChain.invoke({ original, candidate: candidate.name });

		if (isSame === "yes") reasons.push("too similar to original");

		return { reasons };
	}

	/**
	 * STEP 2A: Generate 3 highly relevant replacements
	 */
	private async generateRelevantCandidates(
		valueProposition: string,
		original: string,
		amountToRequest = 3,
		retryConfig?: { additionalContext: string },
	): Promise<Candidate[]> {
		if (retryConfig?.additionalContext) {
			console.log({ additionalContext: retryConfig.additionalContext });
		}

		const chain = structuredPrompt(
			`
You are an expert advisor.  Given the service "{original}", value proposition "{valueProposition}", {additionalContext} list {amountToRequest} alternative services that are highly similar.
`,
			z
				.object({
					alternatives: z
						.array(
							z
								.object({ name: z.string() })
								.describe("an alternative service that is highly similar to the original ({original})"),
						)
						.length(amountToRequest),
				})
				.describe(`${amountToRequest} alternative services that are highly similar to the original ({original})`),
			gpt4oMini,
		);

		const { alternatives } = await chain.invoke({
			valueProposition,
			original,
			amountToRequest,
			additionalContext: retryConfig?.additionalContext ? retryConfig.additionalContext + "." : "",
		});

		const passing = [];
		const notPassing = [];
		for (const alternative of alternatives) {
			const { reasons } = await this.checkCandidate(valueProposition, original, alternative);

			if (reasons.length) {
				notPassing.push({ alternative, reasons });
			} else {
				passing.push(alternative);
			}
		}

		const results = passing.map(({ name }) => ({
			name,
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
			const additionalContext = notPassing
				.map(({ alternative, reasons }) => `and knowing that "${alternative.name}" was rejected because: ${reasons}`)
				.join();

			return [
				...results,
				...(await this.generateRelevantCandidates(valueProposition, original, amountNeedingRetry, {
					additionalContext,
				})),
			];
		}

		return results;
	}

	/**
	 * STEP 2B: Generate 2 diverse/unexpected replacements
	 */
	private async generateDiverseCandidates(
		valueProposition: string,
		original: string,
		amountToRequest = 2,
		retryConfig?: { additionalContext: string },
	): Promise<Candidate[]> {
		if (retryConfig?.additionalContext) {
			console.log({ additionalContext: retryConfig.additionalContext });
		}

		const chain = structuredPrompt(
			`
You are a creativity engine. Given the service "{original}", value proposition "{valueProposition}", {additionalContext} suggest {amountToRequest} unconventional or contrasting replacement ideas.
`,
			z
				.object({
					alternatives: z
						.array(
							z
								.object({ name: z.string() })
								.describe("an unconventional or contrasting replacement idea to the original ({original})"),
						)
						.length(amountToRequest),
				})
				.describe(`${amountToRequest} unconventional or contrasting replacement ideas to the original ({original})`),
			gpt4oMini,
		);

		const { alternatives } = await chain.invoke({
			valueProposition,
			original,
			amountToRequest,
			additionalContext: retryConfig?.additionalContext ? retryConfig.additionalContext + "." : "",
		});

		const passing = [];
		const notPassing = [];
		for (const alternative of alternatives) {
			const { reasons } = await this.checkCandidate(valueProposition, original, alternative);

			if (reasons.length) {
				notPassing.push({ alternative, reasons });
			} else {
				passing.push(alternative);
			}
		}

		const results = passing.map(({ name }) => ({
			name,
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
			const additionalContext = notPassing
				.map(({ alternative, reasons }) => `and knowing that "${alternative.name}" was rejected because: ${reasons}`)
				.join();

			return [
				...results,
				...(await this.generateRelevantCandidates(valueProposition, original, amountNeedingRetry, {
					additionalContext,
				})),
			];
		}

		return results;
	}

	/**
	 * Orchestrate both candidate generators in parallel
	 */
	async generateCandidates(valueProposition: string, original: string): Promise<Candidate[]> {
		const [relevant, diverse] = await Promise.all([
			this.generateRelevantCandidates(valueProposition, original),
			this.generateDiverseCandidates(valueProposition, original),
		]);
		return [...relevant, ...diverse];
	}

	/**
	 * STEP 3: Estimate attributes via LLM, but deterministically compute cost via lookup
	 */
	async tagAndScoreCandidates(original: string, candidates: Candidate[]): Promise<Candidate[]> {
		// 1) Lookup original cost if needed
		const costChain = structuredPrompt(
			`What is the average per-use cost in USD of using "{service}"? Respond with a number.`,
			z.object({ cost: z.number() }).describe("the average per-use cost in USD of using the service ({service})"),
			gpt4oMini,
		);
		const { cost: originalCost } = await costChain.invoke({ service: original });

		for (const candidate of candidates) {
			// 2) Lookup candidate cost
			const { cost: candidateCost } = await costChain.invoke({ service: candidate.name });

			// 3) Normalize cost: equal = 0.5; more expensive < 0.5; cheaper > 0.5 up to 1.0
			const ratio = candidateCost > 0 ? originalCost / candidateCost : 0;
			let costScore: number;
			if (Math.abs(ratio - 1) < 1e-6) {
				costScore = 0.5;
			} else if (ratio < 1) {
				// Candidate is more expensive: map ratio [0,1) to [0,0.5)
				costScore = ratio * 0.5;
			} else {
				// Candidate is cheaper: map ratio (1,2] to (0.5,1], cap at ratio=2
				const capped = Math.min(ratio, 2);
				costScore = 0.5 + (capped - 1) * 0.5;
			}
			candidate.cost = costScore;

			// 4) Similarity score
			const simChain = structuredPrompt(
				`On a scale from 0 to 1, how similar is "{candidate}" to "{original}"?`,
				z
					.object({ similarity: zeroToOneInclusive })
					.describe("0-1 similarity of candidate ({candidate}) to original ({original})"),
				gpt4oMini,
			);
			const { similarity } = await simChain.invoke({ candidate: candidate.name, original });

			candidate.similarityScore = similarity;

			// 5) Estimate remaining attributes via LLM
			const attrChain = structuredPrompt(
				`
Estimate on a scale from 0 to 1 these attributes for "{candidate}": convenience, experience, healthImpact.
`,
				z.object({ convenience: zeroToOneInclusive, experience: zeroToOneInclusive, healthImpact: zeroToOneInclusive }),
				gpt4oMini,
			);
			const attrs = await attrChain.invoke({ candidate: candidate.name });

			candidate.convenience = attrs.convenience ?? 0;
			candidate.experience = attrs.experience ?? 0;
			candidate.healthImpact = attrs.healthImpact ?? 0;

			// 6) Compute utility: weighted sum
			candidate.computedUtility =
				candidate.cost * this.weights.cost +
				candidate.convenience * this.weights.convenience +
				candidate.experience * this.weights.experience +
				candidate.healthImpact * this.weights.healthImpact;
		}
		return candidates;
	}

	/**
	 * STEP 4: Assign candidates into similarity buckets
	 */
	async applyDiversity(candidates: Candidate[]): Promise<Candidate[]> {
		for (const c of candidates) {
			const idx = this.bucketConfigs.findIndex(
				(b) => c.similarityScore >= b.minSimilarity && c.similarityScore <= b.maxSimilarity,
			);
			c.bucketIndex = idx >= 0 ? idx : this.bucketConfigs.length - 1;
		}
		return candidates;
	}

	/**
	 * STEP 5: Select final 5 balancing utility & bucket targets
	 */
	async selectFinal(candidates: Candidate[]): Promise<Candidate[]> {
		const finalList: Candidate[] = [];
		this.bucketConfigs.forEach((b, i) => {
			const bucketItems = candidates
				.filter((c) => c.bucketIndex === i)
				.sort((a, b) => b.computedUtility - a.computedUtility);
			finalList.push(...bucketItems.slice(0, b.targetCount));
		});
		if (finalList.length < 5) {
			const remaining = candidates
				.filter((c) => !finalList.includes(c))
				.sort((a, b) => b.computedUtility + b.similarityScore - (a.computedUtility + a.similarityScore));
			finalList.push(...remaining.slice(0, 5 - finalList.length));
		}
		return finalList.slice(0, 5);
	}

	/**
	 * STEP 6: Validation stub
	 */
	async validate(candidates: Candidate[]): Promise<Candidate[]> {
		// TODO: add business-rule filters (budget, allergens) or human review
		return candidates;
	}

	/**
	 * Full pipeline: derive weights, generate, score, diversify, select, validate
	 */
	async recommendReplacements(original: string, valueProposition: string): Promise<Candidate[]> {
		await this.deriveWeights(valueProposition);
		let pool = await this.generateCandidates(valueProposition, original);
		pool = await this.tagAndScoreCandidates(original, pool);
		pool = await this.applyDiversity(pool);
		pool = await this.selectFinal(pool);
		pool = await this.validate(pool);
		return pool;
	}
}

// Example usage (stubbed):
// const rec = new ReplacementRecommender(process.env.OPENAI_API_KEY!);
// rec.recommendReplacements("DoorDash", "I want affordable, quick options that support healthy eating").then(console.log);
