import { describe, expect, it } from "vitest";
import { letterToIndex } from "./utils";

describe("letterToIndex (0-based)", () => {
	it("returns 0–25 for A–Z", () => {
		const uppercaseAlphabet = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
		// uppercaseAlphabet is ["A", "B", …, "Z"]
		uppercaseAlphabet.forEach((letter, i) => {
			// Now we expect A → 0, B → 1, …, Z → 25
			expect(letterToIndex(letter)).toEqual(i);
		});
	});
});
