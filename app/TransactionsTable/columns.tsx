"use client";

import { Dispatch, SetStateAction, useState } from "react";
import {
	ArrowDown,
	ArrowUp,
	Calendar as CalendarIcon,
	Trash as TrashIcon,
	Plus as PlusIcon,
	X as XIcon,
} from "lucide-react";
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

declare module "@tanstack/react-table" {
	interface CellContext<TData extends RowData, TValue> {
		isRowHovered: boolean;
	}
}

function Header({ column, title }: { column: Column<Transaction, unknown>; title?: string }) {
	return (
		<Button
			size={!title ? "icon" : undefined}
			variant={column.getIsSorted() ? "secondary" : "ghost"}
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

export const columns = (setTransactions: Dispatch<SetStateAction<Transaction[]>>): ColumnDef<Transaction>[] => [
	{
		accessorKey: "disabled",
		header: ({ column }) => <Header {...{ column }} />,
		cell: ({ row }) => (
			<Switch
				checked={!row.getValue("disabled")}
				onCheckedChange={(isToggled) =>
					setTransactions((value) =>
						value.map((tx) => (tx.name === row.getValue("name") ? { ...tx, disabled: !isToggled } : tx)),
					)
				}
				aria-label="Toggle transaction"
			/>
		),
	},
	{
		accessorKey: "name",
		header: ({ column }) => <Header {...{ column, title: "Transaction" }} />,
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
						<span style={{ position: "relative", top: 0.5 }}>{row.getValue("name")}</span>
					) : (
						<Input
							onFocus={handleFocus}
							onBlur={handleBlur}
							type="text"
							onChange={(event) => {
								const name = event.target.value;

								setTransactions((value) =>
									value.map((tx) => (tx.name === row.getValue("name") ? { ...tx, name } : tx)),
								);
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
		header: ({ column }) => <Header {...{ column, title: "Date" }} />,
		cell: ({ row, isRowHovered }) => (
			<div style={{ width: 135 }}>
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
								onSelect={(day) => {
									if (!day) return;

									setTransactions((value) =>
										value.map((tx) =>
											tx.name === row.getValue("name") ? { ...tx, date: day.setHours(0, 0, 0, 0) } : tx,
										),
									);
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
		header: ({ column }) => <Header {...{ column, title: "Recurrence" }} />,
		cell: ({ row, isRowHovered }) => {
			const val = row.original as Transaction;
			const [isRecurring, setIsRecurring] = useState(val.freq != null);
			const [isDropdownOpen, setDropDownOpen] = useState(false);
			const [isInputSelected, setInputSelected] = useState(false);

			const handleFocus = () => {
				setInputSelected(true);
			};

			const handleBlur = () => {
				setInputSelected(false);
			};

			return (
				<div className="flex items-center" style={{ width: 255, height: 36, justifySelf: "center" }}>
					{(row.original.disabled || !isRowHovered) && !isDropdownOpen && !isInputSelected ? (
						row.original.freq != null ? (
							// capitalize the E
							"E" + txRRule(row.original).toText().slice(1)
						) : (
							""
						)
					) : !isRecurring ? (
						<Button variant="outline" onClick={() => setIsRecurring(true)}>
							<PlusIcon />
						</Button>
					) : (
						<div className="flex flex-row items-center gap-2">
							Every
							<Input
								onFocus={handleFocus}
								onBlur={handleBlur}
								type="number"
								min="1"
								style={{ width: 60 }}
								value={val.interval ?? 1}
								onChange={(e) =>
									setTransactions((value) =>
										value.map((tx) =>
											tx.name === val.name
												? {
														...tx,
														interval: Number(e.target.value),
												  }
												: tx,
										),
									)
								}
								className="text-sm"
							/>
							<DropdownMenu modal onOpenChange={setDropDownOpen}>
								<DropdownMenuTrigger asChild>
									<Button
										variant="outline"
										className={cn("justify-start font-normal", val.freq == null && "text-muted-foreground")}
										style={{ width: "fit-content" }}
									>
										<span style={{ width: "100%", textAlign: val.freq == null ? "center" : "left" }}>
											{val.freq != null ? frequenciesStrings[frequenciesStrings.length - 1 - val.freq] : "Select"}
										</span>
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent className="justify-start text-left font-normal" style={{ width: "fit-content" }}>
									{frequenciesStrings.map((item, i) => (
										<DropdownMenuItem
											key={`freq-dropdown-item:${i}`}
											onClick={() =>
												setTransactions((value) =>
													value.map((tx) =>
														tx.name === val.name
															? {
																	...tx,
																	freq: frequencies[i],
															  }
															: tx,
													),
												)
											}
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
										value.map((tx) =>
											tx.name === val.name
												? {
														...tx,
														freq: undefined,
														interval: undefined,
												  }
												: tx,
										),
									);
								}}
							>
								<XIcon />
							</Button>
						</div>
					)}
				</div>
			);
		},
	},
	{
		accessorKey: "amount",
		header: ({ column }) => (
			<div className="text-right">
				<Header {...{ column, title: "Amount" }} />
			</div>
		),
		cell: ({ row, isRowHovered }) => {
			const [resetFlag] = useState(false);

			const numberAmount = parseFloat(row.getValue("amount"));
			const formattedString = formatMoney(numberAmount);

			// const [val, setVal] = useState(formattedString.slice(numberAmount < 0 ? 2 : 1));
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
						<span className="input-symbol" style={{ position: "relative", left: 13, bottom: 0.5 }}>
							<NumericInput
								onFocus={handleFocus}
								onBlur={handleBlur}
								onValidatedChange={(amount) => {
									if (amount !== 0) {
										setTransactions((value) =>
											value.map((tx) => (tx.name === row.getValue("name") ? { ...tx, amount } : tx)),
										);
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
			<div style={{ width: 90 }}>
				{isRowHovered && (
					<div className="text-right">
						<Button
							variant="outline"
							onClick={() => setTransactions((value) => value.filter((tx) => tx.name !== row.getValue("name")))}
						>
							<TrashIcon />
						</Button>
					</div>
				)}
			</div>
		),
	},
];
