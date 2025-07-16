import { formatMoney, GreenColor } from "@/app/utils";

export default function Money({ amount }: { amount: number }) {
	return (
		<span className="whitespace-nowrap" style={{ color: amount < 0 ? "red" : GreenColor }}>
			{amount < 0 ? "" : "+"}
			{formatMoney(amount)}
		</span>
	);
}
