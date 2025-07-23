import { partition } from "lodash";
import { Frequency } from "rrule";
import { v4 as uuid } from "uuid";
import { DAY_MS } from "./utils";
import { txRRule } from "./transactionSchema";

export type Transaction = {
	id: string;
	name: string;
	date: number;
	amount: number;
	freq?: Frequency;
	interval?: number;
	disabled?: boolean;
};

/**
 * Get all transactions (both one‐time and recurring) that happen on a specific day.
 *
 * @param {Date} date - The day to check, e.g. `new Date(2025, 0, 15)` for Jan 15, 2025.
 * @param {Transaction[]} transactions - Array of all transactions.
 * @returns {Transaction[]} - Subset of `transactions` that occur on the given `date`.
 *
 * Internally:
 * 1. We normalize `date` to midnight UTC by calling `setHours(0, 0, 0, 0)`.
 * 2. We split `transactions` into:
 *    - `recurring`: those having a truthy `freq` field.
 *    - `nonrecurring`: those without any `freq`.
 * 3. For `nonrecurring`, we check if their own `date` (set to midnight) matches the target day exactly.
 * 4. For `recurring`, we build an RRule via `txRRule(tx)` and ask `.between(startOfDay, endOfDay, inclusive=true)`.
 *    If there is at least one occurrence in that 24-hour span, we include it.
 */
export function getTransactionsOnDay(date: Date, transactions: Transaction[]): Transaction[] {
	// Zero out hours/minutes/seconds/millis for our target day.
	const targetDay = date.setHours(0, 0, 0, 0);

	// Split into recurring vs. one-time
	const [recurring, nonrecurring] = partition(transactions, (tx) => tx.freq);

	// For nonrecurring: include only if its date (normalized to midnight) equals our targetDay
	const nonrecurringOnDay = nonrecurring.filter((tx) => new Date(tx.date).setHours(0, 0, 0, 0) === targetDay);

	// For recurring: ask rrule if there's any occurrence between local midnight of targetDay and one ms before next day
	const recurringOnDay = recurring.filter((tx) => {
		const rule = txRRule(tx);
		// between() is half-open by default, but `true` for `inc` makes it inclusive of endpoints
		const occurrences = rule.between(new Date(targetDay), new Date(targetDay + DAY_MS - 1), true);
		return occurrences.length > 0; // at least one hit that day
	});

	return [...nonrecurringOnDay, ...recurringOnDay];
}

/**
 * Calculate the projected net value over a time span, starting from startValue, adding/subtracting
 * both one-time and recurring transactions that fall between `startDate` and `endDate` (inclusive).
 *
 * @param {Object} opts
 * @param {number} opts.startValue - The starting numeric value (e.g. balance) on `startDate`.
 * @param {Date} [opts.startDate] - The date from which we begin projecting (inclusive). If missing or
 *                                  if `endDate < startDate`, we short‐circuit to 0.
 * @param {Date} [opts.endDate] - The date at which we stop projecting (inclusive).
 * @param {Transaction[]} opts.transactions - Array of all transactions to consider.
 * @returns {number} - The final projected number after applying all transaction amounts (recurring or one-time).
 *
 * Behavior details:
 * 1. If `startDate` or `endDate` is missing, or `endDate < startDate`, we return 0 (invalid time span).
 * 2. We filter `transactions` so that:
 *    - A nonrecurring tx must have its date (midnight) >= startDate.getTime() AND <= endDate.getTime().
 *    - A recurring tx (`tx.freq` truthy) passes if its `dtstart` midnight is <= endDate. (We assume
 *      that if dtstart is before `startDate`, we still want to count future recurrences.)
 * 3. We `reduce(...)` starting from `startValue`, and for each tx:
 *    - If no `freq`, it only occurs once, so `occurrences = 1`.
 *    - If recurring, we do `txRRule(tx).between(startDate, endDate).length` (half-open on endDate),
 *      which tells us how many times it actually occurs in that span.
 *    - Multiply `occurrences * tx.amount` and add to our running `net`.
 */
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
}): number {
	// If missing dates or invalid range, nothing to project
	if (!startDate || !endDate || endDate < startDate) {
		return 0;
	}

	return transactions
		.filter((tx) => {
			const txMidnight = new Date(tx.date).setHours(0, 0, 0, 0);

			// If nonrecurring (no freq): only include if its date >= startDate AND <= endDate
			// If recurring: as long as dtstart (i.e. txMidnight) <= endDate, count it.
			//   (Even if dtstart < startDate, we will count recurrences using the RRule.)
			return (txMidnight >= startDate.getTime() || tx.freq) && txMidnight <= endDate.getTime();
		})
		.reduce((net, tx) => {
			// Determine number of occurrences within [startDate, endDate]
			const occurrences = !tx.freq ? 1 : txRRule(tx).between(startDate, endDate, true).length;

			const totalAmount = occurrences * tx.amount;
			return net + totalAmount;
		}, startValue);
}

export const defaultStartingDate = new Date(new Date().setHours(0, 0, 0, 0));
export const defaultStartingValue = 5000;
export const defaultTransactions: Transaction[] = [
	{
		id: uuid(),
		name: "Paycheck",
		date: new Date().setDate(4),
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
		date: new Date().setDate(17),
		amount: 1300,
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
