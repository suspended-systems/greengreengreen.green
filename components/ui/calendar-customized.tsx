"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Table } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { calcProjectedValue, getTransactionsOnDay, Transaction } from "../../app/transactions";
import { DAY_MS, formatMoney } from "../../app/utils";

function CalendarCustomized({
	className,
	classNames,
	showOutsideDays = true,
	...props
}: {
	startValue?: number;
	startDate?: Date;
	endDate?: Date;
	transactions?: Transaction[];
} & React.ComponentProps<typeof DayPicker>) {
	const { startValue, startDate, endDate, transactions } = props;

	return (
		<DayPicker
			formatters={{
				formatWeekdayName: (date) =>
					["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][date.getDay()],
			}}
			showOutsideDays={showOutsideDays}
			className={cn("p-3", className)}
			classNames={{
				months: "flex flex-col sm:flex-row gap-2",
				month: "flex flex-col gap-4",
				caption: "flex justify-center pt-1 relative items-center w-full",
				caption_label: "text-sm font-medium",
				nav: "flex items-center gap-1",
				nav_button: cn(
					buttonVariants({ variant: "outline" }),
					"size-7 bg-transparent p-0 opacity-50 hover:opacity-100",
				),
				nav_button_previous: "absolute left-1",
				nav_button_next: "absolute right-1",
				table: "w-full border-collapse space-x-1",
				head_row: "flex",
				head_cell: `text-muted-foreground rounded-md w-24 font-normal text-[0.8rem]`,
				row: "flex w-full",
				cell: cn(
					"relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent [&:has([aria-selected].day-range-end)]:rounded-r-md",
					props.mode === "range"
						? "[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
						: "[&:has([aria-selected])]:rounded-md",
				),
				day: cn(buttonVariants({ variant: "ghost" }), `size-24 p-0 font-normal aria-selected:opacity-100 border`),
				day_range_start: "day-range-start aria-selected:bg-primary aria-selected:text-primary-foreground",
				day_range_end: "day-range-end aria-selected:bg-primary aria-selected:text-primary-foreground",
				day_selected:
					"bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
				day_today: "bg-accent text-accent-foreground",
				day_outside: "day-outside text-muted-foreground aria-selected:text-muted-foreground",
				day_disabled: "text-muted-foreground opacity-50",
				day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
				day_hidden: "invisible",
				...classNames,
			}}
			components={{
				DayContent: (props) => {
					const dayTransactions = getTransactionsOnDay(props.date, transactions ?? []);

					const endOfDay = new Date(props.date.getTime() + DAY_MS - 1);

					const projectedValue =
						(startValue &&
							startDate &&
							transactions &&
							calcProjectedValue({
								startValue,
								startDate,
								endDate: endOfDay,
								transactions,
							})) ||
						undefined;

					// const expenses = calcProjectedValue({
					// 	startValue: 0,
					// 	startDate: props.date,
					// 	endDate: endOfDay,
					// 	transactions: (transactions ?? []).filter((tx) => tx.amount < 0),
					// }) as number;

					// const incomes = calcProjectedValue({
					// 	startValue: 0,
					// 	startDate: props.date,
					// 	endDate: endOfDay,
					// 	transactions: (transactions ?? []).filter((tx) => tx.amount > -1),
					// }) as number;

					const incomeTransactions = dayTransactions.filter((tx) => tx.amount > -1);
					const incomesTotal = incomeTransactions.reduce((sum, tx) => sum + tx.amount, 0);

					const expenseTransactions = dayTransactions.filter((tx) => tx.amount < 0);
					const expensesTotal = expenseTransactions.reduce((sum, tx) => sum + tx.amount, 0);

					const TxTable = () => {
						const totals = [incomesTotal, expensesTotal].filter(Boolean);

						return (
							totals.length > 0 && (
								<table style={props.activeModifiers.selected ? { zIndex: 999, background: "black" } : {}}>
									<thead>
										<tr>
											{totals.map((total, col) => {
												const isIncome = total > -1;

												return (
													<>
														{isIncome && <th key={`spacer:th:col${col}:`}></th>}
														<th
															key={`total:th:col${col}:`}
															style={{
																color: isIncome ? "green" : "red",
																textAlign: isIncome ? "right" : "left",
															}}
														>
															{isIncome && "+"}
															{formatMoney(total)}
														</th>
														{!isIncome && <th key={`spacer:th:col${col}:`}></th>}
													</>
												);
											})}
										</tr>
									</thead>
									{props.activeModifiers.selected && (
										<tbody>
											{Array.from({ length: Math.max(incomeTransactions.length, expenseTransactions.length) }).map(
												(_, row) => {
													return (
														<tr key={`tr:row${row}`}>
															{totals.map((total, offset) => {
																const isIncome = total > -1;

																const tx = isIncome ? incomeTransactions[row] : expenseTransactions[row];

																const NameCell = () => (
																	<td key={`tx-name:th:row${row}:col${offset}:`}>
																		{tx?.amount && (
																			<div style={{ textAlign: isIncome ? "right" : "left" }}>{tx?.name}</div>
																		)}
																	</td>
																);

																const ValueCell = () => (
																	<td key={`tx-value:th:row${row}:col${offset}:`}>
																		{tx?.amount && (
																			<div style={{ textAlign: isIncome ? "right" : "left" }}>
																				<span style={{ color: isIncome ? "green" : "red" }}>
																					{isIncome && "+"}
																					{formatMoney(tx.amount)}
																				</span>
																			</div>
																		)}
																	</td>
																);

																return isIncome ? (
																	<>
																		<NameCell />
																		<ValueCell />
																	</>
																) : (
																	<>
																		<ValueCell />
																		<NameCell />
																	</>
																);
															})}
														</tr>
													);
												},
											)}
										</tbody>
									)}
								</table>
							)
						);
					};

					// todo: get the transactions occuring on day by:
					// check any non recurring that have this day date
					// check any recurring which fall on this day date
					// instead of using `dayTransactions`

					return (
						<>
							<span
								style={{
									alignSelf: "start",
									position: "relative",
									paddingRight: "16px",
									textAlign: "right",
									overflow: "visible",
									width: "100%",
									background:
										projectedValue === undefined || projectedValue === 0
											? "inherit"
											: projectedValue! > -1
											? props.activeModifiers.outside
												? "#7fbf7f"
												: "green"
											: props.activeModifiers.outside
											? "#ff7f7f"
											: "red",
								}}
							>
								<span>{props.date.getDate()}</span>
							</span>

							<div
								style={{
									position: "absolute",
									// 16 day height + 5 spacing
									top: 21,
									opacity: props.activeModifiers.outside ? "0.5" : "inherit",
								}}
							>
								{projectedValue && (
									<div
										style={{
											// fontFamily: "Monospace",
											fontSize: 12,
											// fontWeight: "bolder",
											// color: projectedValue === "--" ? "inherit" : projectedValue > -1 ? "green" : "red",
										}}
									>
										{formatMoney(projectedValue)}
									</div>
								)}

								<TxTable />

								{/* {expenses < 0 && (
									<span
										style={{
											// fontFamily: "Monospace",
											fontSize: 12,
											fontWeight: "bolder",
											color: "red",
										}}
									>
										-${Math.abs(expenses)}
									</span>
								)} */}
							</div>
						</>
					);
				},
				IconLeft: ({ className, ...props }) => <ChevronLeft className={cn("size-4", className)} {...props} />,
				IconRight: ({ className, ...props }) => <ChevronRight className={cn("size-4", className)} {...props} />,
			}}
			{...props}
		/>
	);
}

export { CalendarCustomized };
