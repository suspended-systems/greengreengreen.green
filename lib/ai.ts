import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { PromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";

/**
 * Helper for writing a chain
 * Enforces a Zod schema on the output and importantly any `.describe` in the schema is also processed as context (`withStructuredOutput` works like that)
 */
export const structuredPrompt = <T extends z.ZodTypeAny>(template: string, schema: T, model: BaseChatModel) =>
	PromptTemplate.fromTemplate(template).pipe(model.withStructuredOutput<ReturnType<T["parse"]>>(schema));
