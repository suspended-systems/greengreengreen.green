"use client";

import { createContext, useContext, useState, ReactNode, Dispatch, SetStateAction } from "react";
import { defaultStartingDate, defaultStartingValue, defaultTransactions, Transaction } from "./transactions";

interface AppContext {
	startAmount: number;
	setStartAmount: Dispatch<SetStateAction<number>>;
	startDate: Date | undefined;
	setStartDate: Dispatch<SetStateAction<Date | undefined>>;
	endDate: Date | undefined;
	setEndDate: Dispatch<SetStateAction<Date | undefined>>;
	transactions: Transaction[];
	setTransactions: Dispatch<SetStateAction<Transaction[]>>;
	spreadsheetId: string | null;
	setSpreadsheetId: Dispatch<SetStateAction<string | null>>;
}

const context = createContext<AppContext | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
	const [startAmount, setStartAmount] = useState(defaultStartingValue);
	const [startDate, setStartDate] = useState<Date | undefined>(defaultStartingDate);
	const [endDate, setEndDate] = useState<Date | undefined>();
	const [transactions, setTransactions] = useState(defaultTransactions);
	const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null);

	const value: AppContext = {
		startAmount,
		setStartAmount,
		startDate,
		setStartDate,
		endDate,
		setEndDate,
		transactions,
		setTransactions,
		spreadsheetId,
		setSpreadsheetId,
	};

	return <context.Provider value={value}>{children}</context.Provider>;
}

export function useApp() {
	const c = useContext(context);
	if (c === undefined) {
		throw new Error("useApp must be used within an AppProvider");
	}
	return c;
}
