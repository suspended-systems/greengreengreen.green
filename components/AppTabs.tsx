import React, { useRef, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDaysIcon, CircleDollarSignIcon, TrendingUpIcon } from "lucide-react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

import CalendarView from "@/app/CalendarView";
import ForecastView from "@/app/ForecastView";
import { TransactionsView } from "@/app/TransactionsView/TransactionsView";
import { useApp } from "@/contexts/AppContext";

const tabTriggerVariants = cva("flex flex-col text-xs md:flex-row md:text-sm");

interface AppTabsProps {
	month: Date;
	onMonthChange: React.Dispatch<React.SetStateAction<Date>>;
	isDemoWarningClosed: boolean;
	columns: any[];
	pagination: any;
	setPagination: React.Dispatch<React.SetStateAction<any>>;
}

export default function AppTabs({
	month,
	onMonthChange,
	isDemoWarningClosed,
	columns,
	pagination,
	setPagination,
}: AppTabsProps) {
	const { activeTab, setActiveTab } = useApp();

	// Holds last scrollTop for each tab
	const scrollPositions = useRef<Record<string, number>>({});
	// Refs to each panel's scrollable div
	const contentRefs = useRef<Record<string, HTMLDivElement | null>>({});

	return (
		<Tabs
			value={activeTab}
			onValueChange={setActiveTab}
			className="/* we add a padding top to the tab content instead so we get layout spacing and overflow rendering */ gap-0"
		>
			<TabsList
				className={cn(
					"w-full border",
					"bottom-0 order-1 md:top-0 md:order-0",
					"h-18 md:h-9",
					"pb-[env(safe-area-inset-bottom)]",
					"rounded-t-lg rounded-b-none md:rounded-t-none md:rounded-b-lg",
				)}
			>
				<TabsTrigger value="calendar" className={tabTriggerVariants()}>
					<CalendarDaysIcon className="size-8 md:size-4" />
					<span className="hidden md:block">Calendar</span>
				</TabsTrigger>
				<TabsTrigger value="forecast" className={tabTriggerVariants()}>
					<TrendingUpIcon className="size-8 md:size-4" />
					<span className="hidden md:block">Forecast</span>
				</TabsTrigger>
				<TabsTrigger value="transactions" className={cn(tabTriggerVariants(), "tour-transactions")}>
					<CircleDollarSignIcon className="size-8 md:size-4" />
					<span className="hidden md:block">Transactions</span>
				</TabsTrigger>
			</TabsList>

			<TabsContent value="calendar">
				<ScrollablePanel tabValue="calendar" scrollPositions={scrollPositions} contentRefs={contentRefs}>
					<CalendarView month={month} onMonthChange={onMonthChange} />
				</ScrollablePanel>
			</TabsContent>

			<TabsContent value="forecast">
				<ScrollablePanel tabValue="forecast" scrollPositions={scrollPositions} contentRefs={contentRefs}>
					<ForecastView />
				</ScrollablePanel>
			</TabsContent>

			<TabsContent value="transactions">
				<ScrollablePanel tabValue="transactions" scrollPositions={scrollPositions} contentRefs={contentRefs}>
					<TransactionsView
						isDemoWarningClosed={isDemoWarningClosed}
						columns={columns}
						pagination={pagination}
						setPagination={setPagination}
					/>
				</ScrollablePanel>
			</TabsContent>
		</Tabs>
	);
}

interface ScrollablePanelProps {
	tabValue: string;
	scrollPositions: React.RefObject<Record<string, number>>;
	contentRefs: React.RefObject<Record<string, HTMLDivElement | null>>;
	children: React.ReactNode;
}

function ScrollablePanel({ tabValue, scrollPositions, contentRefs, children }: ScrollablePanelProps) {
	const ref = useRef<HTMLDivElement>(null);

	// On mount (i.e. when this tab becomes active), restore scroll
	useEffect(() => {
		const el = ref.current;
		if (el) {
			el.scrollTop = scrollPositions.current?.[tabValue] ?? 0;
		}

		// Store ref for parent component
		if (contentRefs.current) {
			contentRefs.current[tabValue] = ref.current;
		}
	}, [tabValue, scrollPositions, contentRefs]);

	return (
		<div
			ref={ref}
			className="h-[calc(100dvh-72px)] overflow-auto! overscroll-none md:h-[calc(100dvh-36px)]"
			onScroll={(e) => {
				if (scrollPositions.current) {
					scrollPositions.current[tabValue] = e.currentTarget.scrollTop;
				}
			}}
		>
			{children}
		</div>
	);
}
