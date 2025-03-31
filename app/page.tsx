"use client";

import { useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { calcProjectedValue, myTransactions } from "./transactions";
import { DAY_MS } from "./utils";
import { Input } from "../components/ui/input";

export default function Home() {
	const [startValue, setStartValue] = useState(5000);
	const [startDate, setStartDate] = useState<Date | undefined>(new Date(new Date().setHours(0, 0, 0, 0)));
	const [endDate, setEndDate] = useState<Date | undefined>(new Date(new Date().setHours(0, 0, 0, 0) + 7 * DAY_MS));

	const today = new Date();
	const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
	const lastOfMonth = new Date(today.getFullYear(), today.getMonth(), 31);

	return (
		<div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 32 }}>
			<h1>Green</h1>

			<div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 16 }}>
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
								big={false}
								mode="single"
								selected={startDate}
								onSelect={setStartDate}
								initialFocus
								className="rounded-md border shadow"
							/>
						</PopoverContent>
					</Popover>

					<Input type={"number"} onChange={(e) => setStartValue(Number(e.target.value))} value={startValue} />
				</div>
			</div>

			<div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 16 }}>
				View your projected value across days of the month:
				<div style={{ display: "flex", flex: 1, gap: 16 }}>
					<div>
						<Calendar
							{...{ startValue, startDate, endDate, transactions: myTransactions }}
							big
							mode="single"
							selected={endDate}
							onSelect={setEndDate}
							className="rounded-md border shadow"
						/>
					</div>

					<div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
						<p>
							Projected value on {endDate?.toLocaleDateString() ?? "--"}:
							{calcProjectedValue({ startValue, startDate, endDate, transactions: myTransactions })}
						</p>
						<p>
							Transactions on {endDate?.toLocaleDateString() ?? "--"}:{"todo"}
						</p>
						<div style={{ marginTop: "auto" }}>
							<p>
								{firstOfMonth.toLocaleDateString()}-{lastOfMonth.toLocaleDateString()} income: +
								{calcProjectedValue({
									startValue: 0,
									startDate: firstOfMonth,
									endDate: lastOfMonth,
									transactions: myTransactions.filter(({ amount }) => amount > -1),
								})}
							</p>
							<p>
								{firstOfMonth.toLocaleDateString()}-{lastOfMonth.toLocaleDateString()} expenses:{" "}
								{calcProjectedValue({
									startValue: 0,
									startDate: firstOfMonth,
									endDate: lastOfMonth,
									transactions: myTransactions.filter(({ amount }) => amount < 0),
								})}
							</p>
						</div>
					</div>
				</div>
			</div>

			<div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 16 }}>
				Your transactions:
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-[100px]">Transaction</TableHead>
							<TableHead>Date</TableHead>
							<TableHead>Recurs every</TableHead>
							<TableHead className="text-right">Amount</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{myTransactions.map((tx, i) => (
							<TableRow key={`td:${i}:${tx.name}`}>
								<TableCell className="font-medium">{tx.name}</TableCell>
								<TableCell>{new Date(tx.date).toLocaleDateString()}</TableCell>
								<TableCell>{tx.recurringEveryXDays ? `${tx.recurringEveryXDays} days` : ""}</TableCell>
								<TableCell className="text-right" style={{ color: tx.amount > -1 ? "green" : "red" }}>
									{tx.amount > -1 ? "+" : "-"}${Math.abs(tx.amount)}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
