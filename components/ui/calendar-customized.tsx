"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import merge from "deepmerge";

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
				row: "flex w-full mt-2",
				cell: cn(
					"relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent [&:has([aria-selected].day-range-end)]:rounded-r-md",
					props.mode === "range"
						? "[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
						: "[&:has([aria-selected])]:rounded-md",
				),
				day: cn(buttonVariants({ variant: "ghost" }), `size-24 p-0 font-normal aria-selected:opacity-100`),
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

					const projectedValue =
						(startValue &&
							startDate &&
							transactions &&
							calcProjectedValue({ startValue, startDate, endDate: props.date, transactions })) ||
						undefined;

					const expenses = calcProjectedValue({
						startValue: 0,
						startDate: props.date,
						endDate: new Date(props.date.getTime() + DAY_MS - 1),
						transactions: (transactions ?? []).filter((tx) => tx.amount < 0),
					}) as number;

					const incomes = calcProjectedValue({
						startValue: 0,
						startDate: props.date,
						endDate: new Date(props.date.getTime() + DAY_MS - 1),
						transactions: (transactions ?? []).filter((tx) => tx.amount > -1),
					}) as number;

					// todo: get the transactions occuring on day by:
					// check any non recurring that have this day date
					// check any recurring which fall on this day date
					// instead of using `dayTransactions`

					return (
						<>
							<span
								style={{
									position: "relative",
									overflow: "visible",
									width: "100%",
									background:
										projectedValue === undefined || projectedValue === 0
											? "inherit"
											: projectedValue! > -1
											? "green"
											: "red",
								}}
							>
								<p>{props.date.getDate()}</p>
							</span>

							<div
								style={{ position: "absolute", top: 72, opacity: props.activeModifiers.outside ? "0.5" : "inherit" }}
							>
								{projectedValue && (
									<div
										style={{
											marginTop: -16,
											marginBottom: 5,
											fontFamily: "Monospace",
											fontSize: 12,
											// fontWeight: "bolder",
											// color: projectedValue === "--" ? "inherit" : projectedValue > -1 ? "green" : "red",
										}}
									>
										{formatMoney(projectedValue)}
									</div>
								)}

								{dayTransactions && (
									<div
										style={{
											// position: "absolute",
											// top: -16,
											// marginTop: -16,
											// marginBottom: 5,
											// textAlign: "left",
											fontFamily: "Monospace",
											fontSize: 7,
											fontWeight: "bolder",
											letterSpacing: 3,
											marginRight: -3, // counter act last letter spacing
										}}
									>
										<ul style={{ display: "inline", marginBottom: 5 }}>
											{dayTransactions
												.filter((tx) => tx.amount > -1)
												.map((tx, i) => (
													<li style={{ display: "inline" }} key={`transaction:${i}:${tx.name}`}>
														🟩
													</li>
												))}
										</ul>
										<ul style={{ display: "inline" }}>
											{dayTransactions
												.filter((tx) => tx.amount < 0)
												.map((tx, i) => (
													<li style={{ display: "inline" }} key={`transaction:${i}:${tx.name}`}>
														🔴
													</li>
												))}
										</ul>
									</div>
								)}

								{incomes > 0 && (
									<span
										style={{
											marginRight: 5,
											fontFamily: "Monospace",
											fontSize: 12,
											fontWeight: "bolder",
											color: "green",
										}}
									>
										+${incomes}
									</span>
								)}

								{expenses < 0 && (
									<span
										style={{
											fontFamily: "Monospace",
											fontSize: 12,
											fontWeight: "bolder",
											color: "red",
										}}
									>
										-${Math.abs(expenses)}
									</span>
								)}
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
