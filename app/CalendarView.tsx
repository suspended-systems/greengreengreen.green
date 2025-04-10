"use client";

import "./input.css";

import { Dispatch, SetStateAction } from "react";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { CalendarCustomized } from "@/components/ui/calendar-customized";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { getTransactionsOnDay, Transaction } from "./transactions";
import { formatMoney } from "./utils";

export default function CalendarView({
	month,
	onMonthChange,
	transactions,
	startValue,
	setStartValue,
	startDate,
	setStartDate,
	endDate,
	setEndDate,
}: {
	month: Date;
	onMonthChange: Dispatch<SetStateAction<Date>>;
	transactions: Transaction[];
	startValue: number;
	setStartValue: Dispatch<SetStateAction<number>>;
	startDate: Date | undefined;
	setStartDate: Dispatch<SetStateAction<Date | undefined>>;
	endDate: Date | undefined;
	setEndDate: Dispatch<SetStateAction<Date | undefined>>;
}) {
	const enabledTransactions = transactions.filter((tx) => !tx.disabled);

	const dayTransactions = endDate && getTransactionsOnDay(endDate, enabledTransactions);
	const startDateIsToday = startDate && startDate.setHours(0, 0, 0, 0) === new Date().setHours(0, 0, 0, 0);

	return (
		<div className="flex flex-col gap-4">
			<div className="flex gap-2 items-center">
				Starting on
				<Popover>
					<PopoverTrigger asChild>
						<Button
							variant="outline"
							className={cn("w-[240px] justify-start text-left font-normal", !startDate && "text-muted-foreground")}
						>
							<CalendarIcon />
							{startDate ? (
								startDate.toLocaleDateString() + (startDateIsToday ? " (today)" : "")
							) : (
								<span>Select a start date</span>
							)}
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
					<Input
						type="number"
						onChange={(e) => setStartValue(parseFloat(e.target.value))}
						value={startValue}
						placeholder="Enter a start value..."
						style={{
							color: startValue > 0 ? "green" : startValue < 0 ? "red" : "inherit",
						}}
					/>
				</span>
			</div>
			<div className="container">
				<CalendarCustomized
					{...{ month, onMonthChange, startValue, startDate, endDate, transactions: enabledTransactions }}
					mode="single"
					selected={endDate}
					onSelect={setEndDate}
					className="rounded-md border"
				/>
				<div className="flex justify-center p-4" style={{ minHeight: 300 }}>
					{endDate && (
						<>
							{dayTransactions && dayTransactions.length > 0 ? (
								// <ul style={{ display: "inline-block", margin: "0 auto", fontWeight: 500 }}>
								// 	{dayTransactions?.map((tx, i) => (
								// 		<li key={`tx:${i}`} className="flex gap-2 py-2">
								// 			<span style={{ color: tx.amount > -1 ? "green" : "red" }}>
								// 				{tx.amount > -1 ? "+" : ""}
								// 				{formatMoney(tx.amount)}
								// 			</span>
								// 			<span>{tx.name}</span>
								// 		</li>
								// 	))}
								// </ul>
								<table
									className="border border-transparent border-spacing-4"
									style={{ height: "100%", borderCollapse: "separate", borderSpacing: 8 }}
								>
									<tbody>
										{dayTransactions.map((tx, i) => (
											<tr key={`tx:${i}`}>
												<td
													className="text-right"
													style={{ color: tx.amount > -1 ? "green" : "red", fontWeight: "bold" }}
												>
													{tx.amount > -1 ? "+" : ""}
													{formatMoney(tx.amount)}
												</td>
												<td style={{ fontWeight: 500 }}>{tx.name}</td>
											</tr>
										))}
									</tbody>
								</table>
							) : (
								<p style={{ opacity: 0.5 }}>No transactions on {endDate.toLocaleDateString()}</p>
							)}
						</>
					)}
					{!endDate && <p style={{ opacity: 0.5 }}>Select a date to view its transactions</p>}
				</div>
			</div>
		</div>
	);
}
