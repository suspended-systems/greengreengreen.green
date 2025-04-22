"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

interface CopyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	/** The text to copy */
	value: string;
}

export function CopyButton({ value, ...props }: CopyButtonProps) {
	const [copied, setCopied] = React.useState(false);

	return (
		<Button
			variant="ghost"
			size="icon"
			aria-label="Copy to clipboard"
			onClick={() => {
				navigator.clipboard.writeText(value);
				setCopied(true);
				setTimeout(() => setCopied(false), 2000);
			}}
			{...props}
		>
			{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
		</Button>
	);
}
