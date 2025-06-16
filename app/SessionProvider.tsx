"use client";
import { SessionProvider as NextAuthProvider } from "next-auth/react";

export default function SessionProvider({ children }: { children: React.ReactNode }) {
	return (
		<NextAuthProvider
			// disable automatic re-validation on window focus
			// this fixes chat window resetting on tab out
			refetchOnWindowFocus={false}
		>
			{children}
		</NextAuthProvider>
	);
}
