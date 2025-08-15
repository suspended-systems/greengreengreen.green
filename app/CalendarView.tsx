"use client";

import { Dispatch, SetStateAction } from "react";

import { useApp } from "@/contexts/AppContext";

import { CalendarCustomized } from "@/components/ui/calendar-customized";
import StartingValuesPanel from "@/components/StartingValuesPanel";
import SelectedDayDetails from "@/components/SelectedDayDetails";

/**
 * Additional styling exists in `@/components/ui/calendar-customized`
 */
export default function CalendarView({
	month,
	onMonthChange,
}: {
	month: Date;
	onMonthChange: Dispatch<SetStateAction<Date>>;
}) {
	const { transactions, startAmount, startDate, endDate, setEndDate } = useApp();
	const enabledTransactions = transactions.filter((tx) => !tx.disabled);

	return (
		<div className="mx-auto flex w-fit max-w-full flex-col px-2 pt-4 pb-4 md:flex-row md:gap-8 md:px-4">
			{/* left panel */}
			<div className="tour-calendar-selected-day-details order-last contents flex-col items-center gap-4 md:order-first md:flex">
				<StartingValuesPanel />
				{/* selected day transactions */}
				<SelectedDayDetails />
			</div>
			{/* right panel */}
			<CalendarCustomized
				{...{ month, onMonthChange, startAmount, startDate, endDate, transactions: enabledTransactions }}
				mode="single"
				selected={endDate}
				onSelect={setEndDate}
				className="tour-calendar bg-card mt-4 rounded-xl border md:mt-0"
			/>
		</div>
	);
}
