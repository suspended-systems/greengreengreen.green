"use client";

import dynamic from "next/dynamic";
import { signOut, useSession } from "next-auth/react";
import { useMemo, useState, useEffect } from "react";
import { useLocalStorage } from "react-use";
import useSWRImmutable from "swr/immutable";
import { toast } from "sonner";
import { CalendarDaysIcon, CircleDollarSignIcon, CogIcon, Loader2, TrendingUpIcon } from "lucide-react";

import { ColumnDef, PaginationState } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import CalendarView from "./CalendarView";
import ForecastView from "./ForecastView";
import { columns as columnsData } from "./TransactionsView/tableColumns";
import { SetUpWithGoogleSheetsButton, TransactionsView } from "./TransactionsView/TransactionsView";
import { ModeSwitcher } from "@/components/ModeSwitcher";
import { defaultStartingDate, defaultStartingValue, defaultTransactions, Transaction } from "./transactions";
import { GreenColor } from "./utils";

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
					return;
				}

				setSpreadsheetId(data.sheet.id);

				if (data.startDate) setStartDate(data.startDate);
				if (data.startAmount) setStartAmount(data.startAmount);
				setTransactions(data.transactions);

				if (data.malformedTransactions.length > 0) {
					toast(`⚠️ Sheet contains ${data.malformedTransactions.length} malformed transaction(s)`);
				}
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

	return (
		<>
			{/* Joyride Tour */}
			<Tour isTourComplete={isTourComplete} callback={handleJoyrideCallback} />

			{/* settings cog (night mode toggle/sign out) */}
			<div className="absolute" style={{ right: 3, top: 3 }}>
				<Popover>
					<PopoverTrigger>
						<CogIcon className="text-muted-foreground" />
					</PopoverTrigger>
					<PopoverContent className="w-fit flex flex-col gap-4 justify-center">
						<ModeSwitcher />
						<div className="flex flex-col gap-4 mx-auto">
							{session ? (
								<>
									<span className="text-sm text-muted-foreground">Signed in to {session.user?.email}</span>
									<Button
										variant="outline"
										className="w-fit"
										style={{ alignSelf: "flex-end", color: "#c75757" }}
										onClick={() => signOut()}
									>
										Sign out
									</Button>
								</>
							) : (
								<>
									<SetUpWithGoogleSheetsButton />
								</>
							)}
						</div>
					</PopoverContent>
				</Popover>
			</div>

			{/* banner */}
			<div
				className="text-center font-medium"
				style={{
					pointerEvents: "none",
					fontSize: 20,
					letterSpacing: 1,
					color: GreenColor,
					fontFamily: "sans-serif",
				}}
			>
				💸 greengreengreen.green
			</div>

			{/* green fading divider */}
			<div
				style={{
					border: `1px solid ${GreenColor}`,
					borderLeft: "150px solid transparent",
					borderRight: "150px solid transparent",
					position: "relative",
					top: 1,
				}}
				className="mx-auto"
			/>

			{/* tabs */}
			<Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col gap-0">
				<TabsList
					className="
       sticky bottom-0 z-10           /* stick to viewport bottom */
       grid grid-cols-3 w-full        /* three columns, full width */
       order-1 md:order-0             /* bottom on mobile, top on md+ */
       h-18 md:h-9                    /* mobile: 4.5rem, desktop: 2.25rem */
       pb-[env(safe-area-inset-bottom)] /* iOS safe-area inset */
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
		  min-h-[calc(100vh-71px)] /* 72 - 1 so the green fading divider is out of view */
          md:min-h-screen
        "
				>
					{(status === "authenticated" && isLoading) || status === "loading" ? (
						<div className="flex flex-col items-center h-full text-current">
							<Loader2 className="animate-spin" size={64} aria-label="Loading…" />
							<p>{status === "loading" ? "Loading..." : "Retrieving Sheets transactions..."}</p>
						</div>
					) : (
						<>
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
						</>
					)}
				</div>
			</Tabs>
			<Toaster visibleToasts={1} position="bottom-right" />
		</>
	);
}
