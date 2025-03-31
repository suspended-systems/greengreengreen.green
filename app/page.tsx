"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import CalendarView from "./CalendarView";
import TransactionsView from "./TransactionsView";

export default function Home() {
	return (
		<div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 32 }}>
			Green
			<Tabs defaultValue="calendar" className="w-[400px]">
				<TabsList className="grid w-full grid-cols-2">
					<TabsTrigger value="calendar">Calendar</TabsTrigger>
					<TabsTrigger value="transactions">Transactions</TabsTrigger>
				</TabsList>
				<TabsContent value="calendar">
					<CalendarView />
				</TabsContent>
				<TabsContent value="transactions">
					<TransactionsView />
				</TabsContent>
			</Tabs>
		</div>
	);
}
