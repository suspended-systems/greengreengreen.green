"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, PropsWithChildren } from "react";
import { useIsomorphicLayoutEffect, useLocalStorage } from "react-use";
import { CalendarDaysIcon, CircleDollarSignIcon, CogIcon, Loader2 } from "lucide-react";

import { ColumnDef, PaginationState } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import CalendarView from "./CalendarView";
import { columns as columnsData } from "./TransactionsView/columns";
import { SetUpWithGoogleSheetsButton, TransactionsTable } from "./TransactionsView";
import { ModeSwitcher } from "./ModeSwitcher";

import { defaultTransactions, Transaction } from "./transactions";
import { APP_NAME, GreenColor } from "./utils";

import { CallBackProps } from "react-joyride";
const Tour = dynamic(() => import("./Tour"), { ssr: false });

import { signOut, useSession } from "next-auth/react";
import getSpreadSheet from "./sheets";
import { toast } from "sonner";

export default function Home() {
	const { data: session } = useSession();

	const [isSheetLoading, setSheetLoading] = useState(false);

	const [isDemoMode, setIsDemoMode] = useState(true);

	const [isDemoWarningClosed, setIsDemoWarningClosed] = useState(false);

	const [isTourComplete, setTourComplete] = useLocalStorage(`is_${APP_NAME}_tour_complete`, false);

	const [activeTab, setActiveTab] = useState("calendar");

	const [startValue, setStartValue] = useState(5000);
	const [startDate, setStartDate] = useState<Date | undefined>(new Date(new Date().setHours(0, 0, 0, 0)));
	const [endDate, setEndDate] = useState<Date | undefined>();

	const [transactions, setTransactions] = useState(defaultTransactions);

	const [month, onMonthChange] = useState(new Date());

	const [pagination, setPagination] = useState({
		pageIndex: 0,
		pageSize: 10,
	} as PaginationState);

	const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null);

	const columns: ColumnDef<Transaction>[] = useMemo(
		() => columnsData({ spreadsheetId, setTransactions }),
		[spreadsheetId, setTransactions],
	);

	const loadSheetData = async () => {
		if (spreadsheetId == null && session?.accessToken) {
			setSheetLoading(true);

			await getSpreadSheet({ tz: Intl.DateTimeFormat().resolvedOptions().timeZone }).then(
				async ({
					sheet,
					transactions: spreadsheetTransactions,
					startDate: spreadsheetStartDate,
					startValue: spreadsheetStartValue,
					malformedTransactions,
				}) => {
					if (sheet?.id) {
						setSpreadsheetId(sheet.id);
						setIsDemoMode(false);

						/**
						 * Load the sheet data into app state's transactions
						 */
						if (spreadsheetStartDate) setStartDate(spreadsheetStartDate);
						if (spreadsheetStartValue) setStartValue(spreadsheetStartValue);
						setTransactions(spreadsheetTransactions);

						if (malformedTransactions.length) {
							toast(`⚠️ Sheet contains malformed transactions`);
						}
					}
				},
			);
			setSheetLoading(false);
		}
	};

	useIsomorphicLayoutEffect(() => {
		loadSheetData();
	}, [session]);

	const handleJoyrideCallback = ({ index, action }: CallBackProps) => {
		const manageTransactionsIndex = 4;
		if (action === "next" && index === manageTransactionsIndex) {
			setIsDemoWarningClosed(true);
			setActiveTab("transactions");
		}

		if (action === "reset") {
			// setActiveTab("calendar");
			setIsDemoMode(false);
			setIsDemoWarningClosed(false);
			setTourComplete(true);
		}
	};

	return (
		<>
			<Tour isTourComplete={isTourComplete} callback={handleJoyrideCallback} />
			{/* night mode toggle */}
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
				💸 {APP_NAME}
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
				className="mx-auto mb-4 md:mb-0"
			/>
			{/* tabs */}
			<Tabs value={activeTab} onValueChange={setActiveTab}>
				<TabsList className="z-50 grid grid-cols-2 w-full fixed md:relative bottom-0 h-18 md:h-9">
					<TabsTrigger value="calendar" className="flex flex-col md:flex-row text-xs md:text-sm">
						<CalendarDaysIcon className="size-8 md:size-4" />
						Calendar
					</TabsTrigger>
					<TabsTrigger value="transactions" className="tour-transactions flex flex-col md:flex-row text-xs md:text-sm">
						<CircleDollarSignIcon className="size-8 md:size-4" />
						Transactions
					</TabsTrigger>
				</TabsList>

				{!spreadsheetId && !isDemoMode ? (
					<div className="flex flex-col items-center gap-3">
						<>
							<SetUpWithGoogleSheetsButton />
							or
							<Button variant="outline" onClick={() => setIsDemoMode(true)}>
								Continue in demo mode
							</Button>
						</>
					</div>
				) : isSheetLoading ? (
					<div className="flex flex-col items-center h-full text-current">
						<Loader2 className="animate-spin" size={64} aria-label="Loading…" />
						<p>Retrieving Sheets transactions...</p>
					</div>
				) : (
					<>
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
									setTransactions,
									spreadsheetId,
								}}
							/>
						</TabContentItem>
						<TabContentItem name="transactions">
							<TransactionsTable
								{...{
									spreadsheetId,
									isDemoWarningClosed,
									setIsDemoWarningClosed,
									isDemoMode,
									setIsDemoMode,
									columns,
									setStartDate,
									setStartValue,
									transactions,
									setTransactions,
									pagination,
									setPagination,
								}}
							/>
						</TabContentItem>
					</>
				)}
			</Tabs>
			<Toaster visibleToasts={1} position="bottom-right" />
		</>
	);
}

function TabContentItem({ children, name }: PropsWithChildren & { name: string }) {
	return (
		<TabsContent className="tab-content mx-auto w-full" value={name}>
			{/* -15 instead of -16 because the fade divider creeps into scrolled down viewport on mobile */}
			<div
				className={`flex overflow-x-auto overscroll-x-contain px-2 lg:mx-4 min-h-[calc(100vh-15px)] md:min-h-[calc(100vh-16px)]`}
			>
				<div className="mx-auto">{children}</div>
			</div>
		</TabsContent>
	);
}
