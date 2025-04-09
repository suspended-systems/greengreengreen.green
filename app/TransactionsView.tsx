"use client";

import { Dispatch, SetStateAction } from "react";
import { Plus as PlusIcon } from "lucide-react";
import { ColumnDef, PaginationState } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

import { DataTable } from "./data-table";
import { Transaction } from "./transactions";
import { TransactionForm } from "./TransactionForm";

const AddTransaction = () => (
	<Dialog modal>
		<DialogTrigger asChild>
			<Button size="icon" className="inline-flex h-12 w-12 items-center justify-center rounded-full">
				<PlusIcon />
				<span className="sr-only">Add transaction</span>
			</Button>
			{/* <Button variant="outline">Add Transaction</Button> */}
		</DialogTrigger>
		<DialogContent>
			<DialogHeader>
				<DialogTitle>Add Transaction</DialogTitle>
				{/* <DialogDescription>Make changes to your profile here. Click save when you're done.</DialogDescription> */}
			</DialogHeader>
			<TransactionForm />
			{/* <DialogFooter>
				<Button type="submit">Submit</Button>
			</DialogFooter> */}
		</DialogContent>
	</Dialog>
);

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
				<AddTransaction />
			</div>
		</>
	);
}
