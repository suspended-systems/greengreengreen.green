"use client";

import { useMemo, useState, useEffect, useLayoutEffect, PropsWithChildren } from "react";
import { useLocalStorage } from "react-use";

import { ColumnDef, PaginationState } from "@tanstack/react-table";

import { Toaster } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CalendarView from "@/app/CalendarView";
import { columns as columnsData } from "./TransactionsTable/columns";
import { TransactionsTable } from "./TransactionsTable";
import { defaultTransactions, Transaction } from "./transactions";

import { APP_NAME, GreenColor } from "./utils";

import { gsap } from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ModeSwitcher } from "./ModeSwitcher";

import dynamic from "next/dynamic";
import { CallBackProps } from "react-joyride";
const Tour = dynamic(() => import("./Tour"), { ssr: false });

gsap.registerPlugin(ScrollToPlugin, ScrollTrigger);

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

function TabContentItem({ children, name }: PropsWithChildren & { name: string }) {
	return (
		<TabsContent className="tab-content w-full" value={name} style={{ marginLeft: "auto", marginRight: "auto" }}>
			<div>
				<div className="lg:mx-4">
					<div style={{ display: "flex", overflowX: "auto", justifyContent: "center" }}>{children}</div>
				</div>
			</div>
		</TabsContent>
	);
}

export default function Home() {
	const [isTourComplete, setTourComplete] = useLocalStorage(`is${APP_NAME}TourComplete`, false);

	const [activeTab, setActiveTab] = useState("calendar");

	const [startValue, setStartValue] = useState(5000);
	const [startDate, setStartDate] = useState<Date | undefined>(new Date(new Date().setHours(0, 0, 0, 0)));
	const [endDate, setEndDate] = useState<Date | undefined>();

	const [transactions, setTransactions] = useState(defaultTransactions);

	const [month, onMonthChange] = useState(new Date());

	const columns: ColumnDef<Transaction>[] = useMemo(() => columnsData(setTransactions), [setTransactions]);
	const [pagination, setPagination] = useState({
		pageIndex: 0,
		pageSize: 10,
	} as PaginationState);

	useIsomorphicLayoutEffect(() => {
		const ctx = gsap.context(() => {
			// makes the scroll snap to and pin tab content
			gsap.from(".gsap-line", {
				scrollTrigger: {
					trigger: ".gsap-container",
					pin: true,
					anticipatePin: 1,
					// assuming tab height of 36, start right after the tabs
					start: "top top-=36px",
				},
			});
		});

		return () => ctx.revert();
	}, []);

	const handleJoyrideCallback = ({ index, action }: CallBackProps) => {
		const manageTransactionsIndex = 4;

		if (action === "next" && index === manageTransactionsIndex) {
			setActiveTab("transactions");
		}

		if (action === "reset") {
			setActiveTab("calendar");
			setTourComplete(true);
		}
	};

	return (
		<>
			<Tour isTourComplete={isTourComplete} callback={handleJoyrideCallback} />
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
				{APP_NAME}
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
			<section className="gsap-container">
				<span className="gsap-line"></span>
				<Tabs value={activeTab} onValueChange={setActiveTab}>
					<TabsList className="grid grid-cols-2 w-full">
						<TabsTrigger value="calendar">Calendar</TabsTrigger>
						<TabsTrigger value="transactions" className="tour-transactions">
							Transactions
						</TabsTrigger>
					</TabsList>
					<TabContentItem name="calendar">
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
					</TabContentItem>
					<TabContentItem name="transactions">
						<TransactionsTable {...{ columns, transactions, setTransactions, pagination, setPagination }} />
					</TabContentItem>
				</Tabs>
			</section>
			<Toaster />
		</>
	);
}
