import { partition } from "lodash";
import { Frequency, RRule } from "rrule";
import { v4 as uuid } from "uuid";
import { DAY_MS } from "./utils";

export type Transaction = {
	id: string;
	name: string;
	date: number;
	amount: number;
	freq?: Frequency;
	interval?: number;
	disabled?: boolean;
};

export const txRRule = (tx: Transaction) =>
	new RRule({ freq: tx.freq, interval: tx.interval ?? 1, dtstart: new Date(tx.date) });

export function getTransactionsOnDay(date: Date, transactions: Transaction[]) {
	const targetDay = date.setHours(0, 0, 0, 0);

	const [recurring, nonrecurring] = partition(transactions, (tx) => tx.freq);

	const nonrecurringOnDay = nonrecurring.filter((tx) => new Date(tx.date).setHours(0, 0, 0, 0) === targetDay);

	const recurringOnDay = recurring.filter(
		(tx) => txRRule(tx).between(new Date(targetDay), new Date(targetDay + DAY_MS - 1), true).length,
	);
	return [...nonrecurringOnDay, ...recurringOnDay];
}

export function calcProjectedValue({
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
	if (!startDate || !endDate || endDate < startDate) {
		return 0;
	}

	return transactions
		.filter(
			(tx) =>
				(new Date(tx.date).setHours(0, 0, 0, 0) >= startDate.getTime() || tx.freq) &&
				new Date(tx.date).setHours(0, 0, 0, 0) <= endDate.getTime(),
		)
		.reduce((net, tx) => {
			const occurrences = !tx.freq ? 1 : txRRule(tx).between(startDate, endDate).length;

			const totalAmount = occurrences * tx.amount;

			return net + totalAmount;
		}, startValue);
}

export const defaultTransactions: Transaction[] = [
	{
		id: uuid(),
		name: "Paycheck",
		date: new Date().setDate(1),
		amount: 2000,
		freq: Frequency.WEEKLY,
		interval: 2,
	},
	{
		id: uuid(),
		name: "Rent",
		date: new Date().setDate(1),
		amount: -1500,
		freq: Frequency.MONTHLY,
	},
	{
		id: uuid(),
		name: "Netflix",
		date: new Date().setDate(4),
		amount: -24.99,
		freq: Frequency.MONTHLY,
	},
	{
		id: uuid(),
		name: "Hulu",
		date: new Date().setDate(4),
		amount: -18.99,
		freq: Frequency.MONTHLY,
	},
	{
		id: uuid(),
		name: "Investments cash out",
		date: new Date().setDate(4),
		amount: 2000,
	},
	{
		id: uuid(),
		name: "DoorDash",
		date: new Date().setDate(7),
		amount: -30,
		freq: Frequency.WEEKLY,
	},
	{
		id: uuid(),
		name: "Internet bill",
		date: new Date().setDate(13),
		amount: -80,
		freq: Frequency.MONTHLY,
	},
	{
		id: uuid(),
		name: "Refund",
		date: new Date().setDate(24),
		amount: 200,
	},
];
