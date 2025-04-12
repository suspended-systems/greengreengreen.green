"use client";

import { Dispatch, SetStateAction } from "react";
import { ColumnDef, PaginationState } from "@tanstack/react-table";

import { DataTable } from "./DataTable";
import { Transaction } from "../app/transactions";

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
		<div className="container mx-auto">
			<DataTable {...{ columns, transactions, setTransactions, pagination, setPagination }} />
		</div>
	);
}
