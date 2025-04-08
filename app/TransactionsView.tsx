"use client";

import { Dispatch, SetStateAction, useState } from "react";

import { ColumnDef, PaginationState } from "@tanstack/react-table";

import { DataTable } from "./data-table";
import { Transaction } from "./transactions";

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
		<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
			<div className="container mx-auto">
				<DataTable {...{ columns, transactions, setTransactions, pagination, setPagination }} />
			</div>
		</div>
	);
}
