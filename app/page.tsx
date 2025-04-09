"use client";

import { useMemo, useState } from "react";

import { Toaster } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ColumnDef, PaginationState } from "@tanstack/react-table";

import CalendarView from "./CalendarView";
import TransactionsView from "./TransactionsView";

import { columns as columnsData } from "./columns";
import { myTransactions, Transaction } from "./transactions";

export default function Home() {
	const [startValue, setStartValue] = useState(15000);
	const [startDate, setStartDate] = useState<Date | undefined>(new Date(new Date().setHours(0, 0, 0, 0)));
	const [endDate, setEndDate] = useState<Date | undefined>();
	const [transactions, setTransactions] = useState(myTransactions);

	const columns: ColumnDef<Transaction>[] = useMemo(() => columnsData(setTransactions), [setTransactions]);

	const [month, onMonthChange] = useState(new Date());

	const [pagination, setPagination] = useState({
		pageIndex: 0,
		pageSize: 10,
	} as PaginationState);

	return (
		<>
			<div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
				<Tabs defaultValue="calendar">
					<TabsList className="grid w-full grid-cols-2">
						<TabsTrigger value="calendar">Calendar</TabsTrigger>
						<TabsTrigger value="transactions">Transactions</TabsTrigger>
					</TabsList>
					<TabsContent value="calendar" style={{ marginLeft: "auto", marginRight: "auto" }}>
						<CalendarView
							{...{
								month,
								onMonthChange,
								transactions,
								startValue,
								setStartValue,
								startDate,
								setStartDate,
								endDate,
								setEndDate,
							}}
						/>
					</TabsContent>
					<TabsContent value="transactions">
						<TransactionsView {...{ columns, transactions, setTransactions, pagination, setPagination }} />
					</TabsContent>
				</Tabs>
			</div>
			<Toaster />
		</>
	);
}
