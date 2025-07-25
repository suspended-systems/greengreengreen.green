"use client";

import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ReferenceLine } from "recharts";
import { format, addDays, startOfDay } from "date-fns";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import Money from "@/components/Money";

import { Transaction, calcProjectedValue } from "./transactions";
import { formatMoney, GreenColor } from "./utils";
import { partition } from "lodash";
import { PlusIcon, MinusIcon, DiffIcon } from "lucide-react";

const chartConfig = {
	positiveBalance: {
		label: "Projected Balance",
		color: GreenColor,
	},
	negativeBalance: {
		label: "Projected Balance",
		color: "#dc2626", // red-600
	},
};

export default function ForecastView({
	startAmount,
	startDate,
	transactions,
}: {
	startAmount: number;
	startDate?: Date;
	transactions: Transaction[];
}) {
	const forecastData = useMemo(() => {
		if (!startDate) return [];

		const today = startOfDay(new Date());
		const endDate = addDays(today, 90); // 90 days forecast
		const data: Array<{
			date: string;
			balance: number;
			formattedDate: string;
			positiveBalance: number | null;
			negativeBalance: number | null;
		}> = [];

		// Generate daily projections
		for (let currentDate = today; currentDate <= endDate; currentDate = addDays(currentDate, 1)) {
			const projectedValue = calcProjectedValue({
				startValue: startAmount,
				startDate,
				endDate: currentDate,
				transactions: transactions.filter((tx) => !tx.disabled),
			});

			data.push({
				date: format(currentDate, "MMM dd"),
				balance: projectedValue,
				formattedDate: format(currentDate, "PPP"),
				positiveBalance: projectedValue >= 0 ? projectedValue : null,
				negativeBalance: projectedValue < 0 ? projectedValue : null,
			});
		}

		return data;
	}, [startAmount, startDate, transactions]);

	const stats = useMemo(() => {
		if (forecastData.length === 0) return { current: 0, projected: 0, change: 0 };

		const current = forecastData[0]?.balance || 0;
		const projected = forecastData[forecastData.length - 1]?.balance || 0;
		const change = projected - current;

		return { current, projected, change };
	}, [forecastData]);

	if (!startDate) {
		return (
			<div className="flex flex-col items-center justify-center h-64 text-center">
				<p className="text-muted-foreground">Set a starting date to view forecast</p>
			</div>
		);
	}

	/**
	 * Stats
	 */

	const [incomingTxs, outgoingTxs] = partition((transactions as Transaction[]) ?? [], (tx) => tx.amount >= 0);
	const startOfYear = new Date(Date.UTC(new Date().getFullYear(), 0, 1, 0, 0, 0, 0));
	const endOfYear = new Date(Date.UTC(new Date().getFullYear(), 11, 31, 23, 59, 59, 999));

	const annualIncomingAverage = calcProjectedValue({
		startValue: 0,
		startDate: startOfYear,
		endDate: endOfYear,
		transactions: incomingTxs ?? [],
	});

	const annualOutgoingAverage = calcProjectedValue({
		startValue: 0,
		startDate: startOfYear,
		endDate: endOfYear,
		transactions: outgoingTxs ?? [],
	});

	const annualNetAverage = annualIncomingAverage + annualOutgoingAverage;

	return (
		<div className="max-w-5xl mx-auto flex flex-col gap-4 pb-4 pt-4 px-2 md:px-4">
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium whitespace-nowrap">Today's Projected Balance</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold" style={{ color: stats.current < 0 ? "red" : GreenColor }}>
							{formatMoney(stats.current)}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium whitespace-nowrap">Projected 90-Day Change</CardTitle>
					</CardHeader>
					<CardContent>
						<div className={`text-2xl font-bold`}>
							<Money amount={stats.change} />
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium whitespace-nowrap">Projected 90-Day Balance</CardTitle>
					</CardHeader>
					<CardContent>
						<div className={`text-2xl font-bold`}>
							<Money hidePlus amount={stats.projected} />
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Timeline Chart */}
			<Card>
				<CardHeader>
					<CardTitle>90-Day Financial Forecast</CardTitle>
					<CardDescription>Projected balance over the next 90 days based on your transactions</CardDescription>
				</CardHeader>
				<CardContent>
					<ChartContainer config={chartConfig} className="h-[400px] w-full">
						<AreaChart
							accessibilityLayer
							data={forecastData}
							margin={{
								left: 12,
								right: 12,
							}}
						>
							<CartesianGrid vertical={false} />
							<XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} interval="preserveStartEnd" />
							<YAxis
								tickLine={false}
								axisLine={false}
								tickMargin={8}
								tickFormatter={(value) => `$${value.toLocaleString()}`}
							/>
							<ChartTooltip
								cursor={false}
								content={
									<ChartTooltipContent
										labelFormatter={(label, payload) => payload?.[0]?.payload?.formattedDate || label}
										formatter={(value) => `${formatMoney(Number(value))} Balance`}
									/>
								}
							/>
							<ReferenceLine y={0} stroke="#64748b" strokeDasharray="3 3" />
							<Area
								dataKey="positiveBalance"
								type="monotone"
								fill={`${GreenColor}20`}
								fillOpacity={0.4}
								stroke={GreenColor}
								strokeWidth={2}
								connectNulls={false}
							/>
							<Area
								dataKey="negativeBalance"
								type="monotone"
								fill="#dc262620"
								fillOpacity={0.4}
								stroke="#dc2626"
								strokeWidth={2}
								connectNulls={false}
							/>
						</AreaChart>
					</ChartContainer>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Projected Change During {new Date().getFullYear()}</CardTitle>
					<CardDescription>Average stats for this calendar year</CardDescription>
				</CardHeader>
				<CardContent>
					<div
						className="grid grid-rows-3"
						style={{ gridTemplateColumns: "auto minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)" }}
					>
						<div>{/* empty first table cell */}</div>
						<div className="font-semibold text-right text-xs md:text-base">Daily</div>
						<div className="font-semibold text-right text-xs md:text-base">Monthly</div>
						<div className="font-semibold text-right text-xs md:text-base">Calendar Year</div>

						<div className="font-semibold flex items-start gap-1 whitespace-nowrap">
							<PlusIcon className="mt-1" size={16} />
							<span className="hidden md:inline">Incoming</span>
						</div>
						<div className="self-center font-semibold text-right text-xs md:text-base">
							<Money amount={annualIncomingAverage / 365} />
						</div>
						<div className="self-center font-semibold text-right text-xs md:text-base">
							<Money amount={annualIncomingAverage / 12} />
						</div>
						<div className="self-center font-semibold text-right text-xs md:text-base">
							<Money amount={annualIncomingAverage} />
						</div>

						<div className="font-semibold flex items-start gap-1 whitespace-nowrap">
							<MinusIcon className="mt-1" size={16} />
							<span className="hidden md:inline">Outgoing</span>
						</div>
						<div className="self-center font-semibold text-right text-xs md:text-base">
							<Money amount={annualOutgoingAverage / 365} />
						</div>
						<div className="self-center font-semibold text-right text-xs md:text-base">
							<Money amount={annualOutgoingAverage / 12} />
						</div>
						<div className="self-center font-semibold text-right text-xs md:text-base">
							<Money amount={annualOutgoingAverage} />
						</div>

						<div className="font-semibold flex items-start gap-1 whitespace-nowrap">
							<DiffIcon className="mt-1" size={16} />
							<span className="hidden md:inline">Net</span>
						</div>
						<div className="font-bold text-right md:text-2xl">
							<Money amount={annualNetAverage / 365} />
						</div>
						<div className="font-bold text-right md:text-2xl">
							<Money amount={annualNetAverage / 12} />
						</div>
						<div className="font-bold text-right md:text-2xl">
							<Money amount={annualNetAverage} />
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
