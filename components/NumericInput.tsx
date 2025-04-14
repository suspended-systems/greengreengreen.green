import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { DiffIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NumericInput({
	className,
	initialValue,
	onValidatedChange,
	...props
}: React.ComponentProps<"input"> & {
	initialValue: string;
	onValidatedChange?: (amount: number) => void;
	resetFlag?: any;
}) {
	// We remove commas to keep the editing experience seamless
	const [value, setValue] = useState(initialValue.replaceAll(",", ""));

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = e.target.value;

		updateValue(newValue);
	};

	const updateValue = (newValue: string) => {
		if (newValue === "") {
			setValue("");
			return;
		}

		if (/^-?\d*(?:\.\d{0,2})?$/.test(newValue)) {
			setValue(newValue);
			onValidatedChange?.(Number(newValue));
			return;
		}
	};

	return (
		<div className="flex gap-1">
			<input
				style={props.style}
				placeholder={props.placeholder}
				onFocus={props.onFocus}
				onBlur={props.onBlur}
				type="text"
				inputMode="numeric"
				value={value}
				onChange={handleChange}
				className={cn(
					"file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
					// disabled because
					// 1.) it gets cut off in a horizontally scrolling container if input is touching y0
					// 2.) meh i like this styling better more distraction free
					// "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
					"aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
					className,
				)}
			/>
			<Button variant="outline" onClick={() => updateValue(value.indexOf("-") !== -1 ? value.slice(1) : "-" + value)}>
				<DiffIcon />
			</Button>
		</div>
	);
}
