"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import CalendarView from "./CalendarView";
import TransactionsView from "./TransactionsView";
import { useState } from "react";

export default function Home() {
	const [startValue, setStartValue] = useState(5000);
	const [startDate, setStartDate] = useState<Date | undefined>(new Date(new Date().setHours(0, 0, 0, 0)));
	const [endDate, setEndDate] = useState<Date | undefined>();

	return (
		<div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 32 }}>
			Green
			<Tabs defaultValue="calendar">
				<TabsList className="grid w-full grid-cols-2">
					<TabsTrigger value="calendar">Calendar</TabsTrigger>
					<TabsTrigger value="transactions">Transactions</TabsTrigger>
				</TabsList>
				<TabsContent value="calendar">
					<CalendarView {...{ startValue, setStartValue, startDate, setStartDate, endDate, setEndDate, }} />
				</TabsContent>
				<TabsContent value="transactions">
					<TransactionsView />
				</TabsContent>
			</Tabs>
		</div>
	);
}
