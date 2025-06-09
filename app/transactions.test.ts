import { describe, it, expect } from "vitest";
import { Transaction, getTransactionsOnDay, calcProjectedValue } from "./transactions";

import { Frequency } from "rrule";

function makeDate(year: number, month: number, day: number, hour = 0, min = 0, sec = 0) {
	// month is 1-based here to keep tests readable; Date expects 0-based month
	return new Date(year, month - 1, day, hour, min, sec);
}

describe("getTransactionsOnDay", () => {
	const baseDay = makeDate(2025, 1, 15); // Jan 15, 2025 00:00 UTC

	it("includes a nonrecurring transaction on the exact day", () => {
		const tx: Transaction = {
			id: "one-time",
			name: "One-time Purchase",
			date: makeDate(2025, 1, 15).getTime(),
			amount: -50,
		};
		const result = getTransactionsOnDay(baseDay, [tx]);
		expect(result).toContain(tx);
	});

	it("excludes a nonrecurring transaction on a different day", () => {
		const tx: Transaction = {
			id: "other-day",
			name: "Other Day",
			date: makeDate(2025, 1, 14).getTime(),
			amount: -20,
		};
		const result = getTransactionsOnDay(baseDay, [tx]);
		expect(result).toHaveLength(0);
	});

	it("includes a daily-recurring transaction if its dtstart <= target day", () => {
		// A daily recurrence starting Jan 1, 2025
		const daily: Transaction = {
			id: "daily-1",
			name: "Daily Coffee",
			date: makeDate(2025, 1, 1).getTime(),
			amount: -3,
			freq: Frequency.DAILY,
			interval: 1,
		};
		// Jan 15 is far after Jan 1, so there should be an occurrence on Jan 15.
		const result = getTransactionsOnDay(baseDay, [daily]);
		expect(result).toContain(daily);
	});

	it("excludes a daily-recurring transaction if its dtstart > target day", () => {
		// A daily recurrence starting Jan 20, 2025
		const futureDaily: Transaction = {
			id: "daily-future",
			name: "Future Daily",
			date: makeDate(2025, 1, 20).getTime(),
			amount: -2,
			freq: Frequency.DAILY,
			interval: 1,
		};
		// Jan 15 is before Jan 20, so no occurrences yet.
		const result = getTransactionsOnDay(baseDay, [futureDaily]);
		expect(result).toHaveLength(0);
	});

	it("includes a weekly-recurring transaction if it happens on that weekday", () => {
		// Jan 15, 2025 is a Wednesday (UTC)
		// Create a weekly recurrence on Wednesdays, starting Jan 8, 2025 (previous Wednesday)
		const weekly: Transaction = {
			id: "weekly-wed",
			name: "Weekly Subscription",
			date: makeDate(2025, 1, 8).getTime(), // Jan 8 is a Wednesday
			amount: -10,
			freq: Frequency.WEEKLY,
			interval: 1,
		};
		const result = getTransactionsOnDay(baseDay, [weekly]);
		expect(result).toContain(weekly);
	});

	it("excludes recurring if no occurrence lands exactly on that day", () => {
		// A weekly recurrence on Mondays, starting Jan 6, 2025
		// Jan 15, 2025 is Wednesday, so it should not hit.
		const weeklyMon: Transaction = {
			id: "weekly-mon",
			name: "Weekly on Monday",
			date: makeDate(2025, 1, 6).getTime(), // Jan 6 is Monday
			amount: -5,
			freq: Frequency.WEEKLY,
			interval: 1,
		};
		const result = getTransactionsOnDay(baseDay, [weeklyMon]);
		expect(result).toHaveLength(0);
	});
});

describe("calcProjectedValue", () => {
	const startDate = makeDate(2025, 1, 1); // Jan 1, 2025
	const endDate = makeDate(2025, 1, 7); // Jan 7, 2025

	it("returns 0 if startDate or endDate is missing", () => {
		const txs: Transaction[] = [
			{
				id: "t1",
				name: "Test",
				date: makeDate(2025, 1, 2).getTime(),
				amount: 100,
			},
		];
		expect(calcProjectedValue({ startValue: 100, endDate, transactions: txs })).toBe(0);
		expect(calcProjectedValue({ startValue: 100, startDate, transactions: txs })).toBe(0);
	});

	it("returns 0 if endDate < startDate", () => {
		const txs: Transaction[] = [];
		const earlier = makeDate(2025, 1, 1);
		const later = makeDate(2025, 1, 5);
		expect(
			calcProjectedValue({
				startValue: 50,
				startDate: later,
				endDate: earlier,
				transactions: txs,
			}),
		).toBe(0);
	});

	it("adds only one-time transactions that fall within the range", () => {
		const txInside: Transaction = {
			id: "in-1",
			name: "Inside",
			date: makeDate(2025, 1, 3).getTime(),
			amount: 200,
		};
		const txOutside: Transaction = {
			id: "out-1",
			name: "Outside",
			date: makeDate(2025, 1, 10).getTime(),
			amount: 300,
		};
		const result = calcProjectedValue({
			startValue: 1000,
			startDate,
			endDate,
			transactions: [txInside, txOutside],
		});
		// Only txInside should be added
		expect(result).toBe(1000 + 200);
	});

	it("includes a daily-recurring transaction once per day in the range", () => {
		// Daily $10 deposit starting Jan 1, 2025
		const dailyDeposit: Transaction = {
			id: "daily-dep",
			name: "Daily Deposit",
			date: makeDate(2025, 1, 1).getTime(),
			amount: 10,
			freq: Frequency.DAILY,
			interval: 1,
		};
		// Range is Jan 1 through Jan 7 inclusive: 7 occurrences
		const result = calcProjectedValue({
			startValue: 0,
			startDate,
			endDate,
			transactions: [dailyDeposit],
		});
		expect(result).toBe(7 * 10);
	});

	it("mixes one-time and recurring in the same projection", () => {
		// Jan 2 one-time expense of -50
		const oneTimeExp: Transaction = {
			id: "exp-1",
			name: "One-time Expense",
			date: makeDate(2025, 1, 2).getTime(),
			amount: -50,
		};
		// Weekly subscription on Thursdays, starting Jan 2, 2025
		// Jan 2, 2025 is Thursday; within Jan 1–7 it happens once
		const weekly: Transaction = {
			id: "weekly-sub",
			name: "Weekly Sub",
			date: makeDate(2025, 1, 2).getTime(),
			amount: -20,
			freq: Frequency.WEEKLY,
			interval: 1,
		};
		// Daily deposit of +5, starting Jan 1
		const dailySmall: Transaction = {
			id: "daily-5",
			name: "Daily 5",
			date: makeDate(2025, 1, 1).getTime(),
			amount: 5,
			freq: Frequency.DAILY,
			interval: 1,
		};

		const result = calcProjectedValue({
			startValue: 100,
			startDate,
			endDate,
			transactions: [oneTimeExp, weekly, dailySmall],
		});

		// Breakdown:
		// startValue = 100
		// oneTimeExp: -50 (Jan 2)
		// weekly:-20 (once on Jan 2)
		// dailySmall: +5 * 7 days = +35
		// total = 100 - 50 - 20 + 35 = 65
		expect(result).toBe(65);
	});

	it("does not count a recurring transaction that starts after endDate", () => {
		// Recurring monthly starting Feb 1, 2025 (outside our Jan 1–7 window)
		const monthly: Transaction = {
			id: "monthly-1",
			name: "Monthly",
			date: makeDate(2025, 2, 1).getTime(),
			amount: 100,
			freq: Frequency.MONTHLY,
			interval: 1,
		};
		const result = calcProjectedValue({
			startValue: 0,
			startDate,
			endDate,
			transactions: [monthly],
		});
		expect(result).toBe(0);
	});
});
