"use client";

import * as React from "react";
import { useSession, signIn, signOut } from "next-auth/react";

import { EyeOffIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon, XIcon } from "lucide-react";
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
	spreadsheetId: string | null;
	isDemoWarningClosed: boolean;
	setIsDemoWarningClosed: React.Dispatch<React.SetStateAction<boolean>>;
	isDemoMode: boolean;
	setIsDemoMode: React.Dispatch<React.SetStateAction<boolean>>;
	columns: ColumnDef<TData, TValue>[];
	transactions: TData[];
	setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
	pagination: PaginationState;
	setPagination: React.Dispatch<React.SetStateAction<PaginationState>>;
}

export function TransactionsTable<TData, TValue>({
	spreadsheetId,
	isDemoWarningClosed,
	setIsDemoWarningClosed,
	isDemoMode,
	setIsDemoMode,
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

	return !spreadsheetId ? (
		<div className="flex flex-col items-center gap-3">
			<>
				<SetUpWithGoogleSheetsButton {...{ spreadsheetId }} />
				or
				<Button variant="outline" onClick={() => setIsDemoMode(true)}>
					Continue in demo mode
				</Button>
			</>
		</div>
	) : (
		<div className="flex flex-col gap-4">
			<div>
				<a href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`}>[Go to linked Google Sheet]</a>
				<Button variant="outline" className="w-fit" onClick={() => signOut()}>
					Sign out
				</Button>
			</div>
			{isDemoMode && !isDemoWarningClosed && (
				<div className="relative rounded-md border p-6 self-center flex flex-col gap-4 items-center">
					<button
						onClick={() => setIsDemoWarningClosed(true)}
						// copied from Dialog.Close
						className="absolute top-4 right-4 ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
					>
						<XIcon />
						<span className="sr-only">Hide</span>
					</button>
					<p className="text-lg font-semibold absolute top-4">⚠️ Warning</p>
					<p className="mt-8">
						You are in demo mode. <span className="font-medium">Data will not save.</span>
					</p>
					<SetUpWithGoogleSheetsButton {...{ spreadsheetId }} />
				</div>
			)}
			<div className="flex gap-4">
				<AddTransaction {...{ spreadsheetId, setTransactions }} />
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
				<Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
					<ChevronLeftIcon />
				</Button>
				<Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
					<ChevronRightIcon />
				</Button>
			</div>
		</div>
	);
}

function AddTransaction({
	spreadsheetId,
	setTransactions,
}: {
	spreadsheetId: string | null;
	setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
}) {
	return (
		<Dialog modal>
			<DialogTrigger asChild>
				<Button className="tour-add-transaction" variant="outline" style={{ width: "fit-content" }}>
					<PlusIcon />
					Add transaction
					<span className="sr-only">Add transaction</span>
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Add transaction</DialogTitle>
				</DialogHeader>
				<TransactionForm {...{ spreadsheetId, setTransactions }} />
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

function SetUpWithGoogleSheetsButton({ spreadsheetId }: { spreadsheetId: string | null }) {
	const { data: session } = useSession();

	// source: https://github.com/arye321/nextauth-google-popup-login
	// @ts-ignore
	const popupCenter = (url, title) => {
		const dualScreenLeft = window.screenLeft ?? window.screenX;
		const dualScreenTop = window.screenTop ?? window.screenY;

		const width = window.innerWidth ?? document.documentElement.clientWidth ?? screen.width;

		const height = window.innerHeight ?? document.documentElement.clientHeight ?? screen.height;

		const systemZoom = width / window.screen.availWidth;

		const left = (width - 500) / 2 / systemZoom + dualScreenLeft;
		const top = (height - 550) / 2 / systemZoom + dualScreenTop;

		const newWindow = window.open(
			url,
			title,
			`width=${500 / systemZoom},height=${550 / systemZoom},top=${top},left=${left}`,
		);

		newWindow?.focus();
	};

	return !session ? (
		<Button variant="outline" className="w-fit" onClick={() => popupCenter("/google-signin", "Sign in with Google")}>
			Set up with Google Sheets
		</Button>
	) : (
		<>
			<p>Now copy the following green app email address:</p>
			<input value="green-330@green-456901.iam.gserviceaccount.com" readOnly />
			<p>
				Create a Google Sheet and share it with green-330@green-456901.iam.gserviceaccount.com as an Editor
				<a href="https://docs.google.com/spreadsheets/create" target="_blank" rel="noopener">
					[Click here to create a new Google Sheet in a new tab]
				</a>
			</p>
		</>
	);
}
