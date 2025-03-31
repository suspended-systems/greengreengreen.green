import { DAY_MS } from "./utils";

export type Transaction = {
	name: string;
	date: number;
	amount: number;
	recurringEveryXDays?: number;
	disabled?: boolean;
	assignedHappinessPoints?: number;
};

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
		return "--";
	}

	return transactions
		.filter(
			(tx) =>
				(new Date(tx.date).setHours(0, 0, 0, 0) >= startDate.getTime() || tx.recurringEveryXDays) &&
				new Date(tx.date).setHours(0, 0, 0, 0) <= endDate.getTime(),
		)
		.reduce((net, tx) => {
			const occurrences = !tx.recurringEveryXDays
				? 1
				: (() => {
						let occurrences = 0;
						let nextOccurrence = new Date(tx.date).setHours(0, 0, 0, 0);

						while (nextOccurrence < startDate.getTime()) {
							nextOccurrence += tx.recurringEveryXDays! * DAY_MS;
						}

						// inclusive
						while (nextOccurrence <= endDate.getTime()) {
							occurrences++;
							nextOccurrence += tx.recurringEveryXDays! * DAY_MS;
						}

						return occurrences;
				  })();

			const totalAmount = occurrences * tx.amount;

			return net + totalAmount;
		}, startValue);
}

// todo functionally process a day's
// - transactions (incl recurring)
// - net value
// would be cool to then use to calculate for a day range by just processing each day
// in the calendar display a background of days when your net is positive (green) or negative (red)
export function getDayData(time: number) {}

export const myTransactions: Transaction[] = [
	/**
	 * INCOME
	 */
	{
		name: "Corpo paycheck",
		date: Date.now(),
		amount: 4375,
		recurringEveryXDays: 14,
		disabled: true,
	},
	{
		name: "GS",
		date: Date.now(),
		amount: 1000,
		recurringEveryXDays: 30,
	},

	/**
	 * SPLURGE
	 */
	{
		name: "DoorDash",
		date: Date.now(),
		amount: -30,
		recurringEveryXDays: 7,
		assignedHappinessPoints: 100,
	},
	{
		name: "McDelivery",
		date: Date.now(),
		amount: -25,
		recurringEveryXDays: 7,
		assignedHappinessPoints: 100,
	},
	{
		name: "Lekda Wellness Thai Massage",
		date: Date.now() - 2 * DAY_MS,
		amount: -250,
		recurringEveryXDays: 30,
		assignedHappinessPoints: 100,
		disabled: true,
	},
	{
		name: "Kintsu Medspa Laser Hair Removal",
		date: Date.now() - 2 * DAY_MS,
		amount: -500,
		recurringEveryXDays: 60,
		assignedHappinessPoints: 100,
		disabled: true,
	},

	/**
	 * STREAMING
	 */
	{
		name: "Netflix",
		date: Date.now() + 12 * DAY_MS,
		amount: -24.99,
		recurringEveryXDays: 30,
		assignedHappinessPoints: 100,
		disabled: true,
	},
	{
		name: "HBO Max",
		date: Date.now() + 12 * DAY_MS,
		amount: -16.99,
		recurringEveryXDays: 30,
		assignedHappinessPoints: 100,
		disabled: true,
	},
	{
		name: "YouTube TV",
		date: Date.now() + 12 * DAY_MS,
		amount: -69.99,
		recurringEveryXDays: 30,
		assignedHappinessPoints: 100,
		disabled: true,
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
		date: Date.now() * DAY_MS,
		amount: -3200,
		recurringEveryXDays: 30,
	},
	{
		name: "Prosper",
		date: Date.now() * DAY_MS,
		amount: -1000,
		recurringEveryXDays: 30,
	},
	{
		name: "Water",
		date: Date.now() * DAY_MS,
		amount: -150,
		recurringEveryXDays: 30,
	},
	{
		name: "Power",
		date: Date.now() * DAY_MS,
		amount: -100,
		recurringEveryXDays: 30,
	},
	{
		name: "Sonic Internet",
		date: Date.now() * DAY_MS,
		amount: -80,
		recurringEveryXDays: 30,
	},
	{
		name: "Groceries",
		date: Date.now(),
		amount: -150,
		recurringEveryXDays: 14,
	},
].filter(({ disabled }) => !disabled);

export const exampleTransactions: Transaction[] = [
	{
		name: "Starbucks",
		date: Date.now() - 5 * DAY_MS,
		amount: -5,
		recurringEveryXDays: 3,
		assignedHappinessPoints: 5,
	},
	{
		name: "Paycheck",
		date: Date.now() - 3 * DAY_MS,
		amount: 2500,
		recurringEveryXDays: 14,
	},
	{
		name: "Chair refund",
		date: Date.now() + 5 * DAY_MS,
		amount: 200,
	},
	{
		name: "Netflix",
		date: Date.now() + 12 * DAY_MS,
		amount: -24.99,
		recurringEveryXDays: 30,
		assignedHappinessPoints: 100,
	},
	{
		name: "eBay sales",
		date: Date.now() + 10 * DAY_MS,
		amount: 279.83,
	},
	{
		name: "Discover card payment",
		date: Date.now() + 7 * DAY_MS,
		amount: -452.33,
		recurringEveryXDays: 30,
	},
	{
		name: "Capital One card payment",
		date: Date.now() + 12 * DAY_MS,
		amount: -242.8,
		recurringEveryXDays: 30,
	},
	{
		name: "McDonald's",
		date: Date.now() + 12 * DAY_MS,
		amount: -30,
		recurringEveryXDays: 4,
		assignedHappinessPoints: 10,
	},
	{
		name: "Groceries",
		date: Date.now() + 1 * DAY_MS,
		amount: -150,
		recurringEveryXDays: 14,
	},
	{
		name: "Massage",
		date: Date.now() - 2 * DAY_MS,
		amount: -250,
		recurringEveryXDays: 30,
	},
	{
		name: "Laser hair removal",
		date: Date.now() - 2 * DAY_MS,
		amount: -500,
		recurringEveryXDays: 60,
	},
];
