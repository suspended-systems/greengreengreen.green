import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { PromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";

/**
 * Helper for writing a chain
 * Enforces a Zod schema on the output and importantly any `.describe` in the schema is also processed as context (`withStructuredOutput` works like that)
 *
 * todo: enforce object requirement like response_format enforces
 *
 * [Error: 400 Invalid schema for response_format 'extract': schema must be a JSON Schema of 'type: "object"', got 'type: "number"'.] {
 */
export const structuredPrompt = <T extends z.ZodTypeAny>(template: string, schema: T, model: BaseChatModel) => {
	const prompt = PromptTemplate.fromTemplate(template).pipe(model.withStructuredOutput<ReturnType<T["parse"]>>(schema));

	const invoke = async (...args: Parameters<(typeof prompt)["invoke"]>) => {
		try {
			const result = await prompt.invoke(...args);

			console.log("invoked", { template, args, result: JSON.stringify(result, undefined, 2) });

			return result;
		} catch (error) {
			console.error({ template, error });

			throw error;
		}
	};

	return { ...prompt, invoke } as typeof prompt;
};
