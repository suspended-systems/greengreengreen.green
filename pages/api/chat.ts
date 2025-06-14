import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { ChatOpenAI } from "@langchain/openai";
import { prompt } from "@/lib/ai";

const gpt4oMini = new ChatOpenAI({
	modelName: "gpt-4o-mini",
	temperature: 0.7,
});

const AlternativeSchema = z.object({
	id: z.string(),
	name: z.string(),
	price: z.number(),
	frequency: z.string(),
	percentageSavings: z.number(),
	annualSavings: z.number(),
	pros: z.array(z.string()),
	cons: z.array(z.string()),
});

const chain = prompt(
	`
You are a helpful financial advisor assistant. Your primary goal is to help the user find compelling, cheaper alternatives to their spending habits while not trading off on value propositions like convenience or happiness.

The user has a spending habit:
- name: {spendingHabitName}
- cost: {spendingHabitCost}
- recurrence: {spendingHabitRecurrence}

The user has also described what value proposition the spending habit has for them:

{valueProposition}

Return a concise summary and exactly five diverse, cheaper alternatives.
The cheaper alternatives must be...
- normalized to the same recurrence as the spending habit (i.e. {spendingHabitRecurrence})
- meet as much of the existing described value proposition as possible, as little tradeoffs as possible
- a replacement that is not basically the same thing as the existing spending habit
`,
	z
		.object({
			summary: z.string(),
			alternatives: z.array(AlternativeSchema).length(5),
		})
		.describe("Summary plus exactly five cheaper alternatives"),
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

		const { summary, alternatives } = await chain.invoke({
			spendingHabitCost: spendingHabit.amount,
			spendingHabitName: spendingHabit.name,
			spendingHabitRecurrence: spendingHabit.freq,
			valueProposition: userMessageLog,
		});

		return res.json({ summary, alternatives });
	} catch (error: any) {
		console.error(error);
		return res.status(500).json({ error: error.message });
	}
}
