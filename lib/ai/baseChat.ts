import { ChatOpenAI } from "@langchain/openai";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { UpstashRedisChatMessageHistory } from "@langchain/community/stores/message/upstash_redis";

// 1) swap in your Redis creds here
const history = (sessionId: string) =>
	new UpstashRedisChatMessageHistory({
		sessionId,
		// redis config…
	});

// 2) our “drop-in” chat runnable
export const conversation = new RunnableWithMessageHistory({
	runnable: new ChatOpenAI({
		model: "gpt-4o-mini",
		streaming: false, // we’ll return a JSON payload in one go
	}),
	history: ({ sessionId }) => history(sessionId),
});
