"use client";

import { myTransactions } from "./transactions";
import { columns } from "./columns";
import { DataTable } from "./data-table";

export default function TransactionsView() {
	return (
		<div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 16 }}>
			<div className="container mx-auto">
				Your transactions:
				<DataTable columns={columns} data={myTransactions} />
			</div>
		</div>
	);
}
