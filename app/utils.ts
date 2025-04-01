export const DAY_MS = 24 * 60 * 60 * 1000;

export const formatMoney = (amount: number) =>
	new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(amount);
