"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { CopyButton } from "@/components/CopyButton";
import { cn } from "@/lib/utils";

interface CopyableInputProps {
	value: string;
	label?: string;
}

export function CopyableInput({ value, label }: CopyableInputProps) {
	return (
		<div className="space-y-1">
			{label && <label className="text-sm font-medium">{label}</label>}
			<div className="relative">
				<Input readOnly value={value} className={cn("pr-10" /* reserve space for the icon */)} />
				<CopyButton value={value} className="absolute inset-y-0 right-0 mr-2 flex items-center" />
			</div>
		</div>
	);
}
