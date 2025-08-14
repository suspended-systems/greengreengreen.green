import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Money from "@/components/Money";

import { formatMoney, GreenColor } from "@/app/utils";

interface ForecastStatsCardsProps {
	stats: {
		current: number;
		change: number;
		projected: number;
	};
}

export default function ForecastStatsCards({ stats }: ForecastStatsCardsProps) {
	return (
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
	);
}