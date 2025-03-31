"use client";

import { useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "../components/ui/calendar";
import { Textarea } from "../components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { calcProjectedValue, myTransactions } from "./transactions";

export default function Home() {
	const [startValue, setStartValue] = useState(5000);
	const [startDate, setStartDate] = useState<Date | undefined>(new Date());
	const [endDate, setEndDate] = useState<Date | undefined>(new Date());

	const today = new Date();
	const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
	const lastOfMonth = new Date(today.getFullYear(), today.getMonth(), 31);

	return (
		<div>
			<h1>Green</h1>

			<br />
			<h2>Enter your starting value:</h2>
			<Textarea onChange={(e) => setStartValue(Number(e.target.value))} value={startValue} />

			<br />
			<h2>Select your starting date:</h2>
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

			<div style={{ display: "flex", flex: 1, gap: 32 }}>
				<div>
					<h2>Select the day you want to see your projected value on:</h2>
					<Calendar
						{...{ startValue, startDate, endDate, transactions: myTransactions }}
						mode="single"
						selected={endDate}
						onSelect={setEndDate}
						className="rounded-md border shadow"
					/>
				</div>

				<div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
					<div>
						<h2>Projected value on {endDate?.toLocaleDateString() ?? "--"}:</h2>
						{calcProjectedValue({ startValue, startDate, endDate, transactions: myTransactions })}
					</div>

					<div style={{ marginTop: "auto" }}>
						<div>
							<h2>
								{firstOfMonth.toLocaleDateString()}-{lastOfMonth.toLocaleDateString()} expenses:
							</h2>
							{calcProjectedValue({
								startValue: 0,
								startDate: firstOfMonth,
								endDate: lastOfMonth,
								transactions: myTransactions.filter(({ amount }) => amount < 0),
							})}
						</div>

						<div>
							<h2>
								{firstOfMonth.toLocaleDateString()}-{lastOfMonth.toLocaleDateString()} income:
							</h2>
							{calcProjectedValue({
								startValue: 0,
								startDate: firstOfMonth,
								endDate: lastOfMonth,
								transactions: myTransactions.filter(({ amount }) => amount > -1),
							})}
						</div>
					</div>
				</div>
			</div>

			<br />
			<br />
			<h2>Transactions:</h2>
			<ul>
				{myTransactions.map((tx) => (
					<li>
						{new Date(tx.date).toLocaleDateString()} - {tx.amount} - {tx.amount > -1 ? "Incoming" : "Outgoing"} -{" "}
						{tx.name}
						{tx.recurringEveryXDays && ` - Recurring every ${tx.recurringEveryXDays} days`}
					</li>
				))}
			</ul>
		</div>
	);
}
