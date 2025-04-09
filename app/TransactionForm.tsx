"use client";

import { Calendar as CalendarIcon } from "lucide-react";
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

const frequencies = ["days", "weeks", "months", "years"];

const FormSchema = z.object({
	name: z.string().nonempty("Name can't be empty."),
	date: z.date(),
	recurringInterval: z.union([
		z
			.string()
			.nonempty()
			.refine((s) => Number(s) >= 1, "Interval must be greater than zero."),
		z.literal(""),
	]),
	// @ts-ignore silly zod
	recurringFrequency: z.union([...frequencies.map(z.literal), z.literal("")]),
	amount: z
		.string()
		.nonempty("Amount can't be empty.")
		.refine((s) => Number(s) !== 0, {
			message: "Amount can't be zero.",
		}),
});

export function TransactionForm() {
	const form = useForm<z.infer<typeof FormSchema>>({
		resolver: zodResolver(FormSchema),
		defaultValues: {
			name: "",
			// date: new Date(),
			recurringInterval: "",
			recurringFrequency: "",
			amount: "",
		},
	});

	function onSubmit(data: z.infer<typeof FormSchema>) {
		toast(`Added new transaction "${data.name}"`);
	}

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 flex flex-col">
				<FormField
					control={form.control}
					name="name"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Name</FormLabel>
							<FormControl>
								<Input placeholder="Concert tickets" {...field} />
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
											{field.value && new Date(field.value) ? (
												new Date(field.value).toLocaleDateString()
											) : (
												<span>Select a date</span>
											)}
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
						<span className="font-medium">Recurring</span>
						<span style={{ fontWeight: 300 }}> (optional)</span>
					</div>
					<div className="flex flex-row items-center gap-2">
						<span className="text-md md:text-sm">Every</span>
						<FormField
							control={form.control}
							name="recurringInterval"
							render={({ field }) => (
								<FormItem>
									{/* <FormLabel>Recurring interval</FormLabel> */}
									<FormControl>
										<Input type="number" min="1" placeholder="1" {...field} />
									</FormControl>
									{/* <FormMessage /> */}
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="recurringFrequency"
							render={({ field }) => (
								<FormItem>
									{/* <FormLabel>Recurring frequency</FormLabel> */}
									<FormControl>
										<DropdownMenu modal>
											<DropdownMenuTrigger asChild>
												<Button
													variant="outline"
													className={cn(
														"justify-start text-left font-normal text-md md:text-sm",
														!field.value && "text-muted-foreground",
													)}
												>
													{field.value || "Select a frequency"}
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent className="justify-start text-left font-normal">
												{frequencies.map((item, i) => (
													<DropdownMenuItem
														key={`freq-dropdown-item:${i}`}
														onClick={() => field.onChange(frequencies[i])}
													>
														{item}
													</DropdownMenuItem>
												))}
											</DropdownMenuContent>
										</DropdownMenu>
									</FormControl>
									{/* <FormMessage /> */}
								</FormItem>
							)}
						/>
					</div>
				</div>
				<FormField
					control={form.control}
					name="amount"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Amount</FormLabel>
							<FormControl>
								<span className="input-symbol">
									<Input type="number" placeholder="-80" className="justify-start text-left font-normal" {...field} />
								</span>
							</FormControl>
							<FormDescription>Enter a negative value for an expense.</FormDescription>
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
