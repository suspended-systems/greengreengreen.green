"use client";

import { Dispatch, SetStateAction } from "react";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { CalendarCustomized } from "@/components/ui/calendar-customized";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { getTransactionsOnDay, Transaction } from "../app/transactions";
import { formatMoney, GreenColor } from "../app/utils";

export default function CalendarView({
	month,
	onMonthChange,
	transactions,
	startValue,
	setStartValue,
	startDate,
	setStartDate,
	endDate,
	setEndDate,
}: {
	month: Date;
	onMonthChange: Dispatch<SetStateAction<Date>>;
	transactions: Transaction[];
	startValue: number;
	setStartValue: Dispatch<SetStateAction<number>>;
	startDate: Date | undefined;
	setStartDate: Dispatch<SetStateAction<Date | undefined>>;
	endDate: Date | undefined;
	setEndDate: Dispatch<SetStateAction<Date | undefined>>;
}) {
	const enabledTransactions = transactions.filter((tx) => !tx.disabled);

	const dayTransactions = endDate && getTransactionsOnDay(endDate, enabledTransactions);

	const startDateIsToday = startDate && startDate.setHours(0, 0, 0, 0) === new Date().setHours(0, 0, 0, 0);

	return (
		<div className="flex gap-8">
			{/* left panel */}
			<div className="flex flex-col gap-4">
				<div className="flex gap-2 items-center text-sm">
					{/* starting values */}
					<span style={{ whiteSpace: "nowrap" }}>Starting on</span>
					<Popover>
						<PopoverTrigger asChild>
							<Button
								variant="outline"
								className={cn("justify-start text-left font-normal", !startDate && "text-muted-foreground")}
								style={{ width: 120 }}
							>
								<CalendarIcon />
								{startDate ? startDateIsToday ? "today" : startDate.toLocaleDateString() : <span>Select</span>}
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-auto p-0" align="start">
							<Calendar
								mode="single"
								selected={startDate}
								onSelect={setStartDate}
								initialFocus
								className="rounded-md border shadow"
							/>
						</PopoverContent>
					</Popover>
					with
					<span className="input-symbol">
						<Input
							type="number"
							onChange={(e) => setStartValue(parseFloat(e.target.value))}
							value={startValue}
							placeholder="5000"
							style={{
								color: startValue > 0 ? GreenColor : startValue < 0 ? "red" : "inherit",
								width: 120,
							}}
						/>
					</span>
				</div>
				{/* selected day transactions */}
				<div className="flex flex-col justify-center items-center py-4">
					{endDate ? (
						dayTransactions && dayTransactions.length > 0 ? (
							<>
								<div className="font-medium italic">
									{endDate.toLocaleDateString(Intl.getCanonicalLocales(), {
										month: "long",
										weekday: "long",
										day: "numeric",
									})}
								</div>
								<table
									className="border border-transparent border-spacing-4"
									style={{ borderCollapse: "separate", borderSpacing: 8 }}
								>
									<tbody>
										{dayTransactions.map((tx, i) => (
											<tr key={`tx:${i}`}>
												<td
													className="text-right"
													style={{ color: tx.amount > -1 ? GreenColor : "red", fontWeight: "bold" }}
												>
													{tx.amount > -1 ? "+" : ""}
													{formatMoney(tx.amount)}
												</td>
												<td style={{ fontWeight: 500 }}>{tx.name}</td>
											</tr>
										))}
									</tbody>
								</table>
							</>
						) : (
							<p style={{ opacity: 0.5, fontStyle: "italic" }}>
								No transactions on{" "}
								{endDate.toLocaleDateString(Intl.getCanonicalLocales(), {
									month: "long",
									weekday: "long",
									day: "numeric",
								})}
							</p>
						)
					) : (
						<p style={{ opacity: 0.5, fontStyle: "italic" }}>Select a date to view its transactions</p>
					)}
				</div>
			</div>
			{/* right panel */}
			<CalendarCustomized
				{...{ month, onMonthChange, startValue, startDate, endDate, transactions: enabledTransactions }}
				mode="single"
				selected={endDate}
				onSelect={setEndDate}
				className="rounded-md border"
			/>
		</div>
	);
}
