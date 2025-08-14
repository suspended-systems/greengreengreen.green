import React, { useRef, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDaysIcon, CircleDollarSignIcon, TrendingUpIcon } from "lucide-react";

import CalendarView from "@/app/CalendarView";
import ForecastView from "@/app/ForecastView";
import { TransactionsView } from "@/app/TransactionsView/TransactionsView";
import { useApp } from "@/contexts/AppContext";

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
			className="overflow-auto! overscroll-none h-[calc(100dvh-72px)] md:h-[calc(100dvh-36px)]"
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
