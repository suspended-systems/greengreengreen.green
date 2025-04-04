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

import { getTransactionsOnDay, myTransactionsOnlyEnabled, Transaction } from "./transactions";
import { formatMoney } from "./utils";

export default function CalendarView({
	transactions,
	startValue,
	setStartValue,
	startDate,
	setStartDate,
	endDate,
	setEndDate,
}: {
	transactions: Transaction[];
	startValue: number;
	setStartValue: Dispatch<SetStateAction<number>>;
	startDate: Date | undefined;
	setStartDate: Dispatch<SetStateAction<Date | undefined>>;
	endDate: Date | undefined;
	setEndDate: Dispatch<SetStateAction<Date | undefined>>;
}) {
	const today = endDate || new Date();
	const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
	const lastOfMonth = new Date(today.getFullYear(), today.getMonth(), 31);

	const dayTransactions = endDate && getTransactionsOnDay(endDate, myTransactionsOnlyEnabled);
	const startDateIsToday = startDate && startDate.setHours(0, 0, 0, 0) === new Date().setHours(0, 0, 0, 0);

	return (
		<div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 16 }}>
			<div style={{ display: "flex", flex: 1, gap: 16 }}>
				<Popover>
					<PopoverTrigger asChild>
						<Button
							variant={"outline"}
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

				<span className="input-symbol">
					<Input
						type={"number"}
						onChange={(e) => setStartValue(Number(e.target.value))}
						value={startValue}
						placeholder="Select a start value"
					/>
				</span>
			</div>
			<div className="container mx-auto" style={{ display: "flex", flexDirection: "column", flex: 1, gap: 16 }}>
				<div style={{ display: "flex", flex: 1, gap: 16 }}>
					<CalendarCustomized
						{...{ startValue, startDate, endDate, transactions: transactions.filter((tx) => !tx.disabled) }}
						mode="single"
						selected={endDate}
						onSelect={setEndDate}
						className="rounded-md border shadow"
					/>
				</div>
				<div className="flex justify-center" style={{ minHeight: 200, padding: 20 }}>
					{endDate && (
						<>
							{dayTransactions && dayTransactions.length > 0 ? (
								<ul style={{ display: "inline-block", margin: "0 auto", fontWeight: 500 }}>
									{dayTransactions?.map((tx, i) => (
										<li key={`tx:${i}`}>
											<span style={{ color: tx.amount > -1 ? "green" : "red" }}>
												{tx.amount > -1 ? "+" : ""}
												{formatMoney(tx.amount)}
											</span>{" "}
											{tx.name}
										</li>
									))}
								</ul>
							) : (
								<p style={{ opacity: 0.5, alignSelf: "center" }}>No transactions on {endDate.toLocaleDateString()}</p>
							)}
						</>
					)}
					{!endDate && <p style={{ opacity: 0.5, alignSelf: "center" }}>Select a date to view its transactions</p>}
				</div>
			</div>
		</div>
	);
}
