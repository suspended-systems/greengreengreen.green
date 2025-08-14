import React from "react";
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
	hideLoader: boolean;
	status: string;
}

const LoadingSpinner = React.memo(({ hideLoader, status }: LoadingSpinnerProps) => {
	return (
		<div
			className={`absolute inset-0 flex flex-col items-center justify-center text-current transition-opacity duration-200 ${
				hideLoader ? "opacity-0 pointer-events-none" : "opacity-100"
			}`}
		>
			<Loader2 className="animate-spin" size={64} aria-label="Loading…" />
			<p>{status === "loading" ? "Loading..." : "Retrieving Sheets transactions..."}</p>
		</div>
	);
});

export default LoadingSpinner;