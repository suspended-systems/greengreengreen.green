"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { myTransactions } from "./transactions";

export default function TransactionsView() {
	return (
		<div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 16 }}>
			Your transactions:
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead className="w-[100px]">Transaction</TableHead>
						<TableHead>Date</TableHead>
						<TableHead>Recurs every</TableHead>
						<TableHead className="text-right">Amount</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{myTransactions.map((tx, i) => (
						<TableRow key={`td:${i}:${tx.name}`}>
							<TableCell className="font-medium">{tx.name}</TableCell>
							<TableCell>{new Date(tx.date).toLocaleDateString()}</TableCell>
							<TableCell>{tx.recurringEveryXDays ? `${tx.recurringEveryXDays} days` : ""}</TableCell>
							<TableCell className="text-right" style={{ color: tx.amount > -1 ? "green" : "red" }}>
								{tx.amount > -1 ? "+" : "-"}${Math.abs(tx.amount)}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
