"use client";

import { useMemo, useRef, useState } from "react";

import { Toaster } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ColumnDef, PaginationState } from "@tanstack/react-table";

import CalendarView from "./CalendarView";
import TransactionsView from "./TransactionsView";

import { columns as columnsData } from "./columns";
import { myTransactions, Transaction } from "./transactions";

import { gsap } from "gsap";

import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useIsomorphicLayoutEffect } from "./utils";

gsap.registerPlugin(ScrollToPlugin, ScrollTrigger);

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

	// refreshes when tab changes
	const [tab, setTab] = useState("");
	useIsomorphicLayoutEffect(() => {
		const ctx = gsap.context(() => {
			gsap.from(".line-2", {
				scrollTrigger: {
					trigger: ".orange",
					// anticipatePin: 100,
					pin: true,
					start: "top top",
					end: "+=100%",
				},
			});
		});

		return () => ctx.revert();
	}, [tab]);

	return (
		<>
			<div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
				<Tabs defaultValue="calendar" className="testt" onValueChange={setTab}>
					<TabsList className="grid w-full grid-cols-2">
						<TabsTrigger value="calendar">Calendar</TabsTrigger>
						<TabsTrigger value="transactions">Transactions</TabsTrigger>
					</TabsList>
					<TabsContent className="tab-content" value="calendar" style={{ marginLeft: "auto", marginRight: "auto" }}>
						<div>
							<section className="panel orange">
								<span className="line2"></span>
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
							</section>
						</div>
					</TabsContent>
					<TabsContent className="tab-content" value="transactions">
						<div>
							<section className="panel orange">
								<span className="line2"></span>
								<TransactionsView {...{ columns, transactions, setTransactions, pagination, setPagination }} />
							</section>
						</div>
					</TabsContent>
				</Tabs>
			</div>
			<Toaster />
		</>
	);
}
