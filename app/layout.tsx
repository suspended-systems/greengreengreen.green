import "./globals.css";

import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { ThemeProvider } from "./ThemeProvider";
import SessionProvider from "./SessionProvider";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "greengreengreen.green",
};

// tailwind recommended responsive design
// https://tailwindcss.com/docs/responsive-design
// https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Viewport_meta_element
export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1.0,
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
				<SessionProvider>
					<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
						{children}
					</ThemeProvider>
				</SessionProvider>
			</body>
		</html>
	);
}
