import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import NumericInput from "@/components/NumericInput";

import { useApp } from "@/contexts/AppContext";
import { GreenColor } from "@/app/utils";
import { updateStartingDate, updateStartingNumber } from "@/app/sheets";

export default function StartingValuesPanel() {
	const { startAmount, setStartAmount, startDate, setStartDate, spreadsheetId } = useApp();
	const startDateIsToday = startDate && startDate.setHours(0, 0, 0, 0) === new Date().setHours(0, 0, 0, 0);

	return (
		<div className="tour-starting mx-auto flex w-full items-center gap-2 text-sm">
			{/* starting values */}
			<span style={{ whiteSpace: "nowrap" }}>Starting on</span>
			<Popover>
				<PopoverTrigger asChild>
					<Button
						variant="outline"
						className={cn("justify-start text-left font-normal", !startDate && "text-muted-foreground")}
						style={{ width: 120 }}
					>
						<CalendarIcon />
						{startDate ? startDateIsToday ? "Today" : startDate.toLocaleDateString() : <span>Select</span>}
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-auto p-0" align="start">
					<Calendar
						mode="single"
						selected={startDate}
						defaultMonth={startDate}
						onSelect={async (day) => {
							setStartDate(day);

							if (day && spreadsheetId) {
								await updateStartingDate(spreadsheetId, new Date(day.setHours(0, 0, 0, 0)));
							}
						}}
						initialFocus
					/>
				</PopoverContent>
			</Popover>
			with
			<span className="input-symbol">
				<NumericInput
					style={{
						color: startAmount > 0 ? GreenColor : startAmount < 0 ? "red" : "inherit",
					}}
					onValidatedChange={async (amount) => {
						if (amount !== 0) {
							setStartAmount(amount);

							if (spreadsheetId) {
								await updateStartingNumber(spreadsheetId, amount);
							}
						}
					}}
					value={startAmount.toFixed(2)}
					className="w-[120px] text-sm"
				/>
			</span>
		</div>
	);
}
