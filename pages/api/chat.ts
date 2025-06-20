import type { NextApiRequest, NextApiResponse, PageConfig } from "next";
import { z } from "zod";
import { AlternativeSchema, ReplacementRecommender } from "@/lib/ReplacementRecommender";
import { gpt4oMini, structuredPrompt } from "@/lib/ai";

export const config: PageConfig = {
	maxDuration: 60, // timeout seconds
};

const SummaryAndAlternativesSchema = z
	.object({
		summary: z
			.string()
			.describe(
				"a concise second-person summary (must have it **ending with** one bridge sentence introducing your money‑saving alternatives)",
			),
		alternatives: z
			.array(
				AlternativeSchema.describe(
					"a replacement that is not basically the same thing as the existing spending habi, normalized to the same recurrence as the spending habit (i.e. {spendingHabitRecurrence}), meet as much of the existing described value proposition as possible, as little tradeoffs as possible",
				),
			)
			.length(5).describe(`
exactly five diverse, cheaper alternatives.
The cheaper alternatives must be...
- normalized to the same recurrence as the spending habit (i.e. {spendingHabitRecurrence})
- meet as much of the existing described value proposition as possible, as little tradeoffs as possible
- a replacement that is not basically the same thing as the existing spending habit
`),
	})
	.describe("Summary plus exactly five cheaper alternatives");

const chain = structuredPrompt(
	`
You are a helpful financial advisor assistant. Your primary goal is to help the user find compelling, cheaper alternatives to their spending habits while not trading off on value propositions like convenience or happiness.

The user has a spending habit:
- name: {spendingHabitName}
- cost: {spendingHabitCost}
- recurrence: {spendingHabitRecurrence}

The user has also described what value proposition the spending habit has for them:

{valueProposition}

Return a result containing a summary and alternatives
`,
	SummaryAndAlternativesSchema,
	gpt4oMini,
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const { spendingHabit, messages } = req.body as {
			spendingHabit: { name: string; amount: `$${string}`; freq: string };
			messages: { role: string; content: string }[];
		};

		// Pass in all the user messages as context. Usually this will just be one message, but will be more if the user keeps chatting.
		const userMessageLog = messages
			.filter(({ role }) => role === "user")
			.map((m) => m.content)
			.join("\n");

		if (process.env.USE_EXPERIMENTAL_ENGINE?.toLowerCase() === "true") {
			/**
			 * The experimental engine coordinates many prompts, inherently taking much longer.
			 */

			const alternatives = await new ReplacementRecommender({
				resultSize: 5,
				poolToChooseFromSize: 25,
				diversityVsRelevanceTradeoffZeroToOne: 0.5,
				basicEquivalenceSimilarityScoreThresholdZeroToOne: 0.8,
				tooManyTradeoffsScoreThresholdZeroToOne: 0.5,
				spendingHabit,
				valueProposition: userMessageLog,
			}).run();

			return res.json({
				summary: "",
				// ensure unique ids
				alternatives: alternatives.map((a, i) => ({ ...a, id: i })),
			});
		}

		const { summary, alternatives } = await chain.invoke({
			spendingHabitCost: spendingHabit.amount,
			spendingHabitName: spendingHabit.name,
			spendingHabitRecurrence: spendingHabit.freq,
			valueProposition: userMessageLog,
		});

		return res.json({ summary, alternatives });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error: (error as Error).message });
	}
}
