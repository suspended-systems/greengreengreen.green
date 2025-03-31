"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import merge from "deepmerge";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { calcProjectedValue, Transaction } from "../../app/transactions";
import { DAY_MS } from "../../app/utils";

function Calendar({
	className,
	classNames,
	showOutsideDays = true,
	...props
}: {
	big?: boolean;
	startValue?: number;
	startDate?: Date;
	endDate?: Date;
	transactions?: Transaction[];
} & React.ComponentProps<typeof DayPicker>) {
	const { big, startValue, startDate, endDate, transactions } = props;
	const transactionsKeyedByDay = (transactions ?? []).reduce((map, tx) => {
		if (!tx.recurringEveryXDays) {
			return merge(map, { [new Date(tx.date).setHours(0, 0, 0, 0)]: [tx] });
		}

		/**
		 * Recurring, fill in from a month ago to end of calendar year
		 * could be improved to hook into rendering and only do the displayed month
		 */
		const daysFromRecurring: Record<number, Transaction[]> = {};
		let nextOccurrence = tx.date;

		const aMonthAgo = Date.now() - 31 * DAY_MS;
		while (nextOccurrence < aMonthAgo) {
			nextOccurrence += tx.recurringEveryXDays * DAY_MS;
		}

		const endOfYear = new Date(new Date().getFullYear() + 1, 0, 1).getTime();
		while (nextOccurrence < endOfYear) {
			const key = new Date(nextOccurrence).setHours(0, 0, 0, 0);
			daysFromRecurring[key] = [tx];
			nextOccurrence += tx.recurringEveryXDays * DAY_MS;
		}

		return merge(map, daysFromRecurring);
	}, {} as Record<number, Transaction[]>);

	const cellSize = big ? "24" : "16";

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
				head_cell: `text-muted-foreground rounded-md w-${cellSize} font-normal text-[0.8rem]`,
				row: "flex w-full mt-2",
				cell: cn(
					"relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent [&:has([aria-selected].day-range-end)]:rounded-r-md",
					props.mode === "range"
						? "[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
						: "[&:has([aria-selected])]:rounded-md",
				),
				day: cn(buttonVariants({ variant: "ghost" }), `size-${cellSize} p-0 font-normal aria-selected:opacity-100`),
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
					const dayTransactions = transactionsKeyedByDay[props.date.getTime()];

					const projectedValue =
						startValue &&
						startDate &&
						transactions &&
						calcProjectedValue({ startValue, startDate, endDate: props.date, transactions });

					const expenses = calcProjectedValue({
						startValue: 0,
						startDate: props.date,
						endDate: props.date,
						transactions: (transactions ?? []).filter((tx) => tx.amount < 0),
					}) as number;

					const incomes = calcProjectedValue({
						startValue: 0,
						startDate: props.date,
						endDate: props.date,
						transactions: (transactions ?? []).filter((tx) => tx.amount > -1),
					}) as number;

					// todo: get the transactions occuring on day by:
					// check any non recurring that have this day date
					// check any recurring which fall on this day date
					// instead of using `dayTransactions`

					return (
						<>
							<span style={{ position: "relative", overflow: "visible" }}>
								<p>{props.date.getDate()}</p>
							</span>

							<div style={{ position: "absolute", top: 64 }}>
								{dayTransactions && (
									<ul
										style={{
											fontFamily: "Monospace",
											fontSize: 4,
											fontWeight: "bolder",
											letterSpacing: 3,
											marginRight: -3, // counter act last letter spacing
										}}
									>
										{dayTransactions.map((tx, i) => (
											<li style={{ display: "inline" }} key={`transaction:${i}:${tx.name}`}>
												{tx.amount > -1 ? "🟩" : "🔴"}
											</li>
										))}
									</ul>
								)}

								{projectedValue && (
									<div
										style={{
											fontFamily: "Monospace",
											fontSize: 12,
											fontWeight: "bolder",
											// color: projectedValue === "--" ? "inheret" : projectedValue > -1 ? "green" : "red",
										}}
									>
										{projectedValue}
									</div>
								)}

								{incomes > 0 && (
									<div
										style={{
											fontFamily: "Monospace",
											fontSize: 12,
											fontWeight: "bolder",
											color: "green",
										}}
									>
										+{incomes}
									</div>
								)}

								{expenses < 0 && (
									<div
										style={{
											fontFamily: "Monospace",
											fontSize: 12,
											fontWeight: "bolder",
											color: "red",
										}}
									>
										{expenses}
									</div>
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

export { Calendar };
