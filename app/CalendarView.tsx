"use client";

import "./input.css";

import { Dispatch, SetStateAction, useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { CalendarCustomized } from "@/components/ui/calendar-customized";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { calcProjectedValue, getTransactionsOnDay, myTransactionsOnlyEnabled } from "./transactions";
import { DAY_MS, formatMoney } from "./utils";

export default function CalendarView({
	startValue,
	setStartValue,
	startDate,
	setStartDate,
	endDate,
	setEndDate,
}: {
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

	return (
		<div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 32 }}>
			<div className="container mx-auto" style={{ display: "flex", flexDirection: "column", flex: 1, gap: 16 }}>
				Enter your starting date and value:
				<div style={{ display: "flex", flex: 1, gap: 16 }}>
					<Popover>
						<PopoverTrigger asChild>
							<Button
								variant={"outline"}
								className={cn("w-[240px] justify-start text-left font-normal", !startDate && "text-muted-foreground")}
							>
								<CalendarIcon />
								{startDate ? startDate.toLocaleDateString() : <span>Pick a date</span>}
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
						<Input type={"number"} onChange={(e) => setStartValue(Number(e.target.value))} value={startValue} />
					</span>
				</div>
			</div>
			<div className="container mx-auto" style={{ display: "flex", flexDirection: "column", flex: 1, gap: 16 }}>
				View your projected value across days of the month:
				<div style={{ display: "flex", flex: 1, gap: 16 }}>
					<div>
						<CalendarCustomized
							{...{ startValue, startDate, endDate, transactions: myTransactionsOnlyEnabled }}
							mode="single"
							selected={endDate}
							onSelect={setEndDate}
							className="rounded-md border shadow"
						/>
					</div>

					<div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 16 }}>
						<div>
							<p>{endDate?.toLocaleDateString() ?? "--"}</p>
							<p>Projected value:</p>
							<p>
								{formatMoney(
									calcProjectedValue({
										startValue,
										startDate,
										endDate,
										transactions: myTransactionsOnlyEnabled,
									}),
								)}
							</p>
						</div>

						{dayTransactions && dayTransactions.length > 0 && (
							<div>
								<p>Transactions:</p>
								<ul>
									{dayTransactions.map((tx, i) => (
										<li key={`li:${i}:${tx.name}`}>
											{tx.name} {formatMoney(tx.amount)}
										</li>
									))}
								</ul>
							</div>
						)}
					</div>
				</div>
				<div>
					<p>
						{firstOfMonth.toLocaleDateString()}-{lastOfMonth.toLocaleDateString()}
					</p>
					<p>Income: </p>
					<p>
						+
						{formatMoney(
							calcProjectedValue({
								startValue: 0,
								startDate: firstOfMonth,
								endDate: lastOfMonth,
								transactions: myTransactionsOnlyEnabled.filter(({ amount }) => amount > -1),
							}),
						)}
					</p>
					<p>Expenses: </p>
					<p>
						{formatMoney(
							calcProjectedValue({
								startValue: 0,
								startDate: firstOfMonth,
								endDate: lastOfMonth,
								transactions: myTransactionsOnlyEnabled.filter(({ amount }) => amount < 0),
							}),
						)}
					</p>
				</div>
			</div>
		</div>
	);
}
