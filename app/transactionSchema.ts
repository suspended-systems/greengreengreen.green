import { z } from "zod";
import { Frequency, RRule } from "rrule";
import { formatDateToSheets } from "./utils";

/**
 * Unified Transaction Schema and Configuration
 * Single source of truth for all transaction-related data, UI, and sheets integration
 */

export type Transaction = {
	id: string;
	name: string;
	date: number;
	amount: number;
	freq?: Frequency;
	interval?: number;
	disabled?: boolean;
};

export const TRANSACTION_FIELDS = {
	name: {
		sheetsColumnLetter: "A",
		sheetsSchema: z.string().nonempty(),
		header: "Transaction",
	},
	amount: {
		sheetsColumnLetter: "B",
		sheetsSchema: z.coerce.number(),
		header: "Amount",
	},
	date: {
		sheetsColumnLetter: "C",
		sheetsSchema: z.string(),
		header: "Date",
	},
	freq: {
		sheetsColumnLetter: "D",
		sheetsSchema: z.string(),
		header: "Recurrence",
		options: [
			{ value: Frequency.DAILY, label: "days" },
			{ value: Frequency.WEEKLY, label: "weeks" },
			{ value: Frequency.MONTHLY, label: "months" },
			{ value: Frequency.YEARLY, label: "years" },
		],
	},
	// interval: {}, // shares data with `freq`
	disabled: {
		sheetsColumnLetter: "E",
		sheetsSchema: z.union([z.literal("TRUE"), z.literal("FALSE"), z.literal("")]),
		header: "Enabled",
	},
	id: {
		sheetsColumnLetter: "F",
		sheetsSchema: z.string().uuid(),
		header: "UUID",
	},
} as const;

/**
 * Special Zod Schema to handle case where any of Recurrence, Enabled, and/or UUID are missing in the row.
 * This can cause the Row/Tuple from Sheets API to vary in length which `z.tuple` doesn't play well with.
 * So we use this custom type to cover all valid possibilities.
 */
const NameAmountDate: [z.ZodString, z.ZodNumber, z.ZodString] = [
	TRANSACTION_FIELDS.name.sheetsSchema,
	TRANSACTION_FIELDS.amount.sheetsSchema,
	TRANSACTION_FIELDS.date.sheetsSchema,
];
export const TransactionRowSchema = z.union([
	z.tuple(NameAmountDate),
	z.tuple([...NameAmountDate, TRANSACTION_FIELDS.freq.sheetsSchema] as const),
	z.tuple([...NameAmountDate, TRANSACTION_FIELDS.freq.sheetsSchema, TRANSACTION_FIELDS.disabled.sheetsSchema] as const),
	z.tuple([
		...NameAmountDate,
		TRANSACTION_FIELDS.freq.sheetsSchema,
		TRANSACTION_FIELDS.disabled.sheetsSchema,
		TRANSACTION_FIELDS.id.sheetsSchema,
	] as const),
]);

export type SheetsRow = [string, number, string, string, boolean, string];

// Helper to create RRule for transaction
export const txRRule = (tx: Transaction) =>
	new RRule({ freq: tx.freq, interval: tx.interval ?? 1, dtstart: new Date(tx.date) });

export const transactionToSheetsRow = (tx: Transaction): SheetsRow => {
	const { name, amount, date, freq, interval, disabled, id } = tx;

	const recurrenceText = freq ? txRRule(tx).toText() : "";

	return [
		name,
		amount,
		formatDateToSheets(new Date(date)),
		recurrenceText,
		!disabled, // sheets stores "enabled" but we use "disabled"
		id,
	];
};
