"use client";

import "./home.css";

import { useEffect, useMemo, useRef, useState } from "react";

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
import { ModeToggle } from "../components/ModeToggle";

gsap.registerPlugin(ScrollToPlugin, ScrollTrigger);

export default function Home() {
	const [onBoardPosition, setOnBoardPosition] = useState(0);

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

	useEffect(() => {
		if (onBoardPosition === 0) {
			// setTimeout(() => {
			// 	setOnBoardPosition((val) => val + 1);
			// }, 2500);
		}
	}, [onBoardPosition]);

	return (
		<>
			<div style={{ position: "absolute", right: 10, top: 10 }}>
				<ModeToggle />
			</div>
			<div
				className="text-center"
				style={{
					width: 698,
					margin: "0 auto",
					pointerEvents: "none",
					fontSize: 36,
					letterSpacing: 1,
					color: "#519c6b",
					fontWeight: 300,
					fontFamily: "sans-serif",
				}}
			>
				green
			</div>
			{onBoardPosition != -1 ? (
				<div
					className="flex items-center justify-center h-full"
					style={{ fontSize: 30, marginTop: "calc(50vh - 100px)" }}
				>
					{
						[<p style={{ animationName: "fadeInUp", animationDuration: "2s" }}>Welcome to green!</p>, <></>, <></>][
							onBoardPosition
						]
					}
				</div>
			) : (
				<div>
					<div
						style={{
							border: "1px solid #519c6b",
							borderLeft: "150px solid transparent",
							borderRight: "150px solid transparent",
							position: "relative",
							top: 1,
							width: 698,
							margin: "0 auto",
						}}
					/>
					<Tabs defaultValue="calendar" onValueChange={setTab}>
						<TabsList className="grid grid-cols-2" style={{ width: 698, margin: "0 auto" }}>
							<TabsTrigger value="calendar">Calendar</TabsTrigger>
							<TabsTrigger value="transactions">Transactions</TabsTrigger>
						</TabsList>
						<TabsContent className="tab-content" value="calendar" style={{ marginLeft: "auto", marginRight: "auto" }}>
							<div>
								<section className="gsap-container">
									<span className="gsap-line"></span>
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
								<section className="gsap-container">
									<span className="gsap-line"></span>
									<TransactionsView {...{ columns, transactions, setTransactions, pagination, setPagination }} />
								</section>
							</div>
						</TabsContent>
					</Tabs>
				</div>
			)}
			<Toaster />
		</>
	);
}
