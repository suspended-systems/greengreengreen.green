import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { DiffIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NumericInput({
	value,
	onValidatedChange,
	className,
	style,
	placeholder,
	onFocus,
	onBlur,
}: {
	value: string;
	onValidatedChange?: (amount: number) => void;
	className?: string;
	style?: React.CSSProperties;
	placeholder?: string;
	onFocus?: React.FocusEventHandler<HTMLInputElement>;
	onBlur?: React.FocusEventHandler<HTMLInputElement>;
}) {
	// local draft so we can edit “12.” etc
	const [draft, setDraft] = useState(value);
	// are we in the middle of typing?
	const [isFocused, setIsFocused] = useState(false);

	// whenever the parent’s value changes, **only** overwrite when not focused
	useEffect(() => {
		if (!isFocused) {
			setDraft(value);
		}
	}, [value, isFocused]);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const str = e.target.value;
		// allow empty or up to two decimals
		if (str === "" || /^-?\d*(?:\.\d{0,2})?$/.test(str)) {
			setDraft(str);
			// only emit real numbers
			if (str !== "" && !isNaN(Number(str))) {
				onValidatedChange?.(Number(str));
			}
		}
	};

	const toggleSign = () => {
		const flipped = draft.startsWith("-") ? draft.slice(1) : "-" + draft;
		// re-use the same logic to update
		handleChange({ target: { value: flipped } } as any);
	};

	return (
		<div className="flex gap-1">
			<input
				type="text"
				inputMode="numeric"
				className={cn(
					"file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
					// disabled because
					// 1.) it gets cut off in a horizontally scrolling container if input is touching y0
					// 2.) meh i like this styling better more distraction free
					// "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
					"aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
					className,
				)}
				style={style}
				placeholder={placeholder}
				value={draft}
				onChange={handleChange}
				onFocus={(e) => {
					setIsFocused(true);
					onFocus?.(e);
				}}
				onBlur={(e) => {
					setIsFocused(false);
					// final sync on blur so you’re always up-to-date
					setDraft(value);
					onBlur?.(e);
				}}
			/>
			<Button variant="outline" onClick={toggleSign} className="md:hidden">
				<DiffIcon />
			</Button>
		</div>
	);
}
