"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, PropsWithChildren } from "react";
import { useLocalStorage } from "react-use";
import { CalendarDaysIcon, CircleDollarSignIcon } from "lucide-react";

import { ColumnDef, PaginationState } from "@tanstack/react-table";

import { Toaster } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CalendarView from "@/app/CalendarView";
import { columns as columnsData } from "./TransactionsTable/columns";
import { TransactionsTable } from "./TransactionsTable";
import { ModeSwitcher } from "./ModeSwitcher";

import { defaultTransactions, Transaction } from "./transactions";
import { APP_NAME, GreenColor } from "./utils";

import { CallBackProps } from "react-joyride";
const Tour = dynamic(() => import("./Tour"), { ssr: false });

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
				💸 {APP_NAME}
			</div>
			<div
				style={{
					border: `1px solid ${GreenColor}`,
					borderLeft: "150px solid transparent",
					borderRight: "150px solid transparent",
					position: "relative",
					top: 1, //3,
				}}
				className="mx-auto mb-4 md:mb-0"
			/>
			{/* tabs */}
			<section className="gsap-tab-container">
				<span className="gsap-tab-trigger-line"></span>
				<Tabs value={activeTab} onValueChange={setActiveTab}>
					<TabsList className="grid grid-cols-2 w-full fixed md:relative bottom-0 h-18 md:h-9">
						<TabsTrigger value="calendar" className="flex flex-col md:flex-row text-xs md:text-sm">
							<CalendarDaysIcon className="size-8 md:size-4" />
							Calendar
						</TabsTrigger>
						<TabsTrigger
							value="transactions"
							className="tour-transactions flex flex-col md:flex-row text-xs md:text-sm"
						>
							<CircleDollarSignIcon className="size-8 md:size-4" />
							Transactions
						</TabsTrigger>
					</TabsList>

					<TabContentItem name="calendar">
						<CalendarView
							{...{
								month,
								onMonthChange,
								startValue,
								setStartValue,
								startDate,
								setStartDate,
								endDate,
								setEndDate,
								transactions,
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

function TabContentItem({ children, name }: PropsWithChildren & { name: string }) {
	return (
		<TabsContent className="tab-content mx-auto w-full" value={name}>
			{/* -15 instead of -16 to account for the green bar */}
			<div className={`flex justify-center lg:mx-4 h-[calc(100vh-15px)] md:h-[calc(100vh-16px)]`}>
				<div className="flex justify-start" style={{ overflowX: "auto" }}>
					{children}
				</div>
			</div>
		</TabsContent>
	);
}
