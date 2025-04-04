"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import CalendarView from "./CalendarView";
import TransactionsView from "./TransactionsView";
import { useState } from "react";
import { myTransactions } from "./transactions";

export default function Home() {
	const [startValue, setStartValue] = useState(15000);
	const [startDate, setStartDate] = useState<Date | undefined>(new Date(new Date().setHours(0, 0, 0, 0)));
	const [endDate, setEndDate] = useState<Date | undefined>();
	const [transactions, setTransactions] = useState(myTransactions);

	return (
		<div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 32 }}>
			<Tabs defaultValue="calendar">
				<TabsList className="grid w-full grid-cols-2">
					<TabsTrigger value="calendar">Calendar</TabsTrigger>
					<TabsTrigger value="transactions">Transactions</TabsTrigger>
				</TabsList>
				<TabsContent value="calendar" style={{ marginLeft: "auto", marginRight: "auto" }}>
					<CalendarView
						{...{ transactions, startValue, setStartValue, startDate, setStartDate, endDate, setEndDate }}
					/>
				</TabsContent>
				<TabsContent value="transactions">
					<TransactionsView {...{ transactions, setTransactions }} />
				</TabsContent>
			</Tabs>
		</div>
	);
}
