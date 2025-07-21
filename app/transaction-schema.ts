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

export const TRANSACTION_CONFIG = {
	name: {
		sheetsColumnLetter: "A",
		sheetsSchema: z.string().nonempty(),
		header: "Transaction",
		required: true,
		label: "Transaction",
		formPlaceholder: "Enter a transaction name...",
	},
	amount: {
		sheetsColumnLetter: "B",
		sheetsSchema: z.coerce.number(),
		header: "Amount",
		required: true,
		label: "Amount",
		formPlaceholder: "0.00",
	},
	date: {
		sheetsColumnLetter: "C",
		sheetsSchema: z.string(),
		header: "Date",
		required: true,
		label: "Date",
		formPlaceholder: "Select a start date",
	},
	freq: {
		sheetsColumnLetter: "D",
		sheetsSchema: z.string(),
		header: "Recurrence",
		required: false,
		label: "Frequency",
		options: [
			{ value: Frequency.DAILY, label: "days" },
			{ value: Frequency.WEEKLY, label: "weeks" },
			{ value: Frequency.MONTHLY, label: "months" },
			{ value: Frequency.YEARLY, label: "years" },
		],
	},
	interval: {
		sheetsColumnLetter: "D", // shares column with freq
		sheetsSchema: z.string(), // shares column with freq
		header: "Recurrence",
		required: false,
		label: "Interval",
		formPlaceholder: "1",
	},
	disabled: {
		sheetsColumnLetter: "E",
		header: "Enabled",
		required: false,
		label: "Disabled",
		defaultValue: false,
	},
	id: {
		sheetsColumnLetter: "F",
		header: "UUID",
		required: true,
		hidden: true,
	},
} as const;

export const HEADERS = Object.values(TRANSACTION_CONFIG).map((config) => config.header);

export const FREQUENCY_OPTIONS = TRANSACTION_CONFIG.freq.options;

/**
 * Special Zod Schema to handle case where any of Recurrence, Enabled, and/or UUID are missing in the row.
 * This can cause the Row/Tuple from Sheets API to vary in length which `z.tuple` doesn't play well with.
 * So we use this custom type to cover all valid possibilities.
 */
const NameAmountDate: [z.ZodString, z.ZodNumber, z.ZodString] = [z.string().nonempty(), z.coerce.number(), z.string()];
const Recurrence = z.string();
const Enabled = z.union([z.literal("TRUE"), z.literal("FALSE"), z.literal("")]);
const UUID = z.string().uuid();

export const TransactionRowSchema = z.union([
	z.tuple(NameAmountDate),
	z.tuple([...NameAmountDate, Recurrence] as const),
	z.tuple([...NameAmountDate, Recurrence, Enabled] as const),
	z.tuple([...NameAmountDate, Recurrence, Enabled, UUID] as const),
]);

export type SheetsRow = [string, number, string, string, boolean, string];

export const getColumnLetter = (field: keyof Transaction): string => {
	return TRANSACTION_CONFIG[field]?.sheetsColumnLetter || TRANSACTION_CONFIG.name.sheetsColumnLetter;
};

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
