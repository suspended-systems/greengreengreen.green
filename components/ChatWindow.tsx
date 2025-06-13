import React, { useState, useEffect, useRef, FormEvent } from "react";
import { v4 as uuid } from "uuid";
import { ArrowUpIcon, TriangleAlertIcon } from "lucide-react";

interface Alternative {
	id: string;
	name: string;
	price: number;
	frequency: string;
	percentageSavings: number;
	annualSavings: number;
	pros: string[];
	cons: string[];
}

interface ChatMessage {
	id: string;
	role: "assistant" | "user" | "system";
	content: string;
	summary?: string;
	alternatives?: Alternative[];
}

interface ChatWindowProps {
	initialPayload: Record<string, any>;
	onSelectAlternative: (alt: Alternative) => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ initialPayload, onSelectAlternative }) => {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [input, setInput] = useState("");
	const [loading, setLoading] = useState(false);
	const lastMsgRef = useRef<HTMLDivElement>(null);

	// Scroll newest message into view at top
	useEffect(() => {
		lastMsgRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
	}, [messages]);

	useEffect(() => {
		setMessages([
			{
				id: uuid(),
				role: "assistant",
				content: `Let's help you save some green by finding cheaper alternatives to ${initialPayload.name} 🤑`,
			},
			{
				id: uuid(),
				role: "assistant",
				content: `What value does ${initialPayload.name} ${initialPayload.freq} provide you?`,
			},
		]);
	}, [initialPayload]);

	// Send user message + fetch assistant reply
	const sendMessage = async (text: string) => {
		const userMsg: ChatMessage = { id: `u${Date.now()}`, role: "user", content: text };
		const convo = [...messages, userMsg];
		setMessages(convo);
		setInput("");
		setLoading(true);

		try {
			const res = await fetch("/api/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					spendingHabit: initialPayload,
					messages: convo.map((m) => ({ role: m.role, content: m.content })),
				}),
			});
			const data = await res.json();

			const { summary, alternatives } = data as { summary: string; alternatives: Alternative[] };
			const assistantMsg = {
				id: `assistant-${Date.now()}`,
				role: "assistant" as const,
				content: summary,
				alternatives,
			};

			setMessages((prev) => [...prev, assistantMsg]);
		} catch (err) {
			console.error(err);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="w-80 h-96 bg-white dark:bg-[#519c6b]/5 shadow-lg flex flex-col">
			<div className="flex-1 overflow-y-auto p-2">
				{messages
					.filter((m) => m.role !== "system")
					.map((m, i, arr) => {
						const isLast = i === arr.length - 1;
						return (
							<div
								key={m.id}
								ref={isLast ? lastMsgRef : undefined}
								className={`mb-2 flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
							>
								<div>
									{m.content && (
										<div
											className={`inline-block px-2 py-1 rounded ${
												m.role === "user"
													? "bg-[#519c6b] text-white"
													: "bg-gray-100 dark:bg-[#519c6b]/10 text-gray-900 dark:text-gray-100"
											}`}
										>
											{m.content}
										</div>
									)}
									{m.alternatives && (
										<>
											<div className="mt-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Options:</div>
											{m.alternatives.slice(0, 5).map((alt) => (
												<div key={alt.id} className="p-2 border border-gray-300 dark:border-[#519c6b]/40 rounded mb-2">
													<button
														className="font-medium cursor-pointer bg-[#519c6b] text-white px-2 py-1 rounded"
														onClick={() => onSelectAlternative(alt)}
														disabled={loading}
													>
														{`$${alt.price} (save ${alt.percentageSavings}%) — ${alt.name} (save $${alt.annualSavings} annually)`}
													</button>
													<div className="text-xs mt-1 text-gray-800 dark:text-gray-200">
														<div className="font-semibold">Tradeoffs:</div>
														<ul className="list-disc list-inside text-xs">
															{alt.cons.map((con, i) => (
																<li key={i}>{con}</li>
															))}
														</ul>
													</div>
												</div>
											))}
										</>
									)}
								</div>
							</div>
						);
					})}
				{loading && <div className="text-center text-sm text-gray-500 dark:text-gray-400">Assistant is typing...</div>}
			</div>

			<div className="p-2 border-t border-gray-200 dark:border-[#519c6b]/40 flex">
				<textarea
					rows={3}
					className="flex-1 px-2 py-1 border border-gray-300 dark:border-[#519c6b]/40 rounded resize-none bg-white dark:bg-[#519c6b]/10 text-gray-900 dark:text-gray-100"
					value={input}
					disabled={loading}
					onChange={(e) => setInput(e.target.value)}
					onKeyDown={(e) =>
						e.key === "Enter" && !e.shiftKey && input.trim() && (e.preventDefault(), sendMessage(input.trim()))
					}
					placeholder="Type your message…"
				/>
				<button
					className="ml-2 px-3 py-1 bg-[#519c6b] text-white rounded disabled:opacity-50 cursor-pointer"
					disabled={!input.trim() || loading}
					onClick={() => sendMessage(input.trim())}
				>
					<ArrowUpIcon />
				</button>
			</div>
			<p className="pointer-events-none inline-flex gap-1 items-center p-2 text-muted-foreground text-sm">
				<TriangleAlertIcon size={14} />
				Chat recommendations are in beta
			</p>
		</div>
	);
};

export default ChatWindow;
