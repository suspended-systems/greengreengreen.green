import { parse } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { z } from "zod";
import { Frequency, RRule } from "rrule";

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
		header: "Transaction",
		sheetsColumnLetter: "A",
		sheetsSchema: z.string().nonempty(),
	},
	amount: {
		header: "Amount",
		sheetsColumnLetter: "B",
		sheetsSchema: z.coerce.number(),
		fromSheets: (amount: string) => Number(amount),
	},
	date: {
		header: "Date",
		sheetsColumnLetter: "C",
		sheetsSchema: z.string(),
		toSheets: (day: number) => formatDateToSheets(new Date(day)),
		fromSheets: (date: string, timezone: string) => parseSheetsDate(date, timezone).getTime(),
	},
	freq: {
		header: "Recurrence",
		sheetsColumnLetter: "D",
		sheetsSchema: z.string(),
		toSheets: (value: Frequency | null, tx: Transaction) =>
			value == null ? "" : new RRule({ freq: value, interval: tx.interval ?? 1 }).toText(),
		fromSheets: (recurrence: string) =>
			RRule.fromText(recurrence) ? RRule.fromText(recurrence).options.freq : undefined,
		options: [
			{ value: Frequency.DAILY, label: "days" },
			{ value: Frequency.WEEKLY, label: "weeks" },
			{ value: Frequency.MONTHLY, label: "months" },
			{ value: Frequency.YEARLY, label: "years" },
		],
	},
	interval: {
		sheetsColumnLetter: "D", // shared with freq
		toSheets: (value: number | null, tx: Transaction) =>
			value == null ? "" : new RRule({ freq: tx.freq ?? Frequency.DAILY, interval: value }).toText(),
		fromSheets: (recurrence: string) =>
			RRule.fromText(recurrence) ? RRule.fromText(recurrence).options.interval : undefined,
	},
	disabled: {
		header: "Enabled",
		sheetsColumnLetter: "E",
		sheetsSchema: z.union([z.literal("TRUE"), z.literal("FALSE"), z.literal("")]),
		toSheets: (isToggled: boolean) => !isToggled,
		fromSheets: (enabled: string) => {
			const isEnabled = enabled?.toLowerCase() === "true";
			return !isEnabled;
		},
	},
	id: {
		header: "UUID",
		sheetsColumnLetter: "F",
		sheetsSchema: z.string().uuid(),
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

export type SheetsRow = [string, number, string, string, string, string];

// Helper to create RRule for transaction
export const txRRule = (tx: Transaction) =>
	new RRule({ freq: tx.freq, interval: tx.interval ?? 1, dtstart: new Date(tx.date) });

export const transactionToSheetsRow = (tx: Transaction) =>
	Object.entries(TRANSACTION_FIELDS)
		.filter(([field, schema]) => "header" in schema) // headers only
		.map(([field, schema]) => {
			// Special case for freq where we add on interval too. 2 values, 1 column ;)
			if (field === "freq") return txRRule(tx).toText();

			const fieldValue = tx[field as keyof typeof tx];

			if ("toSheets" in schema) {
				return (
					schema.toSheets as (
						value: string | number | boolean | undefined,
						tx: Transaction,
					) => string | number | boolean
				)(fieldValue, tx);
			}

			return fieldValue;
		}) as SheetsRow;

export const sheetsRowToTransaction = (row: SheetsRow) =>
	Object.entries(TRANSACTION_FIELDS)
		.filter(([field, schema]) => "header" in schema) // headers only, we'll hardcode interval
		.reduce((tx, [field, schema], i) => {
			const value = row[i];

			return {
				...tx,

				[field]:
					"fromSheets" in schema
						? (schema.fromSheets as (value: string | number | boolean | undefined) => string | number | boolean)(value)
						: value,

				// grab the interval at the same time as the freq
				...(field === "freq" && { interval: TRANSACTION_FIELDS.interval.fromSheets(value as string) }),
			};
		}, {}) as Transaction;

export const formatDateToSheets = (date: Date) =>
	// date is sent in a locale format
	date.toLocaleDateString();

export const parseSheetsDate = (dateString: string, tz: string) =>
	fromZonedTime(parse(dateString, "M/d/yyyy", new Date()), tz);
