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
		<div className="w-80 h-120 bg-white dark:bg-[#1A1E1B] shadow-lg flex flex-col">
			<div className="flex-1 overflow-y-auto overflow-x-hidden p-2">
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
											className={`
										  relative inline-block max-w-[255px]
										  ${noTail ? "mb-0.5" : "mb-4"}
										  px-5 py-2.5 leading-6 break-words rounded-[25px]
										  ${
												isUser
													? "bg-[#519c6b] text-white ml-auto"
													: "bg-gray-100 dark:bg-[#202A22] text-gray-900 dark:text-gray-100 mr-auto"
											}
								
										  /* tail container */
										  before:absolute before:bottom-0 before:h-[25px] before:w-[20px] before:content-['']
										  after:absolute  after:bottom-0 after:h-[25px] after:w-[26px] after:content-['']
								
										  /* colored tail */
										  ${
												!noTail &&
												(isUser
													? "before:right-[-7px] before:bg-[#519c6b] before:[border-bottom-left-radius:16px_14px]"
													: "before:left-[-7px] before:bg-gray-100 dark:before:bg-[#202A22] before:[border-bottom-right-radius:16px_14px]")
											}
								
										  /* cut-out to mask the tail */
										  ${
												!noTail &&
												(isUser
													? "after:right-[-26px] after:bg-white dark:after:bg-[#1A1E1B] after:rounded-bl-[10px]"
													: "after:left-[-26px]  after:bg-white dark:after:bg-[#1A1E1B] after:rounded-br-[10px]")
											}
										`}
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
														className="w-full font-medium cursor-pointer bg-[#519c6b] text-white px-2 py-1 rounded"
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
													<div className="text-xs mt-1 text-gray-800 dark:text-gray-200">
														<div className="font-semibold">Tradeoffs:</div>
														<ul className="list-disc list-inside text-xs">
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
