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
		<div className="flex flex-col max-w-full px-2 pt-4 pb-4 mx-auto w-fit md:flex-row md:gap-8 md:px-4">
			{/* left panel */}
			<div className="flex-col items-center order-last tour-calendar-selected-day-details contents gap-4 md:order-first md:flex">
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
				className="mt-4 border tour-calendar bg-card rounded-xl md:mt-0"
			/>
		</div>
	);
}
