"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, HomeIcon } from "lucide-react";
import { DayPicker, useDayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { calcProjectedValue, getTransactionsOnDay, Transaction } from "../../app/transactions";
import { DAY_MS, formatMoney, GreenColor } from "../../app/utils";
import { endOfDay, endOfMonth, getDaysInMonth, isSameMonth, isSameYear, startOfDay, startOfMonth } from "date-fns";
import { partition } from "lodash";

function CalendarCustomized({
	className,
	classNames,
	showOutsideDays = true,
	...props
}: {
	month: Date;
	onMonthChange: React.Dispatch<React.SetStateAction<Date>>;
	startAmount?: number;
	startDate?: Date;
	endDate?: Date;
	transactions?: Transaction[];
} & React.ComponentProps<typeof DayPicker>) {
	const { startAmount, startDate, endDate, transactions, month, onMonthChange } = props;

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
				month: "flex flex-col",
				caption: "flex justify-center pt-1 relative items-center w-full",
				caption_label: "text-lg font-medium",
				nav: "flex items-center gap-1",
				nav_button: cn(
					buttonVariants({ variant: "outline" }),
					"absolute top-0 size-14 h-9 md:size-7 md:h-full bg-transparent p-0 opacity-50 hover:opacity-100",
				),
				nav_button_previous: "left-1",
				nav_button_next: "right-1",
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

					const backToToday = () => onMonthChange(new Date());

					const defaultCaption = formatCaption(props.displayMonth, { locale }) as string;
					// if it's the current year, don't show the year
					const caption = isSameYear(props.displayMonth, new Date())
						? defaultCaption.slice(0, -" 2025".length)
						: defaultCaption;

					const [incomingTxs, outgoingTxs] = partition(transactions ?? [], (tx) => tx.amount >= 0);
					const monthStart = startOfDay(startOfMonth(props.displayMonth));
					const monthEnd = endOfDay(endOfMonth(props.displayMonth));

					const totalIncoming = calcProjectedValue({
						startValue: 0,
						startDate: monthStart,
						endDate: monthEnd,
						transactions: incomingTxs ?? [],
					});
					const totalOutgoing = calcProjectedValue({
						startValue: 0,
						startDate: monthStart,
						endDate: monthEnd,
						transactions: outgoingTxs ?? [],
					});
					const net = totalIncoming + totalOutgoing;

					const dailyIncomingAverage = totalIncoming / getDaysInMonth(new Date());
					const dailyOutgoingAverage = totalOutgoing / getDaysInMonth(new Date());
					const dailyNetAverage = net / getDaysInMonth(new Date());

					return (
						<div className="flex flex-col items-center">
							<div
								className={`${classNames.caption_label}`}
								style={styles.caption_label}
								aria-live="polite"
								role="presentation"
								id={props.id}
							>
								{caption}
							</div>
							<div className="absolute" style={{ top: 30 }}>
								{(!isSameMonth(props.displayMonth, new Date()) || !isSameYear(props.displayMonth, new Date())) && (
									<Button variant="outline" onClick={backToToday} className="text-xs" style={{ height: 20 }}>
										<HomeIcon />
										Back to today
									</Button>
								)}
							</div>
							{/* Stats */}
							<div className="flex gap-4" style={{ marginTop: "20px", marginBottom: "10px" }}>
								<div>
									<p className="text-xs md:text-sm font-medium">
										<span className="hidden md:inline">Incoming</span>
										<span className="md:hidden inline">In</span>:{" "}
										<span style={{ color: GreenColor }}>+{formatMoney(totalIncoming)}</span>
									</p>
									<p className="text-xs">
										<span style={{ color: GreenColor }}>+{formatMoney(dailyIncomingAverage)}</span>
										<span className="hidden md:inline"> per day</span>
										<span className="md:hidden inline">/day</span>
									</p>
								</div>
								<div>
									<p className="text-xs md:text-sm font-medium">
										<span className="hidden md:inline">Outgoing</span>
										<span className="md:hidden inline">Out</span>:{" "}
										<span style={{ color: "red" }}>{formatMoney(totalOutgoing)}</span>
									</p>
									<p className="text-xs">
										<span style={{ color: "red" }}>{formatMoney(dailyOutgoingAverage)}</span>
										<span className="hidden md:inline"> per day</span>
										<span className="md:hidden inline">/day</span>
									</p>
								</div>
								<div>
									<p className="text-xs md:text-sm font-medium">
										Net:{" "}
										<span style={{ color: dailyNetAverage < 0 ? "red" : GreenColor }}>
											{dailyNetAverage < 0 ? "" : "+"}
											{formatMoney(net)}
										</span>
									</p>
									<p className="text-xs">
										<span style={{ color: -400 < 0 ? "red" : GreenColor }}>
											{dailyNetAverage < 0 ? "" : "+"}
											{formatMoney(dailyNetAverage)}
										</span>
										<span className="hidden md:inline"> per day</span>
										<span className="md:hidden inline">/day</span>
									</p>
								</div>
							</div>
						</div>
					);
				},

				DayContent: (props) => {
					const endOfDay = new Date(props.date.getTime() + DAY_MS - 1);

					const projectedValue =
						(startAmount &&
							startDate &&
							transactions &&
							calcProjectedValue({
								startValue: startAmount,
								startDate,
								endDate: endOfDay,
								transactions,
							})) ||
						undefined;
					const dayTransactions = getTransactionsOnDay(props.date, transactions ?? []);

					const incomeTransactions = dayTransactions.filter((tx) => tx.amount > 0);
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
											: projectedValue! > 0
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
									// hidden on mobile
									<div className="hidden md:block text-xs">{formatMoney(projectedValue)}</div>
								)}

								<div className="font-bold">
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
