import { Options as PMapOptions } from "p-map";

export const GreenColor = "#519c6b";

export const pMapConfig: PMapOptions = {
	concurrency: 1,
};

export const DAY_MS = 24 * 60 * 60 * 1000;

export const formatMoney = (amount: number) =>
	new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(amount);

export function letterToIndex(ch: string): number {
	if (ch.length !== 1) {
		throw new Error("Expected a single character");
	}
	const code = ch.charCodeAt(0);
	// A–Z: 65–90; a–z: 97–122
	if (code >= 65 && code <= 90) {
		// 'A'.charCodeAt(0) === 65, so this yields 0–25
		return code - 65;
	} else if (code >= 97 && code <= 122) {
		return code - 97;
	} else {
		throw new Error("Character is not A–Z or a–z");
	}
}
