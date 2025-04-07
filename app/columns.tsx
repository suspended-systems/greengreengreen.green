"use client";

import { Dispatch, SetStateAction } from "react";
import { ArrowUpDown, MoreHorizontal, Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";

import { Transaction, txRRule } from "./transactions";
import { formatMoney } from "./utils";

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
				type={"text"}
				onChange={(event) => {
					const name = event.target.value;

					setTransactions((value) => value.map((tx) => (tx.name === row.getValue("name") ? { ...tx, name } : tx)));
				}}
				value={row.getValue("name")}
				placeholder="Enter a transaction name..."
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
						variant={"outline"}
						className={cn(
							"w-[240px] justify-start text-left font-normal",
							!row.getValue("date") && "text-muted-foreground",
						)}
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
		accessorFn: (tx) => {
			if (!tx.freq) {
				return;
			}

			return txRRule(tx).toText();
		},
		header: "Recurring",
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
						type={"number"}
						onChange={(event) => {
							const amount = Number(event.target.value);

							setTransactions((value) =>
								value.map((tx) => (tx.name === row.getValue("name") ? { ...tx, amount } : tx)),
							);
						}}
						value={row.getValue("amount")}
						placeholder="Enter a start value..."
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
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" className="h-8 w-8 p-0">
								<span className="sr-only">Open menu</span>
								<MoreHorizontal className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuLabel>Actions</DropdownMenuLabel>
							{/* <DropdownMenuItem onClick={() => navigator.clipboard.writeText(payment.id)}>
							Copy payment ID
						</DropdownMenuItem> */}
							{/* <DropdownMenuSeparator /> */}
							{/* <DropdownMenuItem>View customer</DropdownMenuItem> */}
							{/* <DropdownMenuItem>View payment details</DropdownMenuItem> */}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			);
		},
	},
];
