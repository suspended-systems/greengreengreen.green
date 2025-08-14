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
		<div className="flex flex-col md:flex-row md:gap-8 mx-auto w-fit max-w-full pt-4 px-2 md:px-4 pb-4">
			{/* left panel */}
			<div className="tour-calendar-selected-day-details contents md:flex flex-col gap-4 items-center order-last md:order-first">
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
				className="tour-calendar rounded-xl border mt-4 md:mt-0 bg-card"
			/>
		</div>
	);
}
