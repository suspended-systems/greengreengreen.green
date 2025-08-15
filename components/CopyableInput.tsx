"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { CopyButton } from "@/components/CopyButton";
import { cn } from "@/lib/utils";

export function CopyableInput({ value, label }: { value: string; label?: string }) {
	return (
		<div className="space-y-1">
			{label && <label className="text-sm font-medium">{label}</label>}
			<div className="relative">
				<Input readOnly className={cn("pr-10" /* reserve space for the icon */)} {...{ value }} />
				<CopyButton className="absolute inset-y-0 right-0 flex items-center mr-2" {...{ value }} />
			</div>
		</div>
	);
}
