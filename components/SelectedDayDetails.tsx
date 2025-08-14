import { BotMessageSquareIcon } from "lucide-react";
import { toast } from "sonner";
import { v4 as uuid } from "uuid";
import { useState } from "react";

import ChatWindow from "@/components/ChatWindow";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { useApp } from "@/contexts/AppContext";
import { calcProjectedValue, getTransactionsOnDay, Transaction } from "@/app/transactions";
import { DAY_MS, formatMoney, GreenColor } from "@/app/utils";
import { updateSheetsRow } from "@/app/sheets";
import { TRANSACTION_FIELDS, txRRule } from "@/app/transactionSchema";
import { useTransactionActions } from "@/hooks/useTransactionActions";

export default function SelectedDayDetails() {
	const { transactions, setTransactions, startAmount, startDate, endDate } = useApp();
	const enabledTransactions = transactions.filter((tx) => !tx.disabled);
	const dayTransactions = endDate && getTransactionsOnDay(endDate, enabledTransactions);

	return (
		<div className="flex flex-col justify-center items-center py-4 order-3 md:order-2">
			{endDate ? (
				dayTransactions && dayTransactions.length > 0 ? (
					<>
						<div className="font-medium text-sm">
							{endDate.toLocaleDateString(Intl.getCanonicalLocales(), {
								month: "long",
								weekday: "long",
								day: "numeric",
							})}
						</div>
						{startAmount && startDate && transactions && (
							<div className="block md:hidden text-sm">
								{formatMoney(
									calcProjectedValue({
										startValue: startAmount,
										startDate,
										endDate: new Date(endDate.getTime() + DAY_MS - 1),
										transactions,
									}),
								)}
							</div>
						)}
						<table className="border border-transparent" style={{ borderCollapse: "separate", borderSpacing: 8 }}>
							<tbody>
								{dayTransactions
									.sort((a, b) =>
										// both negative, reverse order so bigger expense first
										a.amount < 0 && b.amount < 0
											? // ascending
											  a.amount - b.amount
											: // descending
											  b.amount - a.amount,
									)
									.map((tx) => (
										<tr key={`tx:${tx.id}`}>
											<td
												className="text-right"
												style={{ color: tx.amount > 0 ? GreenColor : "red", fontWeight: "bold" }}
											>
												{tx.amount > 0 ? "+" : ""}
												{formatMoney(tx.amount)}
											</td>
											<td className="flex font-medium">
												{tx.name}
												{tx.amount < 0 && tx.freq != null && <ChatWindowPopover tx={tx} />}
											</td>
										</tr>
									))}
							</tbody>
						</table>
					</>
				) : (
					<>
						<p className="text-sm opacity-50">
							No transactions on{" "}
							{endDate.toLocaleDateString(Intl.getCanonicalLocales(), {
								month: "long",
								weekday: "long",
								day: "numeric",
							})}
						</p>
						{startAmount && startDate && transactions && (
							<div className="block md:hidden text-sm opacity-50">
								{formatMoney(
									calcProjectedValue({
										startValue: startAmount,
										startDate,
										endDate: new Date(endDate.getTime() + DAY_MS - 1),
										transactions,
									}),
								)}
							</div>
						)}
					</>
				)
			) : (
				<p className="italic text-sm opacity-50">Select a date to view its transactions</p>
			)}
		</div>
	);
}

function ChatWindowPopover({ tx }: { tx: Transaction }) {
	const { setTransactions, spreadsheetId } = useApp();
	const { addTransaction } = useTransactionActions();
	const [isPopoverOpen, setPopoverOpen] = useState(false);

	return (
		<Popover open={isPopoverOpen} onOpenChange={setPopoverOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="ghost"
					className="relative justify-start text-xs text-left font-normal h-6"
					style={{ paddingInline: 4, marginLeft: 3, bottom: 3 }}
				>
					<BotMessageSquareIcon />
				</Button>
			</PopoverTrigger>

			<PopoverContent className="w-auto p-0" align="end">
				<ChatWindow
					initialPayload={{
						name: tx.name,
						amount: `$${Math.abs(tx.amount)}`,
						freq: txRRule(tx).toText(),
					}}
					onSelectAlternative={async (data) => {
						setPopoverOpen(false);

						const transaction: Transaction = {
							id: uuid(),
							name: data.name,
							amount: data.price * -1,
							date: tx.date,
							...(tx.freq && { freq: tx.freq, interval: tx.interval }),
						};

						/**
						 * Add the new transaction
						 */
						addTransaction(transaction);

						/**
						 * Disable the one we're replacing
						 */
						setTransactions((value) => value.map((t) => (t.id === tx.id ? { ...t, disabled: true } : t)));

						if (spreadsheetId) {
							await updateSheetsRow({
								spreadsheetId,
								filterValue: tx.id,
								column: TRANSACTION_FIELDS.disabled.sheetsColumnLetter,
								cellValue: false,
							});
						}

						toast(`Disabled existing transaction "${tx.name}"`, {
							// This runs once the success-toast's duration elapses
							onAutoClose() {
								toast(`Added new transaction "${transaction.name}"`);
							},
						});
					}}
				/>
			</PopoverContent>
		</Popover>
	);
}
