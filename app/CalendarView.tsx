"use client";

import { Dispatch, SetStateAction, useState } from "react";
import { BotMessageSquareIcon, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { v4 as uuid } from "uuid";

import { cn } from "@/lib/utils";
import ChatWindow from "@/components/ChatWindow";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { CalendarCustomized } from "@/components/ui/calendar-customized";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import NumericInput from "@/components/NumericInput";

import { calcProjectedValue, getTransactionsOnDay, Transaction, txRRule } from "./transactions";
import { COLUMNS, DAY_MS, formatDateToSheets, formatMoney, GreenColor } from "./utils";
import { appendSheetsRow, updateSheetsRow, updateStartingDate, updateStartingNumber } from "./sheets";

/**
 * Additional styling exists in `@/components/ui/calendar-customized`
 */
export default function CalendarView({
	month,
	onMonthChange,
	transactions,
	setTransactions,
	startAmount,
	setStartAmount,
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
	startAmount: number;
	setStartAmount: Dispatch<SetStateAction<number>>;
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
		<div className="flex flex-col md:flex-row md:gap-8 w-fit mx-auto overscroll-x-auto px-2 md:px-4 pb-4">
			{/* left panel */}
			<div className="tour-calendar-selected-day-details contents md:flex flex-col gap-4 items-center order-last md:order-first">
				<div className="tour-starting w-full mx-auto flex gap-2 items-center text-sm justify-between">
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
								onSelect={async (day) => {
									setStartDate(day);

									if (day && spreadsheetId) {
										await updateStartingDate(spreadsheetId, new Date(day.setHours(0, 0, 0, 0)));
									}
								}}
								initialFocus
							/>
						</PopoverContent>
					</Popover>
					<span className="font-lighter">with</span>
					<span className="input-symbol">
						<NumericInput
							style={{
								color: startAmount > 0 ? GreenColor : startAmount < 0 ? "red" : "inherit",
							}}
							onValidatedChange={async (amount) => {
								if (amount !== 0) {
									setStartAmount(amount);

									if (spreadsheetId) {
										await updateStartingNumber(spreadsheetId, amount);
									}
								}
							}}
							value={startAmount.toFixed(2)}
							className="text-sm w-[120px]"
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
								{startAmount && startDate && transactions && (
									<div className="block md:hidden text-sm">
										{formatMoney(
											calcProjectedValue({
												startValue: startAmount,
												startDate,
												endDate: new Date(endDate.getTime() + DAY_MS - 1),
												transactions,
											}),
										)}
									</div>
								)}
								<table className="border border-transparent" style={{ borderCollapse: "separate", borderSpacing: 8 }}>
									<tbody>
										{dayTransactions
											.sort((a, b) =>
												// both negative, reverse order so bigger expense first
												a.amount < 0 && b.amount < 0
													? // ascending
													  a.amount - b.amount
													: // descending
													  b.amount - a.amount,
											)
											.map((tx, i) => (
												<tr key={`tx:${i}`}>
													<td
														className="text-right"
														style={{ color: tx.amount > 0 ? GreenColor : "red", fontWeight: "bold" }}
													>
														{tx.amount > 0 ? "+" : ""}
														{formatMoney(tx.amount)}
													</td>
													<td className="flex font-medium">
														{tx.name}
														{tx.amount < 0 && tx.freq != null && (
															<ChatWindowPopover {...{ tx, setTransactions, spreadsheetId }} />
														)}
													</td>
												</tr>
											))}
									</tbody>
								</table>
							</>
						) : (
							<>
								<p className="text-sm opacity-50">
									No transactions on{" "}
									{endDate.toLocaleDateString(Intl.getCanonicalLocales(), {
										month: "long",
										weekday: "long",
										day: "numeric",
									})}
								</p>
								{startAmount && startDate && transactions && (
									<div className="block md:hidden text-sm opacity-50">
										{formatMoney(
											calcProjectedValue({
												startValue: startAmount,
												startDate,
												endDate: new Date(endDate.getTime() + DAY_MS - 1),
												transactions,
											}),
										)}
									</div>
								)}
							</>
						)
					) : (
						<p className="italic text-sm opacity-50">Select a date to view its transactions</p>
					)}
				</div>
			</div>
			{/* right panel */}
			<CalendarCustomized
				{...{ month, onMonthChange, startAmount, startDate, endDate, transactions: enabledTransactions }}
				mode="single"
				selected={endDate}
				onSelect={setEndDate}
				className="tour-calendar rounded-xl border mt-4 md:mt-0 bg-card"
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
					className="relative justify-start text-xs text-left font-normal h-6"
					style={{ paddingInline: 4, marginLeft: 3, bottom: 3 }}
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
							id: uuid(),
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
								formatDateToSheets(new Date(transaction.date)),
								transaction.freq ? txRRule(transaction).toText() : "",
								!transaction.disabled,
								transaction.id,
							]);
						}

						/**
						 * Disable the one we're replacing
						 */
						setTransactions((value) => value.map((t) => (t.id === tx.id ? { ...t, disabled: true } : t)));

						if (spreadsheetId) {
							await updateSheetsRow({
								spreadsheetId,
								filterValue: tx.id,
								column: COLUMNS.Enabled,
								cellValue: false,
							});
						}

						toast(`Disabled existing transaction "${tx.name}"`, {
							// This runs once the success-toast’s duration elapses
							onAutoClose() {
								toast(`Added new transaction "${transaction.name}"`);
							},
						});
					}}
				/>
			</PopoverContent>
		</Popover>
	);
}
