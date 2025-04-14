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

import { TransactionForm } from "../TransactionForm";
import { Transaction } from "../transactions";

interface TransactionsTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[];
	transactions: TData[];
	setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
	pagination: PaginationState;
	setPagination: React.Dispatch<React.SetStateAction<PaginationState>>;
}

export function TransactionsTable<TData, TValue>({
	columns,
	transactions,
	setTransactions,
	pagination,
	setPagination,
}: TransactionsTableProps<TData, TValue>) {
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
						className="max-w-sm text-sm hide-box-shadow"
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
								table.getRowModel().rows.map((row, i) => <HoverableRow key={`row:${i}`} {...{ row, index: i }} />)
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


function AddTransaction({ setTransactions }: { setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>> }) {
	return (
		<Dialog modal>
			<DialogTrigger asChild>
				<Button className="tour-add-transaction" variant="outline" style={{ width: "fit-content" }}>
					<PlusIcon />
					Add Transaction
					<span className="sr-only">Add transaction</span>
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Add Transaction</DialogTitle>
				</DialogHeader>
				<TransactionForm {...{ setTransactions }} />
			</DialogContent>
		</Dialog>
	);
}

function HoverableRow<TData>({ row, index }: { row: Row<TData>; index: number }) {
	// Keep pointer event in state to detect hovering
	// When hovering, the inline editing UI is shown
	const [isRowHovered, setIsRowHovered] = React.useState(false);

	return (
		<TableRow
			className={index === 0 ? "tour-edit-transaction" : ""}
			key={row.id}
			data-state={row.getIsSelected() && "selected"}
			onMouseEnter={() => setIsRowHovered(true)}
			onMouseLeave={() => setIsRowHovered(false)}
		>
			{row.getVisibleCells().map((cell, i, arr) => {
				// The first cell (toggle switch) and last cell (trash can) are always enabled.
				const isDisabled = row.getValue("disabled") && i !== 0 && i !== arr.length - 1;

				return (
					<TableCell
						key={cell.id}
						style={{
							pointerEvents: isDisabled ? "none" : "inherit",
							opacity: row.getValue("disabled") && i !== 0 && i !== arr.length - 1 ? "0.5" : "inherit",
						}}
					>
						{flexRender(cell.column.columnDef.cell, { ...cell.getContext(), isRowHovered })}
					</TableCell>
				);
			})}
		</TableRow>
	);
}
