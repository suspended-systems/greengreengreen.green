"use client";

import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { useMemo, useState, useEffect } from "react";
import { useLocalStorage } from "react-use";
import useSWRImmutable from "swr/immutable";
import { toast } from "sonner";

import { ColumnDef, PaginationState } from "@tanstack/react-table";

import { Toaster } from "@/components/ui/sonner";
import LoadingSpinner from "@/components/LoadingSpinner";
import AppTabs from "@/components/AppTabs";

import { columns as columnsData } from "./TransactionsView/tableColumns";
import { Transaction } from "./transactions";
import { AppProvider, useApp } from "@/contexts/AppContext";
import { useTransactionActions } from "@/hooks/useTransactionActions";
import { cn } from "@/lib/utils";

import { CallBackProps } from "react-joyride";
const JoyRideTour = dynamic(() => import("@/components/JoyRideTour"), { ssr: false });

import getSheetsData from "./sheets";

export default function Home() {
	return (
		<AppProvider>
			<HomeContent />
		</AppProvider>
	);
}

function HomeContent() {
	const { data: session, status } = useSession();
	const { setActiveTab, setTransactions, setSpreadsheetId, setStartDate, setStartAmount } = useApp();

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
	const [month, onMonthChange] = useState(new Date());
	const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 } as PaginationState);
	const [showContent, setShowContent] = useState(false);
	const [hideLoader, setHideLoader] = useState(false);

	const { updateTransaction, deleteTransaction } = useTransactionActions();

	const columns: ColumnDef<Transaction>[] = useMemo(
		() => columnsData({ updateTransaction, deleteTransaction }),
		[updateTransaction, deleteTransaction],
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
			<JoyRideTour isTourComplete={isTourComplete} callback={handleJoyrideCallback} />

			{/* Loading spinner */}
			<LoadingSpinner hideLoader={hideLoader} status={status} />

			{/* Content */}
			<div className={cn("transition-opacity duration-700", showContent ? "opacity-100" : "opacity-0")}>
				<AppTabs
					month={month}
					onMonthChange={onMonthChange}
					isDemoWarningClosed={isDemoWarningClosed}
					columns={columns}
					pagination={pagination}
					setPagination={setPagination}
				/>
			</div>
			<Toaster visibleToasts={1} position="bottom-center" />
		</>
	);
}
