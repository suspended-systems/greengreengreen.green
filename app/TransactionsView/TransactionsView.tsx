"use client";

import * as React from "react";
import { signOut, useSession } from "next-auth/react";

import {
	EyeOffIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	PlusIcon,
	RefreshCcwIcon,
	SquareArrowOutUpRightIcon,
	LucideProps,
	CogIcon,
} from "lucide-react";
import { toast } from "sonner";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Money from "@/components/Money";
import { ModeSwitcher } from "@/components/ModeSwitcher";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import SheetsSetupBanner from "@/components/SheetsSetupBanner";

import { AddTransactionForm } from "./AddTransactionForm";
import { Transaction } from "../transactions";
import getSheetsData from "../sheets";
import { useApp } from "../AppContext";

export function TransactionsView({
	isDemoWarningClosed,
	columns,
	pagination,
	setPagination,
}: {
	isDemoWarningClosed: boolean;
	columns: ColumnDef<Transaction, any>[];
	pagination: PaginationState;
	setPagination: React.Dispatch<React.SetStateAction<PaginationState>>;
}) {
	const { spreadsheetId, transactions, setTransactions, setStartDate, setStartAmount } = useApp();
	const [pullSheetsLoading, setPullSheetsLoading] = React.useState(false);

	const { data: session } = useSession();
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

	const { pageIndex, pageSize } = table.getState().pagination;
	const totalRows = table.getFilteredRowModel().rows.length;
	const startRow = pageIndex * pageSize + 1;
	const endRow = pageIndex * pageSize + table.getRowModel().rows.length;

	return (
		<>
			<div className="max-w-5xl mx-auto flex flex-col gap-4 pb-4 pt-4 px-2 md:px-4">
				{/* Sheets setup / demo warning info banner */}
				<SheetsSetupBanner isDemoWarningClosed={isDemoWarningClosed} />
				<div className="flex gap-4">
					<AddTransaction />
					<Input
						placeholder="Search..."
						value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
						onChange={(event) => table.getColumn("name")?.setFilterValue(event.target.value)}
						className="text-sm"
					/>
					{spreadsheetId && (
						<Button
							variant="outline"
							onClick={() => window.open(`https://docs.google.com/spreadsheets/d/${spreadsheetId}`, "_blank")}
						>
							<SquareArrowOutUpRightIcon />
							<span className="hidden md:block">Open in Sheets</span>
						</Button>
					)}
					{spreadsheetId && (
						<Button
							variant="outline"
							onClick={async () => {
								const spinStart = Date.now();
								setPullSheetsLoading(true);

								try {
									await getSheetsData({ tz: Intl.DateTimeFormat().resolvedOptions().timeZone }).then((data) => {
										if (typeof data !== "string" && data) {
											const {
												transactions: spreadsheetTransactions,
												startDate: spreadsheetStartDate,
												startAmount: spreadsheetStartValue,
												malformedTransactions,
											} = data;

											if (spreadsheetStartDate) setStartDate(spreadsheetStartDate);
											if (spreadsheetStartValue) setStartAmount(spreadsheetStartValue);
											setTransactions(spreadsheetTransactions);

											toast("✅ Successfully imported Sheets transactions", {
												// This runs once the success-toast’s duration elapses
												onAutoClose() {
													if (malformedTransactions?.length) {
														toast(`⚠️ Sheet contains ${malformedTransactions.length} malformed transaction(s)`);
													}
												},
											});
										}
									});
								} finally {
									// how long since we kicked off the spin?
									const elapsed = (Date.now() - spinStart) % 1000;
									// wait until the end of that 1 s cycle so the animation completes fully
									setTimeout(() => setPullSheetsLoading(false), 1000 - elapsed);
								}
							}}
						>
							<RefreshCcwIcon
								className={`transition-transform duration-200 ${pullSheetsLoading ? "animate-spin" : ""}`}
							/>
							<span className="hidden md:block">Pull Sheets Changes</span>
							<span className="sr-only">Sync from Google Sheets</span>
						</Button>
					)}
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
				<div className="rounded-xl border bg-card">
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
									<TableCell
										colSpan={columns.length}
										className="h-24 text-center min-w-[970px]" // cheaphax: match empty table width with the dynamic computed width of the columns so the table doesn't change size when searching
									>
										No results.
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>
				<div className="w-full flex items-center justify-between">
					<span className="flex-1 text-sm text-muted-foreground">
						Showing {startRow}–{endRow} of {totalRows}
					</span>
					<div className="flex items-center space-x-2">
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

				{/* settings cog (night mode toggle/sign out) */}
				<div className="mt-4 self-end">
					<Popover>
						<PopoverTrigger asChild>
							<Button variant="outline" className="text-muted-foreground">
								<CogIcon />
								App Settings
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-fit flex flex-col gap-4 justify-center">
							<ModeSwitcher />
							<div className="flex flex-col gap-4 mx-auto">
								{session ? (
									<>
										<span className="text-sm text-muted-foreground">Signed in to {session.user?.email}</span>
										<Button
											variant="outline"
											className="w-fit"
											style={{ alignSelf: "flex-end", color: "#c75757" }}
											onClick={() => signOut()}
										>
											Sign out
										</Button>
									</>
								) : (
									<>
										<SetUpWithGoogleSheetsButton />
									</>
								)}
							</div>
						</PopoverContent>
					</Popover>
				</div>
			</div>
		</>
	);
}

function AddTransaction() {
	const { spreadsheetId, setTransactions } = useApp();
	return (
		<Dialog modal>
			<DialogTrigger asChild>
				<Button className="tour-add-transaction" variant="outline" style={{ width: "fit-content" }}>
					<PlusIcon />
					<span className="hidden md:block">Add transaction</span>
					<span className="sr-only">Add transaction</span>
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Add transaction</DialogTitle>
				</DialogHeader>
				<AddTransactionForm spreadsheetId={spreadsheetId} setTransactions={setTransactions} />
			</DialogContent>
		</Dialog>
	);
}

function HoverableRow({ row, index }: { row: Row<Transaction>; index: number }) {
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

export function SetUpWithGoogleSheetsButton() {
	// source: https://github.com/arye321/nextauth-google-popup-login
	const popupCenter = (url: string, title: string) => {
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

	return (
		<div>
			<Button variant="outline" className="w-fit" onClick={() => popupCenter("/google-signin", "Sign in with Google")}>
				<div className="gsi-material-button-icon">
					<svg
						version="1.1"
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 48 48"
						xmlnsXlink="http://www.w3.org/1999/xlink"
						style={{ display: "block" }}
					>
						<path
							fill="#EA4335"
							d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
						></path>
						<path
							fill="#4285F4"
							d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
						></path>
						<path
							fill="#FBBC05"
							d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
						></path>
						<path
							fill="#34A853"
							d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
						></path>
						<path fill="none" d="M0 0h48v48H0z"></path>
					</svg>
				</div>
				<span className="pl-1">Sign in with Google</span>
			</Button>
		</div>
	);
}

function StatsBox({
	title,
	Icon,
	annually,
}: {
	title: "Incoming" | "Outgoing" | "Net";
	Icon: React.ForwardRefExoticComponent<LucideProps>;
	annually: number;
}) {
	const monthly = annually / 12;
	const daily = annually / 365;

	const StatsRow = ({ unit, amount }: { unit: string; amount: number }) => (
		<>
			<div className="font-bold text-right text-2xl">
				<Money {...{ amount }} />
			</div>

			<div className="text-muted-foreground text-lg">{unit}</div>
		</>
	);

	return (
		<div className="bg-card rounded-xl border">
			<Icon size={16} />
			{title}

			<StatsRow unit="/day" amount={daily} />
			<StatsRow unit="/mo" amount={monthly} />
		</div>
	);
}
