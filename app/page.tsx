"use client";

import { useMemo, useState, PropsWithChildren } from "react";

import { ColumnDef, PaginationState } from "@tanstack/react-table";

import { Toaster } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CalendarView from "@/components/CalendarView";
import { columns as columnsData } from "@/components/DataTable/columns";
import { ModeToggle } from "@/components/ModeToggle";
import { DataTable } from "@/components/DataTable";
import { myTransactions, Transaction } from "./transactions";

import { GreenColor, useIsomorphicLayoutEffect } from "./utils";

import { gsap } from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ModeSwitcher } from "../components/ModeSwitcher";

gsap.registerPlugin(ScrollToPlugin, ScrollTrigger);

function TabContentItem({ children, id }: PropsWithChildren & { id: string }) {
	return (
		<TabsContent className="tab-content w-full" value={id} style={{ marginLeft: "auto", marginRight: "auto" }}>
			<div>
				<section className="gsap-container">
					<span className="gsap-line"></span>
					<div className="lg:mx-4">
						<div style={{ display: "flex", overflowX: "auto", justifyContent: "center" }}>{children}</div>
					</div>
				</section>
			</div>
		</TabsContent>
	);
}

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

	// solely used to ensure GSAP stays freshly registered, value meaningless and unused
	const [tab, setTab] = useState("");
	useIsomorphicLayoutEffect(() => {
		const ctx = gsap.context(() => {
			gsap.from(".gsap-line", {
				scrollTrigger: {
					trigger: ".gsap-container",
					pin: true,
					anticipatePin: 1,
					start: "top top+=16px",
					end: "+=100%",
				},
			});
		});

		return () => ctx.revert();
	}, [tab]);

	return (
		<>
			{/* night mode toggle */}
			<div style={{ position: "absolute", right: 0, top: 0 }}>
				<ModeSwitcher />
			</div>
			{/* banner */}
			<div
				className="text-center"
				style={{
					margin: "0 auto",
					pointerEvents: "none",
					fontSize: 20,
					letterSpacing: 1,
					color: GreenColor,
					fontWeight: 500,
					fontFamily: "sans-serif",
				}}
			>
				green
			</div>
			<div
				style={{
					border: `1px solid ${GreenColor}`,
					borderLeft: "150px solid transparent",
					borderRight: "150px solid transparent",
					position: "relative",
					top: 1,
					margin: "0 auto",
				}}
			/>
			{/* tabs */}
			<Tabs defaultValue="calendar" onValueChange={setTab}>
				<TabsList className="grid grid-cols-2 w-full">
					<TabsTrigger value="calendar">Calendar</TabsTrigger>
					<TabsTrigger value="transactions">Transactions</TabsTrigger>
				</TabsList>
				<TabContentItem id="calendar">
					<div style={{ display: "flex", overflowX: "auto", justifyContent: "center" }}>
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
					</div>
				</TabContentItem>
				<TabContentItem id="transactions">
					<DataTable {...{ columns, transactions, setTransactions, pagination, setPagination }} />
				</TabContentItem>
			</Tabs>
			<Toaster />
		</>
	);
}
