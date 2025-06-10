import { PromptTemplate } from "@langchain/core/prompts";
import { Runnable } from "@langchain/core/runnables";
import { ChatOpenAI } from "@langchain/openai";

const prompt = new PromptTemplate({
	inputVariables: ["name", "freq"],
	template: `
You are a financial‐advisor pipeline.  Given:
  item name: "{name}"
  frequency: "{freq}"
Return a JSON object with:
  - domain: a single word category (e.g. "food", "transport", "entertainment")
  - modality: the specific sub‐type (e.g. "delivery", "streaming", "ride‐share")
  
Output EXACTLY like so (no extra keys):
{"domain":"…","modality":"…"}
`,
});

export const categorizeChain = new Runnable({
	name: "categorize",
	// feed it { name,freq } and get back a parsed JS object
	async invoke(input: { name: string; freq: string }) {
		const llm = new ChatOpenAI({ model: "gpt-4o-mini" });
		const raw = await llm.call(prompt.format(input));
		return JSON.parse(raw) as { domain: string; modality: string };
	},
});
