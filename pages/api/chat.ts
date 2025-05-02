import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const { messages } = req.body as { messages: { role: string; content: string }[] };

		const completion = await openai.chat.completions.create({
			model: "gpt-4o-mini",
			// temperature: 0.7,
			// @ts-ignore
			messages,
			functions: [
				{
					name: "extractAlternatives",
					description:
						"Return a concise summary and exactly five diverse, cheaper alternatives with metadata, normalized to the input frequency",
					parameters: {
						type: "object",
						properties: {
							summary: { type: "string" },
							alternatives: {
								type: "array",
								items: {
									type: "object",
									properties: {
										id: { type: "string" },
										name: { type: "string" },
										price: { type: "number" },
										frequency: { type: "string" },
										percentageSavings: { type: "number" },
										annualSavings: { type: "number" },
										pros: { type: "array", items: { type: "string" } },
										cons: { type: "array", items: { type: "string" } },
									},
									required: ["id", "name", "price", "frequency", "percentageSavings", "annualSavings", "pros", "cons"],
								},
							},
						},
						required: ["summary", "alternatives"],
					},
				},
			],
			function_call: "auto",
		});

		return res.status(200).json(completion.choices[0].message);
	} catch (error: any) {
		console.error(error);
		return res.status(500).json({ error: error.message });
	}
}
