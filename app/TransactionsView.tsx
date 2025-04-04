"use client";

import { Dispatch, SetStateAction } from "react";
import { columns } from "./columns";
import { DataTable } from "./data-table";
import { Transaction } from "./transactions";

export default function TransactionsView({
	transactions,
	setTransactions,
}: {
	transactions: Transaction[];
	setTransactions: Dispatch<SetStateAction<Transaction[]>>;
}) {
	return (
		<div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 16 }}>
			<div className="container mx-auto">
				<DataTable {...{ columns, transactions, setTransactions }} />
			</div>
		</div>
	);
}
