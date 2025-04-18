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

import { Transaction, txRRule } from "../transactions";
import { formatMoney, frequencies, frequenciesStrings, GreenColor } from "../utils";
import { deleteSheetsRow, updateSheetsRow } from "../sheets";
import { Frequency, RRule } from "rrule";

declare module "@tanstack/react-table" {
	interface CellContext<TData extends RowData, TValue> {
		isRowHovered: boolean;
	}
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

export const columns = ({
	spreadsheetId,
	setTransactions,
}: {
	spreadsheetId: string | null;
	setTransactions: Dispatch<SetStateAction<Transaction[]>>;
}): ColumnDef<Transaction>[] => [
	{
		accessorKey: "disabled",
		header: ({ column }) => <HeaderWithSort {...{ column }} />,
		cell: ({ row }) => (
			<Switch
				checked={!row.getValue("disabled")}
				onCheckedChange={async (isToggled) => {
					setTransactions((value) =>
						value.map((tx) => (tx.name === row.getValue("name") ? { ...tx, disabled: !isToggled } : tx)),
					);

					if (spreadsheetId) {
						await updateSheetsRow({
							spreadsheetId,
							filterValue: row.getValue("name"),
							columnOrRow: "E",
							newValue: isToggled,
						});
					}
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

								setTransactions((value) =>
									value.map((tx) => (tx.name === row.getValue("name") ? { ...tx, name } : tx)),
								);

								/**
								 * todo: debounce
								 */
								if (spreadsheetId) {
									await updateSheetsRow({
										spreadsheetId,
										filterValue: row.getValue("name"),
										columnOrRow: "A",
										newValue: name,
									});
								}
							}}
							value={row.getValue("name")}
							placeholder="Enter a transaction name..."
							style={{ width: "fit-content", position: "relative", right: 13 }}
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
								onSelect={async (day) => {
									if (!day) return;

									setTransactions((value) =>
										value.map((tx) =>
											tx.name === row.getValue("name") ? { ...tx, date: day.setHours(0, 0, 0, 0) } : tx,
										),
									);

									/**
									 * todo: debounce
									 */
									if (spreadsheetId) {
										await updateSheetsRow({
											spreadsheetId,
											filterValue: row.getValue("name"),
											columnOrRow: "C",
											// date is sent in a reliable YYYY-MM-DD format so it get's picked up as a date in Sheets
											newValue: new Date(day.setHours(0, 0, 0, 0)).toISOString().split("T")[0],
										});
									}
								}}
								initialFocus
								className="rounded-md border shadow"
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

			return (
				<div className="flex items-center" style={{ width: 207, height: 36, justifySelf: "center" }}>
					{(row.original.disabled || !isRowHovered) && !isDropdownOpen && !isInputSelected ? (
						row.original.freq != null ? (
							// capitalize the E
							"E" + txRRule(row.original).toText().slice(1)
						) : (
							""
						)
					) : (
						<InlineFrequencyEditor
							tx={val}
							handleInputFocus={() => setInputSelected(true)}
							handleInputBlur={() => setInputSelected(false)}
							{...{ spreadsheetId, setDropDownOpen, setTransactions }}
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
						<span style={{ color: numberAmount > -1 ? GreenColor : "red" }}>
							{numberAmount > -1 && "+"}
							{formattedString}
						</span>
					) : (
						<span className="input-symbol" style={{ position: "relative", left: 59 }}>
							<NumericInput
								onFocus={handleFocus}
								onBlur={handleBlur}
								onValidatedChange={async (amount) => {
									if (amount !== 0) {
										setTransactions((value) =>
											value.map((tx) => (tx.name === row.getValue("name") ? { ...tx, amount } : tx)),
										);

										/**
										 * todo: debounce
										 */
										if (spreadsheetId) {
											await updateSheetsRow({
												spreadsheetId,
												filterValue: row.getValue("name"),
												columnOrRow: "B",
												newValue: amount,
											});
										}
									}
								}}
								initialValue={numberAmount.toFixed(2)}
								className="text-sm"
								style={{
									minWidth: 144,
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
								setTransactions((value) => value.filter((tx) => tx.name !== row.getValue("name")));

								if (spreadsheetId) {
									await deleteSheetsRow({ spreadsheetId, filterValue: row.getValue("name") });
								}
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
	spreadsheetId,
	setDropDownOpen,
	handleInputFocus,
	handleInputBlur,
	setTransactions,
}: {
	tx: Transaction;
	spreadsheetId: string | null;
	setDropDownOpen: Dispatch<SetStateAction<boolean>>;
	handleInputFocus: () => void;
	handleInputBlur: () => void;
	setTransactions: Dispatch<SetStateAction<Transaction[]>>;
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
					setTransactions((value) =>
						value.map((t) =>
							t.name === tx.name
								? {
										...t,
										interval: Number(e.target.value),
								  }
								: t,
						),
					);

					/**
					 * todo: debounce
					 */
					if (spreadsheetId) {
						await updateSheetsRow({
							spreadsheetId,
							filterValue: tx.name,
							columnOrRow: "D",
							newValue: new RRule({ freq: tx.freq ?? Frequency.DAILY, interval: Number(e.target.value) }).toText(),
						});
					}
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
							{tx.freq != null ? frequenciesStrings[frequenciesStrings.length - 1 - tx.freq] : "Select"}
						</span>
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent className="justify-start text-left font-normal" style={{ width: "fit-content" }}>
					{frequenciesStrings.map((item, i) => (
						<DropdownMenuItem
							key={`freq-dropdown-item:${i}`}
							onClick={async () => {
								setTransactions((value) =>
									value.map((t) =>
										t.name === tx.name
											? {
													...t,
													freq: frequencies[i],
											  }
											: t,
									),
								);

								/**
								 * todo: debounce
								 */
								if (spreadsheetId) {
									await updateSheetsRow({
										spreadsheetId,
										filterValue: tx.name,
										columnOrRow: "D",
										newValue: new RRule({ freq: frequencies[i], interval: tx.interval ?? 1 }).toText(),
									});
								}
							}}
						>
							{item}
						</DropdownMenuItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>
			<Button
				variant="outline"
				onClick={() => {
					setIsRecurring(false);
					setTransactions((value) =>
						value.map((t) =>
							t.name === tx.name
								? {
										...t,
										freq: undefined,
										interval: undefined,
								  }
								: t,
						),
					);
				}}
			>
				<XIcon />
			</Button>
		</div>
	);
}
