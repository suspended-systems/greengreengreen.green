import { useState, useEffect, useRef } from "react";
import { v4 as uuid } from "uuid";
import { ArrowUpIcon, TriangleAlertIcon } from "lucide-react";

type Alternative = {
	id: string;
	name: string;
	price: number;
	frequency: string;
	pros: string[];
	cons: string[];
};

type ChatMessage = {
	id: string;
	role: "assistant" | "user" | "system";
	content: string;
	summary?: string;
	alternatives?: Alternative[];
};

const ChatWindow = ({
	initialPayload,
	onSelectAlternative,
}: {
	initialPayload: {
		name: string;
		amount: `$${string}`;
		freq: string;
	};
	onSelectAlternative: (alt: Alternative) => void;
}) => {
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
				content: `What does ${initialPayload.name} ${initialPayload.freq} do for you?`,
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
		<div className="flex h-120 w-80 flex-col bg-white shadow-lg dark:bg-[#1A1E1B]">
			<div className="flex-1 overflow-x-hidden overflow-y-auto p-2">
				{messages
					.filter((m) => m.role !== "system")
					.map((m, i, arr) => {
						const isLast = i === arr.length - 1;
						const noTail = !isLast && arr[i + 1].role === m.role;
						const isUser = m.role === "user";

						return (
							<div
								key={m.id}
								ref={isLast ? lastMsgRef : undefined}
								className={`${noTail ? "mb-0.5" : "mb-2"} flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
							>
								<div>
									{m.content && (
										<div
											className={`relative inline-block max-w-[255px] ${noTail ? "mb-0.5" : "mb-4"} rounded-[25px] px-5 py-2.5 leading-6 break-words ${
												isUser
													? "ml-auto bg-[#519c6b] text-white"
													: "mr-auto bg-gray-100 text-gray-900 dark:bg-[#202A22] dark:text-gray-100"
											} container before:absolute before:bottom-0 before:h-[25px] before:w-[20px] before:content-[''] after:absolute after:bottom-0 after:h-[25px] after:w-[26px] after:content-[''] ${
												!noTail &&
												(isUser
													? "before:right-[-7px] before:[border-bottom-left-radius:16px_14px] before:bg-[#519c6b]"
													: "before:left-[-7px] before:[border-bottom-right-radius:16px_14px] before:bg-gray-100 dark:before:bg-[#202A22]")
											} /* cut-out to mask the tail */ ${
												!noTail &&
												(isUser
													? "after:right-[-26px] after:rounded-bl-[10px] after:bg-white dark:after:bg-[#1A1E1B]"
													: "after:left-[-26px] after:rounded-br-[10px] after:bg-white dark:after:bg-[#1A1E1B]")
											} `}
										>
											{m.content}
										</div>
									)}
									{m.alternatives && (
										<>
											<div className="mt-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Options:</div>
											{m.alternatives.slice(0, 5).map((alt) => (
												<div key={alt.id} className="mb-2 rounded border border-gray-300 p-2 dark:border-[#519c6b]/40">
													<button
														className="w-full cursor-pointer rounded bg-[#519c6b] px-2 py-1 font-medium text-white"
														onClick={() => onSelectAlternative(alt)}
														disabled={loading}
													>
														<p>{alt.name}</p>
														<p>{`$${alt.price} (save ${Math.round(
															((Number(initialPayload.amount.slice(1)) - alt.price) /
																Number(initialPayload.amount.slice(1))) *
																100,
														)}%)`}</p>
													</button>
													<div className="mt-1 text-xs text-gray-800 dark:text-gray-200">
														<div className="font-semibold">Tradeoffs:</div>
														<ul className="list-inside list-disc text-xs">
															{alt.cons.map((con) => (
																<li key={`con:${con}`}>{con}</li>
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

			<div className="flex border-t border-gray-200 p-2 dark:border-[#519c6b]/40">
				<textarea
					rows={3}
					className="flex-1 resize-none rounded border border-gray-300 bg-white px-2 py-1 text-gray-900 dark:border-[#519c6b]/40 dark:bg-[#519c6b]/10 dark:text-gray-100"
					value={input}
					disabled={loading}
					onChange={(e) => setInput(e.target.value)}
					onKeyDown={(e) =>
						e.key === "Enter" && !e.shiftKey && input.trim() && (e.preventDefault(), sendMessage(input.trim()))
					}
					placeholder="Type your message…"
				/>
				<button
					className="ml-2 cursor-pointer rounded bg-[#519c6b] px-3 py-1 text-white disabled:opacity-50"
					disabled={!input.trim() || loading}
					onClick={() => sendMessage(input.trim())}
				>
					<ArrowUpIcon />
				</button>
			</div>
			<p className="text-muted-foreground pointer-events-none inline-flex items-center gap-1 p-2 text-sm">
				<TriangleAlertIcon size={14} />
				Chat recommendations are in beta
			</p>
		</div>
	);
};

export default ChatWindow;
