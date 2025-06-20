import { ChatOpenAI } from "@langchain/openai";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { PromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";

export const gpt4oMini = new ChatOpenAI({
	modelName: "gpt-4o-mini",
	temperature: 0.7,
	timeout: 30_000, // 30s
	maxRetries: 2,
});

/**
 * Helper for writing a chain
 *
 * Enforces a Zod schema on the output and importantly any `.describe` in the schema is also processed as context (`withStructuredOutput` works like that)
 *
 * todo: enforce object requirement like response_format enforces
 *
 * [Error: 400 Invalid schema for response_format 'extract': schema must be a JSON Schema of 'type: "object"', got 'type: "number"'.] {
 */
export const structuredPrompt = <Schema extends z.ZodTypeAny>(
	template: string,
	schema: Schema,
	model: BaseChatModel,
) => {
	const prompt = PromptTemplate.fromTemplate(template).pipe(
		model.withStructuredOutput<ReturnType<Schema["parse"]>>(schema),
	);

	const invoke: (typeof prompt)["invoke"] = async (...args) => {
		try {
			const result = await prompt.invoke(...args);

			// console.log("invoked", { template, args, result: JSON.stringify(result, undefined, 2) });

			return result;
		} catch (error) {
			console.error({ template, args, error });

			throw error;
		}
	};

	return { ...prompt, invoke } as typeof prompt;
};
