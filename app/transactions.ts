import { partition } from "lodash";
import { Frequency, RRule } from "rrule";

import { DAY_MS } from "./utils";
export type Transaction = {
	name: string;
	date: number;
	amount: number;
	freq?: Frequency;
	interval?: number;
	disabled?: boolean;
	assignedHappinessPoints?: number;
};

export const txRRule = (tx: Transaction) =>
	new RRule({ freq: tx.freq, interval: tx.interval ?? 1, dtstart: new Date(tx.date) });

export function getTransactionsOnDay(date: Date, transactions: Transaction[]) {
	const targetDay = date.setHours(0, 0, 0, 0);

	const [recurring, nonrecurring] = partition(transactions, (tx) => tx.freq);

	const nonrecurringOnDay = nonrecurring.filter((tx) => new Date(tx.date).setHours(0, 0, 0, 0) === targetDay);

	const recurringOnDay = recurring.filter(
		(tx) => txRRule(tx).between(new Date(targetDay), new Date(targetDay + DAY_MS - 1)).length,
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

export const myTransactions: Transaction[] = [
	/**
	 * INCOME
	 */
	{
		name: "Corpo paycheck",
		date: Date.now(),
		amount: 4375,
		freq: Frequency.WEEKLY,
		interval: 2,
		disabled: true,
	},
	{
		name: "GS",
		date: Date.now(),
		amount: 1000,
		freq: Frequency.MONTHLY,
	},

	/**
	 * SPLURGE
	 */
	{
		name: "DoorDash",
		date: Date.now(),
		amount: -30,
		freq: Frequency.WEEKLY,
		assignedHappinessPoints: 100,
	},
	{
		name: "McDelivery",
		date: Date.now(),
		amount: -25,
		freq: Frequency.WEEKLY,
		assignedHappinessPoints: 100,
	},
	{
		name: "Lekda Wellness Thai Massage",
		date: Date.now() - 2 * DAY_MS,
		amount: -250,
		freq: Frequency.MONTHLY,
		assignedHappinessPoints: 100,
		disabled: true,
	},
	{
		name: "Kintsu Medspa",
		date: Date.now() - 2 * DAY_MS,
		amount: -500,
		freq: Frequency.MONTHLY,
		interval: 2,
		assignedHappinessPoints: 100,
		disabled: true,
	},

	/**
	 * STREAMING
	 */
	{
		name: "Netflix",
		date: Date.now() + 10 * DAY_MS,
		amount: -24.99,
		freq: Frequency.MONTHLY,
		assignedHappinessPoints: 100,
		// disabled: true,
	},
	{
		name: "HBO Max",
		date: Date.now() + 11 * DAY_MS,
		amount: -16.99,
		freq: Frequency.MONTHLY,
		assignedHappinessPoints: 100,
		// disabled: true,
	},
	{
		name: "YouTube TV",
		date: Date.now() + 12 * DAY_MS,
		amount: -69.99,
		freq: Frequency.MONTHLY,
		assignedHappinessPoints: 100,
		// disabled: true,
	},

	/**
	 * REFUNDS
	 */
	{
		name: "Neon tube light refund",
		date: Date.now() + 10 * DAY_MS,
		amount: 250,
	},

	/**
	 * BILLZ
	 */
	{
		name: "Rent",
		date: Date.now(),
		amount: -3200,
		freq: Frequency.MONTHLY,
	},
	{
		name: "Prosper",
		date: Date.now() + DAY_MS * 3,
		amount: -1000,
		freq: Frequency.MONTHLY,
	},
	{
		name: "Water",
		date: Date.now(),
		amount: -150,
		freq: Frequency.MONTHLY,
	},
	{
		name: "Power",
		date: Date.now(),
		amount: -100,
		freq: Frequency.MONTHLY,
	},
	{
		name: "Sonic Internet",
		date: Date.now(),
		amount: -80,
		freq: Frequency.MONTHLY,
	},
	{
		name: "Groceries",
		date: Date.now() + DAY_MS + 1,
		amount: -150,
		freq: Frequency.WEEKLY,
		interval: 2,
	},
];

export const myTransactionsOnlyEnabled: Transaction[] = myTransactions.filter(({ disabled }) => !disabled);
