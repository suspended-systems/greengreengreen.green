import type { NextApiRequest, NextApiResponse, PageConfig } from "next";
import { ReplacementRecommender } from "@/lib/ReplacementRecommender";

export const config: PageConfig = {
	maxDuration: 60, // timeout seconds
};

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

		const alternatives = await new ReplacementRecommender({
			resultSize: 5,
			poolToChooseFromSize: 100,
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
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error: (error as Error).message });
	}
}
