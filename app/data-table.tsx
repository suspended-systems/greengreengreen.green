"use client";

import * as React from "react";

import {
	EyeOff as EyeOffIcon,
	ChevronLeft as ChevronLeftIcon,
	ChevronRight as ChevronRightIcon,
	Plus as PlusIcon,
} from "lucide-react";
import {
	ColumnDef,
	ColumnFiltersState,
	PaginationState,
	Row,
	SortingState,
	VisibilityState,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable,
} from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { TransactionForm } from "./TransactionForm";
import { Transaction } from "./transactions";

const AddTransaction = ({
	setTransactions,
}: {
	setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
}) => (
	<Dialog modal>
		<DialogTrigger asChild>
			<Button variant="outline" style={{ width: "fit-content" }}>
				<PlusIcon />
				Add Transaction
				<span className="sr-only">Add transaction</span>
			</Button>
		</DialogTrigger>
		<DialogContent>
			<DialogHeader>
				<DialogTitle>Add Transaction</DialogTitle>
				{/* <DialogDescription>Make changes to your profile here. Click save when you're done.</DialogDescription> */}
			</DialogHeader>
			<TransactionForm {...{ setTransactions }} />
			{/* <DialogFooter>
				<Button type="submit">Submit</Button>
			</DialogFooter> */}
		</DialogContent>
	</Dialog>
);

interface DataTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[];
	transactions: TData[];
	setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
	pagination: PaginationState;
	setPagination: React.Dispatch<React.SetStateAction<PaginationState>>;
}

function HoverableRow<TData>({ row }: { row: Row<TData> }) {
	const [isRowHovered, setIsRowHovered] = React.useState(false);

	return (
		<TableRow
			key={row.id}
			data-state={row.getIsSelected() && "selected"}
			onMouseEnter={() => setIsRowHovered(true)}
			onMouseLeave={() => setIsRowHovered(false)}
		>
			{row.getVisibleCells().map((cell, i, arr) => (
				<TableCell
					key={cell.id}
					// Prevent clicks on a disabled row. But do allow clicks on the switch to enable the row (0th column). And the trash button (last column).
					style={{
						pointerEvents: row.getValue("disabled") && i !== 0 && i !== arr.length - 1 ? "none" : "inherit",
						opacity: row.getValue("disabled") && i !== 0 && i !== arr.length - 1 ? "0.5" : "inherit",
					}}
				>
					{flexRender(cell.column.columnDef.cell, { ...cell.getContext(), isRowHovered })}
				</TableCell>
			))}
		</TableRow>
	);
}

export function DataTable<TData, TValue>({
	columns,
	transactions,
	setTransactions,
	pagination,
	setPagination,
}: DataTableProps<TData, TValue>) {
	const [sorting, setSorting] = React.useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
	const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});

	const table = useReactTable({
		data: transactions,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		onSortingChange: setSorting,
		getSortedRowModel: getSortedRowModel(),
		onColumnFiltersChange: setColumnFilters,
		getFilteredRowModel: getFilteredRowModel(),
		onColumnVisibilityChange: setColumnVisibility,
		onPaginationChange: setPagination,
		state: {
			pagination,
			sorting,
			columnFilters,
			columnVisibility,
		},
		autoResetPageIndex: false,
	});

	return (
		<>
			<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
				<div className="flex gap-4">
					<AddTransaction {...{ setTransactions }} />
					<Input
						placeholder="Search..."
						value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
						onChange={(event) => table.getColumn("name")?.setFilterValue(event.target.value)}
						className="max-w-sm text-sm"
					/>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline" className="ml-auto">
								<EyeOffIcon />
								<span className="sr-only">Toggle transaction table columns</span>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							{table
								.getAllColumns()
								.filter((column) => column.getCanHide())
								.map((column) => {
									return (
										<DropdownMenuCheckboxItem
											key={column.id}
											className="capitalize"
											checked={column.getIsVisible()}
											onCheckedChange={(value) => column.toggleVisibility(!!value)}
										>
											{
												{
													disabled: "Toggle",
													name: "Name",
													date: "Date",
													freq: "Recurrence",
													amount: "Amount",
													actions: "Delete",
												}[column.id]
											}
										</DropdownMenuCheckboxItem>
									);
								})}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
				<div className="rounded-md border">
					<Table>
						<TableHeader>
							{table.getHeaderGroups().map((headerGroup) => (
								<TableRow key={headerGroup.id}>
									{headerGroup.headers.map((header) => {
										return (
											<TableHead key={header.id}>
												{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
											</TableHead>
										);
									})}
								</TableRow>
							))}
						</TableHeader>
						<TableBody>
							{table.getRowModel().rows?.length ? (
								table.getRowModel().rows.map((row, i) => <HoverableRow key={`row:${i}`} {...{ row }} />)
							) : (
								<TableRow>
									<TableCell colSpan={columns.length} className="h-24 text-center">
										No results.
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>
				<div className="flex items-center justify-end space-x-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => table.previousPage()}
						disabled={!table.getCanPreviousPage()}
					>
						<ChevronLeftIcon />
					</Button>
					<Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
						<ChevronRightIcon />
					</Button>
				</div>
			</div>
		</>
	);
}
