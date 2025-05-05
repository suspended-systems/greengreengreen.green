"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, HomeIcon, Table } from "lucide-react";
import { CaptionLabel, CaptionNavigation, DayPicker, useDayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { calcProjectedValue, getTransactionsOnDay, Transaction } from "../../app/transactions";
import { DAY_MS, formatMoney, GreenColor } from "../../app/utils";

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
	const { startValue, startDate, endDate, transactions, month, onMonthChange } = props;

	return (
		<DayPicker
			// numberOfMonths={2}
			fixedWeeks
			formatters={{
				formatWeekdayName: (date) =>
					// display just the first letter of each day
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
				nav_button_previous: "absolute left-1 size-14 md:size-7",
				nav_button_next: "absolute right-1 size-14 md:size-7",
				table: "w-full border-collapse space-x-1",
				head_row: "flex py-4",
				head_cell: `text-muted-foreground rounded-md w-12 md:w-24 font-normal text-[0.8rem]`,
				row: "flex w-full",
				cell: cn(
					"relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent [&:has([aria-selected].day-range-end)]:rounded-r-md",
					props.mode === "range"
						? "[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
						: "[&:has([aria-selected])]:rounded-md",
				),
				day: cn(buttonVariants({ variant: "ghost" }), `size-12 md:size-24 p-0 font-normal aria-selected:opacity-100`),
				day_range_start: "day-range-start aria-selected:bg-primary aria-selected:text-primary-foreground",
				day_range_end: "day-range-end aria-selected:bg-primary aria-selected:text-primary-foreground",
				day_selected:
					"bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
				day_today: "tour-calendar-today bg-accent text-accent-foreground",
				day_outside: "day-outside text-muted-foreground",
				day_disabled: "text-muted-foreground opacity-50",
				day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
				day_hidden: "invisible",
				...classNames,
			}}
			components={{
				CaptionLabel: (props) => {
					const {
						locale,
						classNames,
						styles,
						formatters: { formatCaption },
					} = useDayPicker();

					const resetMonth = () => onMonthChange(new Date());

					return (
						<div className="flex flex-col items-center">
							<div
								className={`${classNames.caption_label}`}
								style={styles.caption_label}
								aria-live="polite"
								role="presentation"
								id={props.id}
							>
								{formatCaption(props.displayMonth, { locale })}
							</div>
							<div className="absolute" style={{ top: 28 }}>
								{props.displayMonth.getMonth() !== new Date().getMonth() && (
									<Button variant="outline" onClick={resetMonth} className="text-xs" style={{ height: 20 }}>
										<HomeIcon />
										Back to today
									</Button>
								)}
							</div>
						</div>
					);
				},

				DayContent: (props) => {
					const dayTransactions = getTransactionsOnDay(props.date, transactions ?? []);

					const endOfDay = new Date(props.date.getTime() + DAY_MS - 1);

					// Only project values for days starting at our start date. Transactions and a start value must exist as well.
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
							{/* green or red line */}
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
												: GreenColor
											: props.activeModifiers.outside
											? "#ff7f7f"
											: "red",
								}}
							/>
							{/* day # */}
							<span
								style={{
									overflow: "visible",
									alignSelf: "start",
									position: "relative",
									// paddingRight: "16px",
									width: "100%",
									// textAlign: "right",
								}}
								className="text-center md:text-right md:pr-[16px]"
							>
								{props.date.getDate()}
							</span>
							{/* projected value & income/expense sums */}
							<div
								style={{
									position: "absolute",
									// 16 day height + 5 spacing
									top: 21,
									// style the opacity dependent on selection/outside day so it matches the other styling of days
									opacity: props.activeModifiers.selected
										? "inherit"
										: isOutOfRange
										? 0.15
										: props.activeModifiers.outside
										? 0.5
										: "inherit",
								}}
							>
								{projectedValue && (
									// <>
									// 	{/* On mobile, drop the decimals unless selected */}
									// 	<div className="block md:hidden text-[8px]">
									// 		{/* Round down remaining */}
									// 		{formatMoney(props.activeModifiers.selected ? projectedValue : Math.floor(projectedValue)).slice(
									// 			0,
									// 			props.activeModifiers.selected ? Infinity : -3,
									// 		)}
									// 	</div>
									// 	<div className="hidden md:block text-xs">{formatMoney(projectedValue)}</div>
									// </>
									// hidden on mobile
									<div className="hidden md:block text-xs">{formatMoney(projectedValue)}</div>
								)}

								<div style={{ fontWeight: "bold" }}>
									{incomesTotal > 0 && (
										<>
											{/* On mobile, drop the decimals */}
											<p className="block md:hidden text-[10px]" style={{ color: GreenColor }}>
												{/* Round down income */}+{formatMoney(Math.floor(incomesTotal)).slice(0, -3)}
											</p>
											<p className="hidden md:block text-sm" style={{ color: GreenColor }}>
												+{formatMoney(incomesTotal)}
											</p>
										</>
									)}
									{expensesTotal < 0 && (
										<>
											{/* On mobile, drop the decimals */}
											<p className="block md:hidden text-[10px]" style={{ color: "red" }}>
												{/* Round up expenses, because it's negative we do floor */}
												{formatMoney(Math.floor(expensesTotal)).slice(0, -3)}
											</p>
											<p className="hidden md:block text-sm" style={{ color: "red" }}>
												{formatMoney(expensesTotal)}
											</p>
										</>
									)}
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
