export const DAY_MS = 24 * 60 * 60 * 1000;

export const formatMoney = (amount: number) =>
	new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(amount);

export const frequenciesStrings = ["days", "weeks", "months", "years"];
import { Frequency } from "rrule";
export const frequencies = [Frequency.DAILY, Frequency.WEEKLY, Frequency.MONTHLY, Frequency.YEARLY];

import { useEffect, useLayoutEffect } from "react";
export const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;
