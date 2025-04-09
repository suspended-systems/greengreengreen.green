"use client";

import { Dispatch, SetStateAction } from "react";
import { Plus as PlusIcon } from "lucide-react";
import { ColumnDef, PaginationState } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { DataTable } from "./data-table";
import { Transaction } from "./transactions";

import { Copy } from "lucide-react";

export default function TransactionsView({
	columns,
	transactions,
	setTransactions,
	pagination,
	setPagination,
}: {
	columns: ColumnDef<Transaction>[];
	transactions: Transaction[];
	setTransactions: Dispatch<SetStateAction<Transaction[]>>;
	pagination: PaginationState;
	setPagination: React.Dispatch<React.SetStateAction<PaginationState>>;
}) {
	return (
		<>
			<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
				<div className="container mx-auto">
					<DataTable {...{ columns, transactions, setTransactions, pagination, setPagination }} />
				</div>
			</div>
			<div
				style={{
					position: "fixed",
					bottom: 32,
					right: 32,
				}}
			>
				<Button
					size="icon"
					className="inline-flex h-12 w-12 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2"
				>
					<PlusIcon />
					<span className="sr-only">Add transaction</span>
				</Button>
			</div>
		</>
	);
}
