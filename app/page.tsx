"use client";

import { useState } from "react";
import { Calendar } from "../components/ui/calendar";
import { Textarea } from "../components/ui/textarea";

const DAY_MS = 24 * 60 * 60 * 1000;

export type Transaction = {
	name: string;
	date: number;
	type: "incoming" | "outgoing";
	amount: number;
	recurringEveryXDays?: number;
};
const transactions: Transaction[] = [
	{
		name: "Starbucks",
		date: Date.now() - 5 * DAY_MS,
		type: "outgoing",
		amount: 5,
		recurringEveryXDays: 3,
	},
	{
		name: "Paycheck",
		date: Date.now() - 3 * DAY_MS,
		type: "incoming",
		amount: 2500,
		recurringEveryXDays: 14,
	},
	{
		name: "Chair refund",
		date: Date.now() + 5 * DAY_MS,
		type: "incoming",
		amount: 200,
	},
	{
		name: "Netflix",
		date: Date.now() + 12 * DAY_MS,
		type: "outgoing",
		amount: 24.99,
		recurringEveryXDays: 30,
	},
	{
		name: "eBay sales",
		date: Date.now() + 10 * DAY_MS,
		type: "incoming",
		amount: 279.83,
	},
	{
		name: "Discover card payment",
		date: Date.now() + 7 * DAY_MS,
		type: "outgoing",
		amount: 452.33,
		recurringEveryXDays: 30,
	},
	{
		name: "Capital One card payment",
		date: Date.now() + 12 * DAY_MS,
		type: "outgoing",
		amount: 242.8,
		recurringEveryXDays: 30,
	},
	{
		name: "McDonald's",
		date: Date.now() + 12 * DAY_MS,
		type: "outgoing",
		amount: 30,
		recurringEveryXDays: 4,
	},
	{
		name: "Groceries",
		date: Date.now() + 1 * DAY_MS,
		type: "outgoing",
		amount: 150,
		recurringEveryXDays: 14,
	},
];

export default function Home() {
	const [startValue, setStartValue] = useState(5000);
	const [startDate, setStartDate] = useState<Date | undefined>(new Date());
	const [endDate, setEndDate] = useState<Date | undefined>(new Date());

	return (
		<div>
			<h1>Green</h1>

			<h2>Enter your start value:</h2>
			<Textarea onChange={(e) => setStartValue(Number(e.target.value))} value={startValue} />

			<h2>Select your start date:</h2>
			<Calendar
				transactions={transactions}
				mode="single"
				selected={startDate}
				onSelect={setStartDate}
				className="rounded-md border shadow"
			/>

			<h2>Select your end date:</h2>
			<Calendar
				transactions={transactions}
				mode="single"
				selected={endDate}
				onSelect={setEndDate}
				className="rounded-md border shadow"
			/>

			<h2>Value on day:</h2>
			{calcValue({ startValue, startDate, endDate, transactions })}

			<h2>Transactions:</h2>
			<ul>
				{transactions.map((tx) => (
					<li>
						{new Date(tx.date).toISOString()} - {tx.amount} - {tx.type} - {tx.name}
						{tx.recurringEveryXDays && ` - Recurring every ${tx.recurringEveryXDays} days`}
					</li>
				))}
			</ul>
		</div>
	);
}

function calcValue({
	startValue,
	startDate,
	endDate,
	transactions,
}: {
	startValue: number;
	startDate?: Date;
	endDate?: Date;
	transactions: Transaction[];
}) {
	if (!startDate || !endDate) {
		return "--";
	}

	return transactions
		.filter((tx) => tx.date >= startDate.getTime() || tx.recurringEveryXDays)
		.reduce((net, tx) => {
			const occurrences = !tx.recurringEveryXDays
				? 1
				: (() => {
						let occurrences = 0;
						let nextOccurrence = tx.date;

						while (nextOccurrence < startDate.getTime()) {
							nextOccurrence += tx.recurringEveryXDays! * DAY_MS;
						}

						while (nextOccurrence < endDate.getTime()) {
							occurrences++;
							nextOccurrence += tx.recurringEveryXDays! * DAY_MS;
						}

						return occurrences;
				  })();

			const totalAmount = occurrences * tx.amount;

			return tx.type == "incoming" ? net + totalAmount : net - totalAmount;
		}, startValue);
}
