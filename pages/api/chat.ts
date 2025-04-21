import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";

const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const { messages } = req.body as {
			messages: { role: "system" | "assistant" | "user"; content: string }[];
		};

		const completion = await openai.chat.completions.create({
			model: "gpt-4o-mini", // or 'gpt-4' / 'gpt-3.5-turbo'
			messages,
			functions: [
				{
					name: "extractAlternatives",
					description: "Extract a list of alternative options for the user",
					parameters: {
						type: "object",
						properties: {
							alternatives: {
								type: "array",
								items: {
									type: "object",
									properties: {
										id: { type: "string" },
										name: { type: "string" },
										description: { type: "string" },
									},
									required: ["id", "name", "description"],
								},
							},
						},
						required: ["alternatives"],
					},
				},
			],
			function_call: "auto",
		});

		const msg = completion.choices[0].message;
		return res.status(200).json(msg);
	} catch (e: any) {
		console.error(e);
		return res.status(500).json({ error: e.message });
	}
}
