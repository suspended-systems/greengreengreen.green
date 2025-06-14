import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { PromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";

export const prompt = <T extends z.ZodTypeAny>(template: string, schema: T, model: BaseChatModel) =>
	PromptTemplate.fromTemplate(template).pipe(model.withStructuredOutput<ReturnType<T["parse"]>>(schema));
