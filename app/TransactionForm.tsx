"use client";

import { useState } from "react";
import { CalendarIcon, PlusIcon, XIcon } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import NumericInput from "@/components/NumericInput";

import { frequenciesStrings, GreenColor } from "../app/utils";
import { Transaction, txRRule } from "../app/transactions";
import { Frequency } from "rrule";
import { appendSheetsRow } from "./sheets";

const FormSchema = z.object({
	txname: z.string().nonempty("Name can't be empty."),
	date: z.date(),
	// Optional string number greater than 0
	recurringInterval: z.union([
		z
			.string()
			.nonempty()
			.refine((s) => Number(s) >= 1, "Interval must be greater than zero."),
		z.literal(""),
	]),
	// Optional string appearing in `frequenciesStrings`
	// @ts-ignore: poor zod types
	recurringFrequency: z.union([...frequenciesStrings.map(z.literal), z.literal("")]),
	// Required nonzero string number
	amount: z
		.string()
		.nonempty("Amount can't be empty.")
		.refine((s) => Number(s) !== 0, {
			message: "Amount can't be zero.",
		}),
});

export function TransactionForm({
	spreadsheetId,
	setTransactions,
}: {
	spreadsheetId: string | null;
	setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
}) {
	// This flag toggles whenever you reset the form.
	const [resetCounter, setResetCounter] = useState(0);
	const [isRecurring, setIsRecurring] = useState(false);

	const form = useForm<z.infer<typeof FormSchema>>({
		resolver: zodResolver(FormSchema),
		defaultValues: {
			txname: "",
			// date: new Date(),
			recurringInterval: "",
			recurringFrequency: "",
			amount: "",
		},
	});

	async function onSubmit(data: z.infer<typeof FormSchema>) {
		const transaction: Transaction = {
			name: data.txname,
			amount: Number(data.amount),
			date: data.date.getTime(),
			...(data.recurringFrequency && {
				freq: {
					days: Frequency.DAILY,
					weeks: Frequency.WEEKLY,
					months: Frequency.MONTHLY,
					years: Frequency.YEARLY,
				}[data.recurringFrequency as "days" | "weeks" | "months" | "years"],
				interval: data.recurringInterval ? parseFloat(data.recurringInterval) : 1,
			}),
		};
		setTransactions((value) => [transaction, ...value]);

		if (spreadsheetId) {
			await appendSheetsRow(spreadsheetId, [
				transaction.name,
				transaction.amount,
				// date is sent in a reliable YYYY-MM-DD format so it get's picked up as a date in Sheets
				new Date(transaction.date).toISOString().split("T")[0],
				transaction.freq ? txRRule(transaction).toText() : "",
				!transaction.disabled,
			]);
		}

		form.reset();

		setResetCounter((prevCount) => prevCount + 1);

		toast(`Added new transaction "${data.txname}"`);
	}

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 flex flex-col">
				<FormField
					control={form.control}
					name="txname"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Name</FormLabel>
							<FormControl>
								<Input autoComplete="off" placeholder="Concert tickets" {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="date"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Date</FormLabel>
							<FormControl>
								<Popover modal>
									<PopoverTrigger asChild>
										<Button
											variant="outline"
											className={cn(
												"justify-start text-left font-normal text-md md:text-sm",
												!field.value && "text-muted-foreground",
											)}
										>
											<CalendarIcon />
											{field.value ? new Date(field.value).toLocaleDateString() : "Select a date"}
										</Button>
									</PopoverTrigger>
									<PopoverContent className="w-auto p-0" align="start">
										<Calendar
											mode="single"
											selected={field.value}
											initialFocus
											className="rounded-md border shadow"
											onDayClick={field.onChange}
										/>
									</PopoverContent>
								</Popover>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<div className="grid gap-2">
					<div className="text-sm">
						<span className="font-medium">Recurrence</span>
						<span style={{ fontWeight: 300 }}> (optional)</span>
					</div>
					{!isRecurring ? (
						<Button variant="outline" onClick={() => setIsRecurring(true)} style={{ width: "fit-content" }}>
							<PlusIcon />
						</Button>
					) : (
						<div className="flex flex-row items-center gap-1">
							<span className="text-md md:text-sm">Every</span>
							<FormField
								control={form.control}
								name="recurringInterval"
								render={({ field }) => (
									<FormItem>
										<FormControl>
											<Input
												type="number"
												inputMode="numeric"
												min="1"
												placeholder="1"
												// to line up with others and not expand the modal width
												className="w-[71px] md:w-[76px]"
												{...field}
											/>
										</FormControl>
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="recurringFrequency"
								render={({ field }) => (
									<FormItem>
										<FormControl>
											<DropdownMenu modal>
												<DropdownMenuTrigger asChild>
													<Button
														variant="outline"
														className={cn(
															"justify-start font-normal text-md md:text-sm",
															!field.value && "text-muted-foreground",
														)}
														style={{ width: 90 }}
													>
														<span style={{ width: "100%", textAlign: field.value ? "left" : "center" }}>
															{field.value || "Select"}
														</span>
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent className="justify-start text-left font-normal" style={{ width: 155 }}>
													{frequenciesStrings.map((item, i) => (
														<DropdownMenuItem
															key={`freq-dropdown-item:${i}`}
															onClick={() => field.onChange(frequenciesStrings[i])}
														>
															{item}
														</DropdownMenuItem>
													))}
												</DropdownMenuContent>
											</DropdownMenu>
										</FormControl>
									</FormItem>
								)}
							/>
							<Button
								variant="outline"
								onClick={() => {
									setIsRecurring(false);
									form.setValue("recurringFrequency", "");
									form.setValue("recurringInterval", "");
								}}
							>
								<XIcon />
							</Button>
						</div>
					)}
				</div>
				<FormField
					control={form.control}
					name="amount"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Amount</FormLabel>
							<FormControl>
								<span className="input-symbol">
									<>
										<NumericInput
											key={resetCounter}
											style={{
												color:
													Number(field.value.replaceAll(",", "")) > 0
														? GreenColor
														: Number(field.value.replaceAll(",", "")) < 0
														? "red"
														: "inherit",
												// to line up with others and not expand the modal width
												width: 210,
											}}
											initialValue={field.value}
											placeholder="-80"
											className="justify-start text-left font-normal"
											onValidatedChange={(amount) => field.onChange({ target: { value: String(amount) } })}
											{...field}
										/>
									</>
								</span>
							</FormControl>
							<FormDescription>Enter a negative amount for an expense.</FormDescription>
							<FormMessage />
						</FormItem>
					)}
				/>
				<Button type="submit" style={{ width: "fit-content", alignSelf: "center" }}>
					Submit
				</Button>
			</form>
		</Form>
	);
}
