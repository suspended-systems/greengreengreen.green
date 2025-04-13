export const APP_NAME = "green";

export const GreenColor = "#519c6b";

export const DAY_MS = 24 * 60 * 60 * 1000;

export const formatMoney = (amount: number) =>
	new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(amount);

import { Frequency } from "rrule";
export const frequencies = [Frequency.DAILY, Frequency.WEEKLY, Frequency.MONTHLY, Frequency.YEARLY];
export const frequenciesStrings = ["days", "weeks", "months", "years"];
