"use client";

import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ReferenceLine } from "recharts";
import { format, addDays, startOfDay } from "date-fns";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import Money from "@/components/Money";

import { Transaction, calcProjectedValue } from "./transactions";
import { GreenColor } from "./utils";

type ForecastViewProps = {
	startAmount: number;
	startDate?: Date;
	transactions: Transaction[];
};

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

export default function ForecastView({ startAmount, startDate, transactions }: ForecastViewProps) {
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

	return (
		<div className="flex flex-col gap-4 pb-4 w-full mx-auto px-2 md:px-4">
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium">Current Balance</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold" style={{ color: stats.current < 0 ? "red" : GreenColor }}>
							${stats.current.toLocaleString()}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium">90-Day Projection</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							<Money amount={stats.projected} />
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium">Net Change</CardTitle>
					</CardHeader>
					<CardContent>
						<div className={`text-2xl font-bold`}>
							<Money amount={stats.change} />
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
										formatter={(value) => [`$${Number(value).toLocaleString()}`, "Balance"].join(" ")}
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
		</div>
	);
}
