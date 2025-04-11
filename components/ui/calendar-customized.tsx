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
	month: Date;
	onMonthChange: React.Dispatch<React.SetStateAction<Date>>;
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
					["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][date.getDay()].slice(0, 1),
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
				head_row: "flex py-4",
				head_cell: `text-muted-foreground rounded-md w-24 font-normal text-[0.8rem]`,
				row: "flex w-full",
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

					const incomeTransactions = dayTransactions.filter((tx) => tx.amount > -1);
					const incomesTotal = incomeTransactions.reduce((sum, tx) => sum + tx.amount, 0);

					const expenseTransactions = dayTransactions.filter((tx) => tx.amount < 0);
					const expensesTotal = expenseTransactions.reduce((sum, tx) => sum + tx.amount, 0);

					const isOutOfRange = !startDate || props.date.setHours(0, 0, 0, 0) < startDate.setHours(0, 0, 0, 0);

					return (
						<>
							<div
								style={{
									alignSelf: "start",
									position: "absolute",
									top: 18,
									height: 3,
									width: "100%",
									background:
										projectedValue === undefined || projectedValue === 0
											? "none"
											: projectedValue! > -1
											? props.activeModifiers.outside
												? "#7fbf7f"
												: "#519c6b"
											: props.activeModifiers.outside
											? "#ff7f7f"
											: "red",
								}}
							/>
							<span
								style={{
									overflow: "visible",
									alignSelf: "start",
									position: "relative",
									paddingRight: "16px",
									width: "100%",
									textAlign: "right",
								}}
							>
								{props.date.getDate()}
							</span>

							<div
								style={{
									position: "absolute",
									// 16 day height + 5 spacing
									top: 21,
									opacity: isOutOfRange ? 0.15 : props.activeModifiers.outside ? 0.5 : "inherit",
								}}
							>
								{projectedValue && <div style={{ fontSize: 12 }}>{formatMoney(projectedValue)}</div>}

								<div style={{ fontWeight: "bold" }}>
									{incomesTotal > 0 && <p style={{ color: "#519c6b" }}>+{formatMoney(incomesTotal)}</p>}
									{expensesTotal < 0 && <p style={{ color: "red" }}>{formatMoney(expensesTotal)}</p>}
								</div>
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
