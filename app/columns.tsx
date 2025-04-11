"use client";

import { Dispatch, SetStateAction, useState } from "react";
import { ArrowUpDown, Calendar as CalendarIcon, Trash as TrashIcon, Plus as PlusIcon, X as XIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { ColumnDef } from "@tanstack/react-table";
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

import { Transaction, txRRule } from "./transactions";
import { formatMoney, frequencies, frequenciesStrings } from "./utils";
import { Frequency } from "rrule";

export const columns = (setTransactions: Dispatch<SetStateAction<Transaction[]>>): ColumnDef<Transaction>[] => [
	{
		accessorKey: "disabled",
		header: ({ column }) => {
			return (
				<Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
					<ArrowUpDown className="ml-2 h-4 w-4" />
				</Button>
			);
		},
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
		header: ({ column }) => {
			return (
				<Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
					Transaction
					<ArrowUpDown className="ml-2 h-4 w-4" />
				</Button>
			);
		},
		// @ts-ignore custom cell context `isRowHovered`
		cell: ({ row, isRowHovered }) => (
			<div style={{ width: 240 }}>
				{row.original.disabled || !isRowHovered ? (
					row.getValue("name")
				) : (
					<Input
						type="text"
						onChange={(event) => {
							const name = event.target.value;

							setTransactions((value) => value.map((tx) => (tx.name === row.getValue("name") ? { ...tx, name } : tx)));
						}}
						value={row.getValue("name")}
						placeholder="Enter a transaction name..."
						style={{ width: "fit-content" }}
						className="text-sm"
					/>
				)}
			</div>
		),
	},
	{
		accessorKey: "date",
		header: ({ column }) => {
			return (
				<Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
					Date
					<ArrowUpDown className="ml-2 h-4 w-4" />
				</Button>
			);
		},
		// @ts-ignore custom cell context `isRowHovered`
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
								style={{ width: "fit-content" }}
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
		accessorFn: (og) => {
			return !og.freq ? undefined : `${og.freq}:${og.interval}`;
		},
		header: ({ column }) => {
			return (
				<Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
					Recurrence
					<ArrowUpDown className="ml-2 h-4 w-4" />
				</Button>
			);
		},
		// @ts-ignore custom cell context `isRowHovered`
		cell: ({ row, isRowHovered }) => {
			const val = row.original as Transaction;
			const [isRecurring, setIsRecurring] = useState(val.freq != null);
			const [isDropdownOpen, setDropDownOpen] = useState(false);

			return (
				<div className="flex items-center" style={{ width: 255, height: 36, justifySelf: "center" }}>
					{(row.original.disabled || !isRowHovered) && !isDropdownOpen ? (
						row.original.freq ? (
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
								type="number"
								min="1"
								// placeholder="1"
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
											{val.freq
												? { DAILY: "days", WEEKLY: "weeks", MONTHLY: "months", YEARLY: "years" }[Frequency[val.freq]]
												: "Select"}
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
		header: ({ column }) => {
			return (
				<div className="text-right">
					<Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
						Amount
						<ArrowUpDown className="ml-2 h-4 w-4" />
					</Button>
				</div>
			);
		},
		// header: "Amount",
		// @ts-ignore custom cell context `isRowHovered`
		cell: ({ row, isRowHovered }) => {
			const amount = parseFloat(row.getValue("amount"));
			const formatted = formatMoney(amount);

			return (
				<div className="flex justify-end" style={{ width: 180, marginLeft: "auto" }}>
					{row.original.disabled || !isRowHovered ? (
						<span style={{ color: parseFloat(row.getValue("amount")) > -1 ? "green" : "red" }}>
							{parseFloat(row.getValue("amount")) > -1 && "+"}
							{formatted}
						</span>
					) : (
						// <div
						// 	className="text-right font-medium"
						// 	style={{ color: parseFloat(row.getValue("amount")) > -1 ? "green" : "red" }}
						// >
						// 	{formatted}
						// </div>
						<span className="input-symbol">
							<Input
								type="number"
								onChange={(event) => {
									const amount = Number(event.target.value);

									setTransactions((value) =>
										value.map((tx) => (tx.name === row.getValue("name") ? { ...tx, amount } : tx)),
									);
								}}
								value={row.getValue("amount")}
								placeholder="Enter a start value..."
								className="text-sm"
								style={{
									minWidth: 144,
									color: amount > 0 ? "green" : amount < 0 ? "red" : "inherit",
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
		// @ts-ignore custom cell context `isRowHovered`
		cell: ({ row, isRowHovered }) => {
			// const payment = row.original;

			return (
				<div style={{ width: 55 }}>
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
			);
		},
	},
];
