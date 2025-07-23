"use client";

import dynamic from "next/dynamic";
import { signOut, useSession } from "next-auth/react";
import { useMemo, useState, useEffect, useRef } from "react";
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

	// holds last scrollTop for each tab
	const scrollPositions = useRef<Record<string, number>>({});
	// refs to each panel's scrollable div
	const contentRefs = useRef<Record<string, HTMLDivElement | null>>({});

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

	// when activeTab changes, restore its scroll
	useEffect(() => {
		const el = contentRefs.current[activeTab];
		if (el) {
			// wait until it's rendered
			requestAnimationFrame(() => {
				el.scrollTop = scrollPositions.current[activeTab] ?? 0;
			});
		}
	}, [activeTab]);

	return (
		<>
			{/* Joyride Tour */}
			<Tour isTourComplete={isTourComplete} callback={handleJoyrideCallback} />

			{/* Tabs */}
			<Tabs
				value={activeTab}
				onValueChange={setActiveTab}
				className="gap-0 /* we add a padding top to the tab content instead so we get layout spacing and overflow rendering */"
			>
				<TabsList
					className="
		border
       	w-full        					
       	bottom-0 md:top-0 order-1 md:order-0	/* bottom on mobile, top on md+ */
       	h-18 md:h-9          			 		/* mobile: 4.5rem, desktop: 2.25rem */
       	pb-[env(safe-area-inset-bottom)] 		/* iOS safe-area inset */
	   	rounded-t-lg rounded-b-none md:rounded-t-none md:rounded-b-lg
     "
				>
					<TabsTrigger value="calendar" className="flex flex-col md:flex-row text-xs md:text-sm">
						<CalendarDaysIcon className="size-8 md:size-4" />
						<span className="hidden md:block">Calendar</span>
					</TabsTrigger>
					<TabsTrigger value="forecast" className="flex flex-col md:flex-row text-xs md:text-sm">
						<TrendingUpIcon className="size-8 md:size-4" />
						<span className="hidden md:block">Forecast</span>
					</TabsTrigger>
					<TabsTrigger value="transactions" className="tour-transactions flex flex-col md:flex-row text-xs md:text-sm">
						<CircleDollarSignIcon className="size-8 md:size-4" />
						<span className="hidden md:block">Transactions</span>
					</TabsTrigger>
				</TabsList>

				{/* Loading spinner */}
				<div
					className={`absolute inset-0 flex flex-col items-center justify-center text-current transition-opacity duration-200 ${
						hideLoader ? "opacity-0 pointer-events-none" : "opacity-100"
					}`}
				>
					<Loader2 className="animate-spin" size={64} aria-label="Loading…" />
					<p>{status === "loading" ? "Loading..." : "Retrieving Sheets transactions..."}</p>
				</div>

				{/* Content */}
				<div className={`transition-opacity duration-700 ${showContent ? "opacity-100" : "opacity-0"}`}>
					<TabsContent value="calendar">
						<PanelScroll tabValue="calendar" scrollPositions={scrollPositions}>
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
						</PanelScroll>
					</TabsContent>
					<TabsContent value="forecast">
						<PanelScroll tabValue="forecast" scrollPositions={scrollPositions}>
							<ForecastView
								{...{
									startAmount,
									startDate,
									transactions,
								}}
							/>
						</PanelScroll>
					</TabsContent>
					<TabsContent value="transactions">
						<PanelScroll tabValue="transactions" scrollPositions={scrollPositions}>
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
						</PanelScroll>
					</TabsContent>
				</div>
			</Tabs>
			<Toaster visibleToasts={1} position="bottom-center" />
		</>
	);
}

function PanelScroll({
	tabValue,
	scrollPositions,
	children,
}: {
	tabValue: string;
	scrollPositions: React.RefObject<Record<string, number>>;
	children: React.ReactNode;
}) {
	const ref = useRef<HTMLDivElement>(null);

	// on mount (i.e. when this tab becomes active), restore scroll
	useEffect(() => {
		const el = ref.current;
		if (el) {
			el.scrollTop = scrollPositions.current[tabValue] ?? 0;
		}
	}, [tabValue]);

	return (
		<div
			ref={ref}
			// todo: get rid of height calc hardcode
			// -72px mobile tab bar height
			// -36px desktop tab bar height
			className="overflow-auto! overscroll-none h-[calc(100dvh-72px)] md:h-[calc(100dvh-36px)]"
			onScroll={(e) => {
				scrollPositions.current[tabValue] = e.currentTarget.scrollTop;
			}}
		>
			{children}
		</div>
	);
}
