"use client";

import { Dispatch, SetStateAction, useState } from "react";
import { BotMessageSquareIcon, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import ChatWindow from "@/components/ChatWindow";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { CalendarCustomized } from "@/components/ui/calendar-customized";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import NumericInput from "@/components/NumericInput";

import { getTransactionsOnDay, Transaction, txRRule } from "./transactions";
import { formatMoney, GreenColor } from "./utils";
import { appendSheetsRow, updateSheetsRow } from "./sheets";

/**
 * Additional styling exists in `@/components/ui/calendar-customized`
 */
export default function CalendarView({
	month,
	onMonthChange,
	transactions,
	setTransactions,
	startValue,
	setStartValue,
	startDate,
	setStartDate,
	endDate,
	setEndDate,
	spreadsheetId,
}: {
	month: Date;
	onMonthChange: Dispatch<SetStateAction<Date>>;
	transactions: Transaction[];
	setTransactions: Dispatch<SetStateAction<Transaction[]>>;
	startValue: number;
	setStartValue: Dispatch<SetStateAction<number>>;
	startDate: Date | undefined;
	setStartDate: Dispatch<SetStateAction<Date | undefined>>;
	endDate: Date | undefined;
	setEndDate: Dispatch<SetStateAction<Date | undefined>>;
	spreadsheetId: string | null;
}) {
	const enabledTransactions = transactions.filter((tx) => !tx.disabled);

	const dayTransactions = endDate && getTransactionsOnDay(endDate, enabledTransactions);

	const startDateIsToday = startDate && startDate.setHours(0, 0, 0, 0) === new Date().setHours(0, 0, 0, 0);

	return (
		<div className="flex flex-col md:flex-row gap-4 md:gap-8 items-center md:items-start">
			{/* left panel */}
			<div className="tour-calendar-selected-day-details contents md:flex flex-col gap-4 items-center order-last md:order-first">
				<div className="tour-starting flex gap-2 items-center text-sm">
					{/* starting values */}
					<span className="hidden md:inline" style={{ whiteSpace: "nowrap" }}>
						Starting on
					</span>
					<Popover>
						<PopoverTrigger asChild>
							<Button
								variant="outline"
								className={cn("justify-start text-left font-normal", !startDate && "text-muted-foreground")}
								style={{ width: 120 }}
							>
								<CalendarIcon />
								{startDate ? startDateIsToday ? "Today" : startDate.toLocaleDateString() : <span>Select</span>}
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-auto p-0" align="start">
							<Calendar
								mode="single"
								selected={startDate}
								onSelect={setStartDate}
								initialFocus
								className="rounded-md border shadow"
							/>
						</PopoverContent>
					</Popover>
					with
					<span className="input-symbol">
						<NumericInput
							style={{
								color: startValue > 0 ? GreenColor : startValue < 0 ? "red" : "inherit",
								width: 120,
							}}
							onValidatedChange={(amount) => {
								if (amount !== 0) {
									setStartValue(amount);
								}
							}}
							initialValue={startValue.toFixed(2)}
							className="text-sm"
						/>
					</span>
				</div>
				{/* selected day transactions */}
				<div className="flex flex-col justify-center items-center py-4 order-3 md:order-2">
					{endDate ? (
						dayTransactions && dayTransactions.length > 0 ? (
							<>
								<div className="font-medium text-sm">
									{endDate.toLocaleDateString(Intl.getCanonicalLocales(), {
										month: "long",
										weekday: "long",
										day: "numeric",
									})}
								</div>
								<table
									className="border border-transparent border-spacing-4"
									style={{ borderCollapse: "separate", borderSpacing: 8 }}
								>
									<tbody>
										{dayTransactions
											.sort((a, b) => b.amount - a.amount)
											.map((tx, i) => (
												<tr key={`tx:${i}`}>
													<td
														className="text-right"
														style={{ color: tx.amount > -1 ? GreenColor : "red", fontWeight: "bold" }}
													>
														{tx.amount > -1 ? "+" : ""}
														{formatMoney(tx.amount)}
													</td>
													<td style={{ display: "flex", fontWeight: 500 }}>
														{tx.name}
														{tx.amount < 0 && tx.freq && (
															<ChatWindowPopover {...{ tx, setTransactions, spreadsheetId }} />
														)}
													</td>
												</tr>
											))}
									</tbody>
								</table>
							</>
						) : (
							<p className="text-sm" style={{ opacity: 0.5 }}>
								No transactions on{" "}
								{endDate.toLocaleDateString(Intl.getCanonicalLocales(), {
									month: "long",
									weekday: "long",
									day: "numeric",
								})}
							</p>
						)
					) : (
						<p className="italic text-sm" style={{ opacity: 0.5 }}>
							Select a date to view its transactions
						</p>
					)}
				</div>
			</div>
			{/* right panel */}
			<CalendarCustomized
				{...{ month, onMonthChange, startValue, startDate, endDate, transactions: enabledTransactions }}
				mode="single"
				selected={endDate}
				onSelect={setEndDate}
				className="tour-calendar mx-auto rounded-md md:border"
			/>
		</div>
	);
}

function ChatWindowPopover({
	tx,
	setTransactions,
	spreadsheetId,
}: {
	tx: Transaction;
	setTransactions: Dispatch<SetStateAction<Transaction[]>>;
	spreadsheetId: string | null;
}) {
	const [isPopoverOpen, setPopoverOpen] = useState(false);

	return (
		<Popover open={isPopoverOpen} onOpenChange={setPopoverOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="ghost"
					className="justify-start text-xs text-left font-normal h-6"
					style={{ paddingInline: 4, marginLeft: 3, position: "relative", bottom: 3 }}
				>
					<BotMessageSquareIcon />
				</Button>
			</PopoverTrigger>

			<PopoverContent className="w-auto p-0" align="end">
				<ChatWindow
					initialPayload={{
						name: tx.name,
						amount: `$${Math.abs(tx.amount)}`,
						freq: txRRule(tx).toText(),
					}}
					onSelectAlternative={async (data) => {
						setPopoverOpen(false);

						const transaction: Transaction = {
							name: data.name,
							amount: data.price * -1,
							date: tx.date,
							...(tx.freq && { freq: tx.freq, interval: tx.interval }),
						};

						/**
						 * Add the new transaction
						 */
						setTransactions((value) => [transaction, ...value]);

						if (spreadsheetId) {
							await appendSheetsRow(spreadsheetId, [
								transaction.name,
								transaction.amount,
								// date is sent in a reliable YYYY-MM-DD format so it get's picked up as a date in Sheets
								new Date(transaction.date).toISOString().split("T")[0],
								transaction.freq ? txRRule(transaction).toText() : "",
								!transaction.disabled,
							]);
						}

						toast(`Added new transaction "${transaction.name}"`);

						/**
						 * Disable the one we're replacing
						 */
						setTransactions((value) => value.map((t) => (t.name === tx.name ? { ...t, disabled: true } : t)));

						if (spreadsheetId) {
							await updateSheetsRow({
								spreadsheetId,
								filterValue: tx.name,
								columnOrRow: "E",
								newValue: false,
							});
						}

						toast(`Disabled existing transaction "${tx.name}"`);
					}}
				/>
			</PopoverContent>
		</Popover>
	);
}
