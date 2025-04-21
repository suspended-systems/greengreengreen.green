import React, { useState, useEffect, useRef } from "react";
import { ChatMessage, Alternative } from "../types/chat";

interface ChatWindowProps {
	initialPayload: Record<string, any>;
	onSelectAlternative: (alt: Alternative) => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ initialPayload, onSelectAlternative }) => {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [input, setInput] = useState("");
	const endRef = useRef<HTMLDivElement>(null);

	// Scroll to bottom on new messages
	useEffect(() => {
		endRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	// When opened, seed the system payload + first assistant question
	useEffect(() => {
		const firstQ: ChatMessage = {
			id: "assistant-0",
			role: "assistant",
			content: `What value does ${initialPayload.name} ${initialPayload.freq} provide you?`,
		};
		setMessages([
			{
				id: "assistant-1",
				role: "assistant",
				content: `Let's save you money by finding a cheaper alternative to ${initialPayload.name}.`,
			},
			firstQ,
		]);
	}, [initialPayload]);

	// Send to your API + render response
	const sendMessage = async (text: string) => {
		const userMsg: ChatMessage = {
			id: `u${Date.now()}`,
			role: "user",
			content: text,
		};
		const convo = [
			...messages,
			userMsg,
			{
				id: `aaa${Date.now()}`,
				role: "user",
				content:
					"please find me alternatives to save me money with the least amount of tradeoffs in convenience and experience",
			} as ChatMessage,
		];
		setMessages(convo);
		setInput("");

		const res = await fetch("/api/chat", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ messages: convo.map((m) => ({ role: m.role, content: m.content })) }),
		});
		const data = await res.json();

		let assistantMsg: ChatMessage;
		if (data.function_call) {
			// parse the returned JSON
			const args = JSON.parse(data.function_call.arguments);
			assistantMsg = {
				id: `a${Date.now()}`,
				role: "assistant",
				content: "", // we’ll render buttons, not text
				alternatives: args.alternatives,
			};
		} else {
			assistantMsg = {
				id: `a${Date.now()}`,
				role: "assistant",
				content: data.content,
			};
		}

		setMessages((prev) => [...prev, assistantMsg]);
	};

	return (
		<div className="fixed bottom-4 right-4 w-80 h-96 bg-white shadow-lg flex flex-col">
			<div className="flex-1 overflow-y-auto p-2">
				{messages.map((m) => (
					<div key={m.id} className={`mb-2 ${m.role === "user" ? "text-right" : "text-left"}`}>
						{m.content && <div className="inline-block px-2 py-1 rounded bg-gray-100">{m.content}</div>}
						{m.alternatives && (
							<div className="mt-1 flex flex-col space-y-1">
								{m.alternatives.map((alt) => (
									<button
										key={alt.id}
										className="self-start px-2 py-1 border rounded hover:bg-gray-50"
										onClick={() => onSelectAlternative(alt)}
									>
										{alt.name}
									</button>
								))}
							</div>
						)}
					</div>
				))}
				<div ref={endRef} />
			</div>

			<div className="p-2 border-t flex">
				<input
					className="flex-1 px-2 py-1 border rounded"
					value={input}
					onChange={(e) => setInput(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter" && input.trim()) sendMessage(input.trim());
					}}
					placeholder="Type your message…"
				/>
				<button
					className="ml-2 px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
					disabled={!input.trim()}
					onClick={() => sendMessage(input.trim())}
				>
					Send
				</button>
			</div>
		</div>
	);
};

export default ChatWindow;
