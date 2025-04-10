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
		header: "",
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
		header: "Transaction",
		cell: ({ row }) => (
			<Input
				type="text"
				onChange={(event) => {
					const name = event.target.value;

					setTransactions((value) => value.map((tx) => (tx.name === row.getValue("name") ? { ...tx, name } : tx)));
				}}
				value={row.getValue("name")}
				placeholder="Enter a transaction name..."
				style={{ width: "fit-content" }}
			/>
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
		cell: ({ row }) => (
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
								value.map((tx) => (tx.name === row.getValue("name") ? { ...tx, date: day.setHours(0, 0, 0, 0) } : tx)),
							);
						}}
						initialFocus
						className="rounded-md border shadow"
					/>
				</PopoverContent>
			</Popover>
		),
	},
	{
		accessorKey: "freq",
		header: "Recurrence",
		cell: ({ row }) => {
			const val = row.original as Transaction;
			const [isRecurring, setIsRecurring] = useState(val.freq != null);

			return !isRecurring ? (
				<Button variant="outline" onClick={() => setIsRecurring(true)}>
					<PlusIcon />
				</Button>
			) : (
				<div className="flex flex-row items-center gap-2">
					<span className="text-md md:text-sm">Every</span>
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
					/>
					<DropdownMenu modal>
						<DropdownMenuTrigger asChild>
							<Button
								variant="outline"
								className={cn(
									"justify-start font-normal text-md md:text-sm",
									val.freq == null && "text-muted-foreground",
								)}
								style={{ width: "fit-content" }}
							>
								<span style={{ width: "100%", textAlign: val.freq == null ? "center" : "left" }}>
									{val.freq
										? { DAILY: "days", WEEKLY: "weeks", MONTHLY: "months", YEARLY: "years" }[Frequency[val.freq]]
										: "Select a frequency"}
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
			);
		},
	},
	{
		accessorKey: "amount",
		// header: () => <div className="text-right">Amount</div>,
		header: "Amount",
		cell: ({ row }) => {
			const amount = parseFloat(row.getValue("amount"));
			const formatted = formatMoney(amount);

			return (
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
						style={{
							minWidth: 144,
							color: amount > 0 ? "green" : amount < 0 ? "red" : "inherit",
						}}
					/>
				</span>
			);
		},
	},
	{
		id: "actions",
		cell: ({ row }) => {
			// const payment = row.original;

			return (
				<div className="text-right">
					<Button
						variant="outline"
						onClick={() => setTransactions((value) => value.filter((tx) => tx.name !== row.getValue("name")))}
					>
						<TrashIcon />
					</Button>
				</div>
			);
		},
	},
];
