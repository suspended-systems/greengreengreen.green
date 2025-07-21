"use client";

import dynamic from "next/dynamic";
import { signOut, useSession } from "next-auth/react";
import { useMemo, useState, useEffect } from "react";
import { useLocalStorage } from "react-use";
import useSWRImmutable from "swr/immutable";
import { toast } from "sonner";
import { CalendarDaysIcon, CircleDollarSignIcon, Loader2, TrendingUpIcon } from "lucide-react";

import { ColumnDef, PaginationState } from "@tanstack/react-table";

import { Toaster } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import CalendarView from "./CalendarView";
import ForecastView from "./ForecastView";
import { columns as columnsData } from "./TransactionsView/tableColumns";
import { TransactionsView } from "./TransactionsView/TransactionsView";
import { defaultStartingDate, defaultStartingValue, defaultTransactions, Transaction } from "./transactions";

import { CallBackProps } from "react-joyride";
const Tour = dynamic(() => import("@/components/Tour"), { ssr: false });

import getSheetsData from "./sheets";

export default function Home() {
	const { data: session, status } = useSession();

	/**
	 * Load Sheets data
	 */
	const { isLoading } = useSWRImmutable(
		session?.accessToken ? "sheetsData" : null,
		() => getSheetsData({ tz: Intl.DateTimeFormat().resolvedOptions().timeZone }),
		{
			onError: () => toast("⚠️ Error getting sheets data. Please try refreshing the page.", { duration: Infinity }),
			onSuccess: (data) => {
				if (!data) {
					// user still needs to complete set up
					setHideLoader(true);
					setTimeout(() => setShowContent(true), 200);
					return;
				}

				setSpreadsheetId(data.sheet.id);

				if (data.startDate) setStartDate(data.startDate);
				if (data.startAmount) setStartAmount(data.startAmount);
				setTransactions(data.transactions);

				if (data.malformedTransactions.length > 0) {
					toast(`⚠️ Sheet contains ${data.malformedTransactions.length} malformed transaction(s)`);
				}

				setHideLoader(true);
				setTimeout(() => setShowContent(true), 200);
			},
		},
	);

	const [isDemoWarningClosed, setIsDemoWarningClosed] = useState(false);
	const [isTourComplete, setTourComplete] = useLocalStorage(`isGreenTourComplete`, false);
	const [activeTab, setActiveTab] = useState("calendar");
	const [startAmount, setStartAmount] = useState(defaultStartingValue);
	const [startDate, setStartDate] = useState<Date | undefined>(defaultStartingDate);
	const [endDate, setEndDate] = useState<Date | undefined>();
	const [transactions, setTransactions] = useState(defaultTransactions);
	const [month, onMonthChange] = useState(new Date());
	const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 } as PaginationState);
	const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null);
	const [showContent, setShowContent] = useState(false);
	const [hideLoader, setHideLoader] = useState(false);

	const columns: ColumnDef<Transaction>[] = useMemo(
		() => columnsData({ spreadsheetId, setTransactions }),
		[spreadsheetId, setTransactions],
	);

	const handleJoyrideCallback = ({ index, action }: CallBackProps) => {
		const manageTransactionsIndex = 4;
		if (action === "next" && index === manageTransactionsIndex) {
			setIsDemoWarningClosed(true);
			setActiveTab("transactions");
		}

		if (action === "reset") {
			setIsDemoWarningClosed(false);
			setTourComplete(true);
		}
	};

	useEffect(() => {
		if (status === "authenticated" && !isLoading) {
			setHideLoader(true);
			setTimeout(() => setShowContent(true), 200);
		} else if (status === "unauthenticated") {
			setHideLoader(true);
			setTimeout(() => setShowContent(true), 200);
		}
	}, [status, isLoading]);

	return (
		<>
			{/* Joyride Tour */}
			<Tour isTourComplete={isTourComplete} callback={handleJoyrideCallback} />

			{/* tabs */}
			<Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col gap-0">
				<TabsList
					className="
       sticky bottom-0 z-10           /* stick to viewport bottom */
       grid grid-cols-3 w-full        /* three columns, full width */
       order-1 md:order-0             /* bottom on mobile, top on md+ */
       h-18 md:h-9                    /* mobile: 4.5rem, desktop: 2.25rem */
       pb-[env(safe-area-inset-bottom)] /* iOS safe-area inset */
	   md:rounded-t-none
     "
				>
					<TabsTrigger value="calendar" className="flex flex-col md:flex-row text-xs md:text-sm">
						<CalendarDaysIcon className="size-8 md:size-4" />
						Calendar
					</TabsTrigger>
					<TabsTrigger value="forecast" className="flex flex-col md:flex-row text-xs md:text-sm">
						<TrendingUpIcon className="size-8 md:size-4" />
						Forecast
					</TabsTrigger>
					<TabsTrigger value="transactions" className="tour-transactions flex flex-col md:flex-row text-xs md:text-sm">
						<CircleDollarSignIcon className="size-8 md:size-4" />
						Transactions
					</TabsTrigger>
				</TabsList>

				<div
					className="
          flex-1 overflow-y-auto tab-content w-full
          pt-4
          pb-[env(safe-area-inset-bottom)] /* plus safe-area inset */
          min-h-screen
        "
				>
					{/* Loading spinner */}
					<div
						className={`absolute inset-0 flex flex-col items-center justify-center text-current transition-opacity duration-200 ${
							hideLoader ? "opacity-0 pointer-events-none" : "opacity-100"
						}`}
					>
						<Loader2 className="animate-spin" size={64} aria-label="Loading…" />
						<p>{status === "loading" ? "Loading..." : "Retrieving Sheets transactions..."}</p>
					</div>

					{/* Main content */}
					<div className={`transition-opacity duration-700 ${showContent ? "opacity-100" : "opacity-0"}`}>
						<TabsContent value="calendar">
							<CalendarView
								{...{
									month,
									onMonthChange,
									startAmount,
									setStartAmount,
									startDate,
									setStartDate,
									endDate,
									setEndDate,
									transactions,
									setTransactions,
									spreadsheetId,
								}}
							/>
						</TabsContent>
						<TabsContent value="forecast">
							<ForecastView
								{...{
									startAmount,
									startDate,
									transactions,
								}}
							/>
						</TabsContent>
						<TabsContent value="transactions">
							<TransactionsView
								{...{
									spreadsheetId,
									isDemoWarningClosed,
									columns,
									setStartDate,
									setStartAmount,
									transactions,
									setTransactions,
									pagination,
									setPagination,
								}}
							/>
						</TabsContent>
					</div>
				</div>
			</Tabs>
			<Toaster visibleToasts={1} position="bottom-right" />
		</>
	);
}
