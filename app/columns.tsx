"use client";

import { ArrowUpDown, MoreHorizontal } from "lucide-react";

import { ColumnDef } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Transaction, txRRule } from "./transactions";
import { formatMoney } from "./utils";
import { Dispatch, SetStateAction } from "react";

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
		cell: ({ row }) => <div>{new Date(row.getValue("date")).toLocaleDateString()}</div>,
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
		header: () => <div className="text-right">Amount</div>,
		cell: ({ row }) => {
			const amount = parseFloat(row.getValue("amount"));
			const formatted = formatMoney(amount);

			return (
				<div
					className="text-right font-medium"
					style={{ color: parseFloat(row.getValue("amount")) > -1 ? "green" : "red" }}
				>
					{formatted}
				</div>
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
