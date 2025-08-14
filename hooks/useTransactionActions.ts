import { useCallback } from "react";
import { useApp } from "@/contexts/AppContext";
import { Transaction } from "@/app/transactions";
import { updateSheetsRow, appendSheetsRow, deleteSheetsRow } from "@/app/sheets";
import { TRANSACTION_FIELDS, transactionToSheetsRow } from "@/app/transactionSchema";
import { toast } from "sonner";

export const useTransactionActions = () => {
	const { setTransactions, spreadsheetId } = useApp();

	const updateTransaction = useCallback(
		async (transaction: Transaction, updates: Partial<Transaction>) => {
			setTransactions((txs) =>
				txs.map((existing) => (existing.id === transaction.id ? { ...existing, ...updates } : existing)),
			);

			if (spreadsheetId) {
				try {
					let [[field, value]] = Object.entries(updates) as [
						keyof typeof TRANSACTION_FIELDS,
						Transaction[keyof Transaction],
					][];

					const schema = TRANSACTION_FIELDS[field];

					// transform if needed
					if ("toSheets" in schema) {
						value = (
							schema.toSheets as (
								value: string | number | boolean | undefined,
								tx: Transaction,
							) => string | number | boolean
						)(value, transaction);
					}

					await updateSheetsRow({
						spreadsheetId,
						filterValue: transaction.id,
						column: schema.sheetsColumnLetter,
						cellValue: value!,
					});
				} catch (error) {
					toast("Failed to update transaction in Sheets. Please refresh and try again.");
				}
			}
		},
		[spreadsheetId, setTransactions],
	);

	const addTransaction = useCallback(
		async (transaction: Transaction) => {
			setTransactions((txs) => [transaction, ...txs]);

			if (spreadsheetId) {
				try {
					await appendSheetsRow(spreadsheetId, transactionToSheetsRow(transaction));
				} catch (error) {
					toast("Failed to add transaction to Sheets. Please refresh and try again.");
				}
			}
		},
		[spreadsheetId, setTransactions],
	);

	const deleteTransaction = useCallback(
		async (transaction: Transaction) => {
			setTransactions((txs) => txs.filter((existing) => existing.id !== transaction.id));

			if (spreadsheetId) {
				try {
					await deleteSheetsRow({
						spreadsheetId,
						filterValue: transaction.id,
						filterColumn: TRANSACTION_FIELDS.id.sheetsColumnLetter,
					});
				} catch (error) {
					toast("Failed to delete transaction from Sheets. Please refresh and try again.");
				}
			}
		},
		[spreadsheetId, setTransactions],
	);

	return {
		updateTransaction,
		addTransaction,
		deleteTransaction,
	};
};
