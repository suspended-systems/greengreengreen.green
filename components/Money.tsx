import { formatMoney, GreenColor } from "@/app/utils";

export default function Money({
	amount,
	hidePlus,
	dropDecimals,
}: {
	amount: number;
	hidePlus?: boolean;
	dropDecimals?: boolean;
}) {
	return (
		<span className="whitespace-nowrap" style={{ color: amount < 0 ? "red" : GreenColor }}>
			{hidePlus || amount < 0 ? "" : "+"}
			{dropDecimals ? formatMoney(Math.floor(amount)).slice(0, -3) : formatMoney(amount)}
		</span>
	);
}
