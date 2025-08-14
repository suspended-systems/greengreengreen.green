"use client";

import { Dispatch, SetStateAction, useState } from "react";
import { ArrowDown, ArrowUp, CalendarIcon, TrashIcon, PlusIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Column, ColumnDef, RowData } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import NumericInput from "@/components/NumericInput";

import { Transaction } from "../transactions";
import { txRRule, TRANSACTION_FIELDS } from "../transactionSchema";
import { formatMoney, GreenColor } from "../utils";
import { useTransactionActions } from "@/hooks/useTransactionActions";

declare module "@tanstack/react-table" {
	interface CellContext<TData extends RowData, TValue> {
		isRowHovered: boolean;
	}
}

const safariOnlyTextBottom = () => navigator.userAgent.includes("Safari") && { bottom: 0.5 };

export const columns = ({
	updateTransaction,
	deleteTransaction,
}: Pick<
	ReturnType<typeof useTransactionActions>,
	"updateTransaction" | "deleteTransaction"
>): ColumnDef<Transaction>[] => [
	{
		accessorKey: "disabled",
		header: ({ column }) => <HeaderWithSort {...{ column }} />,
		cell: ({ row }) => (
			<Switch
				checked={!row.getValue("disabled")}
				onCheckedChange={async (isToggled) => {
					await updateTransaction(row.original, { disabled: !isToggled });
				}}
				aria-label="Toggle transaction"
			/>
		),
	},
	{
		accessorKey: "name",
		header: ({ column }) => <HeaderWithSort {...{ column, title: "Transaction" }} />,
		cell: ({ row, isRowHovered }) => {
			const [isInputSelected, setInputSelected] = useState(false);

			const handleFocus = () => {
				setInputSelected(true);
			};

			const handleBlur = () => {
				setInputSelected(false);
			};

			return (
				<div style={{ width: 240 }}>
					{(row.original.disabled || !isRowHovered) && !isInputSelected ? (
						<span style={{ position: "relative" }}>{row.getValue("name")}</span>
					) : (
						<Input
							onFocus={handleFocus}
							onBlur={handleBlur}
							type="text"
							onChange={async (event) => {
								const name = event.target.value;
								await updateTransaction(row.original, { name });
							}}
							value={row.getValue("name")}
							placeholder="Enter a transaction name..."
							style={{ width: "fit-content", position: "relative", right: 13, ...safariOnlyTextBottom() }}
							className="text-sm"
						/>
					)}
				</div>
			);
		},
	},
	{
		accessorKey: "date",
		header: ({ column }) => <HeaderWithSort {...{ column, title: "Date" }} />,
		cell: ({ row, isRowHovered }) => (
			<div style={{ width: 97 }}>
				{row.original.disabled || !isRowHovered ? (
					new Date(row.getValue("date")).toLocaleDateString()
				) : (
					<Popover>
						<PopoverTrigger asChild>
							<Button
								variant="outline"
								className={cn(
									"w-[240px] justify-start text-left font-normal",
									!row.getValue("date") && "text-muted-foreground",
								)}
								style={{ width: "fit-content", position: "relative", right: 37 }}
							>
								<CalendarIcon />
								{new Date(row.getValue("date")) ? (
									new Date(row.getValue("date")).toLocaleDateString()
								) : (
									<span>Select a start date</span>
								)}
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-auto p-0" align="start">
							<Calendar
								mode="single"
								selected={new Date(row.getValue("date"))}
								defaultMonth={new Date(row.getValue("date"))}
								onSelect={async (day) => {
									if (!day) return;
									await updateTransaction(row.original, { date: day.setHours(0, 0, 0, 0) });
								}}
								initialFocus
							/>
						</PopoverContent>
					</Popover>
				)}
			</div>
		),
	},
	{
		id: "freq",
		accessorFn: (og) => (og.freq == null ? undefined : `${og.freq}:${og.interval}`),
		header: ({ column }) => <HeaderWithSort {...{ column, title: "Recurrence" }} />,
		cell: ({ row, isRowHovered }) => {
			const val = row.original as Transaction;
			const [isDropdownOpen, setDropDownOpen] = useState(false);
			const [isInputSelected, setInputSelected] = useState(false);

			const recurrenceText =
				row.original.freq != null
					? // capitalize the first letter in "every"
					  "E" + txRRule(row.original).toText().slice(1)
					: "";

			return (
				<div className="flex items-center" style={{ width: 207, height: 36, justifySelf: "center" }}>
					{(row.original.disabled || !isRowHovered) && !isDropdownOpen && !isInputSelected ? (
						recurrenceText
					) : (
						<InlineFrequencyEditor
							tx={val}
							handleInputFocus={() => setInputSelected(true)}
							handleInputBlur={() => setInputSelected(false)}
							updateTransaction={updateTransaction}
							{...{ setDropDownOpen }}
						/>
					)}
				</div>
			);
		},
	},
	{
		accessorKey: "amount",
		header: ({ column }) => (
			<div className="text-right">
				<HeaderWithSort {...{ column, title: "Amount" }} />
			</div>
		),
		cell: ({ row, isRowHovered }) => {
			const numberAmount = parseFloat(row.getValue("amount"));
			const formattedString = formatMoney(numberAmount);

			const [isInputSelected, setInputSelected] = useState(false);

			const handleFocus = () => {
				setInputSelected(true);
			};

			const handleBlur = () => {
				setInputSelected(false);
			};

			return (
				<div className="flex justify-end" style={{ width: 180, marginLeft: "auto" }}>
					{(row.original.disabled || !isRowHovered) && !isInputSelected ? (
						<span style={{ color: numberAmount > 0 ? GreenColor : "red" }}>
							{numberAmount > 0 && "+"}
							{formattedString}
						</span>
					) : (
						<span
							className="input-symbol left-[59px] md:left-[13px]"
							style={{ position: "relative", ...safariOnlyTextBottom() }}
						>
							<NumericInput
								onFocus={handleFocus}
								onBlur={handleBlur}
								onValidatedChange={async (amount) => {
									if (amount !== 0) {
										await updateTransaction(row.original, { amount });
									}
								}}
								value={numberAmount.toFixed(2)}
								className="text-sm !min-w-[144px] md:!w-[144px]"
								style={{
									color: numberAmount > 0 ? GreenColor : numberAmount < 0 ? "red" : "inherit",
									textAlign: "right",
								}}
							/>
						</span>
					)}
				</div>
			);
		},
	},
	{
		id: "actions",
		cell: ({ row, isRowHovered }) => (
			<div style={{ width: 118 }}>
				{isRowHovered && (
					<div className="text-right">
						<Button
							variant="outline"
							onClick={async () => {
								await deleteTransaction(row.original);
							}}
						>
							<TrashIcon />
						</Button>
					</div>
				)}
			</div>
		),
	},
];

function InlineFrequencyEditor({
	tx,
	setDropDownOpen,
	handleInputFocus,
	handleInputBlur,
	updateTransaction,
}: {
	tx: Transaction;
	setDropDownOpen: Dispatch<SetStateAction<boolean>>;
	handleInputFocus: () => void;
	handleInputBlur: () => void;
	updateTransaction: (tx: Transaction, updates: Partial<Transaction>) => Promise<void>;
}) {
	const [isRecurring, setIsRecurring] = useState(tx.freq != null);

	return !isRecurring ? (
		<Button variant="outline" onClick={() => setIsRecurring(true)}>
			<PlusIcon />
		</Button>
	) : (
		<div className="flex flex-row items-center gap-1">
			Every
			<Input
				onFocus={handleInputFocus}
				onBlur={handleInputBlur}
				type="number"
				inputMode="numeric"
				min="1"
				style={{ width: 60 }}
				value={tx.interval ?? 1}
				onChange={async (e) => {
					await updateTransaction(tx, { interval: Number(e.target.value) });
				}}
				className="text-sm"
			/>
			<DropdownMenu modal onOpenChange={setDropDownOpen}>
				<DropdownMenuTrigger asChild>
					<Button
						variant="outline"
						className={cn("justify-start font-normal", tx.freq == null && "text-muted-foreground")}
						style={{ width: 90 }}
					>
						<span style={{ width: "100%", textAlign: tx.freq == null ? "center" : "left" }}>
							{tx.freq != null ? TRANSACTION_FIELDS.freq.options.find((opt) => opt.value === tx.freq)?.label : "Select"}
						</span>
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent className="justify-start text-left font-normal" style={{ width: "fit-content" }}>
					{TRANSACTION_FIELDS.freq.options.map((option) => (
						<DropdownMenuItem
							key={`freq-dropdown-item:${option.label}`}
							onClick={async () => {
								await updateTransaction(tx, { freq: option.value });
							}}
						>
							{option.label}
						</DropdownMenuItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>
			<Button
				variant="outline"
				onClick={async () => {
					setIsRecurring(false);
					await updateTransaction(tx, { freq: undefined, interval: undefined });
				}}
			>
				<XIcon />
			</Button>
		</div>
	);
}

function HeaderWithSort({ column, title }: { column: Column<Transaction, unknown>; title?: string }) {
	return (
		<Button
			size={!title ? "icon" : undefined}
			variant={column.getIsSorted() ? "secondary" : "ghost"}
			className={`w-full ${title === "Amount" ? "justify-end" : "justify-start"}`}
			onClick={() =>
				column.getIsSorted() === "desc" ? column.clearSorting() : column.toggleSorting(column.getIsSorted() === "asc")
			}
		>
			{title ?? "‎ "}
			{column.getIsSorted() === "asc" ? (
				<ArrowUp className="ml-2 h-4 w-4" />
			) : column.getIsSorted() === "desc" ? (
				<ArrowDown className="ml-2 h-4 w-4" />
			) : (
				""
			)}
		</Button>
	);
}
