export interface Alternative {
	id: string;
	name: string;
	price: number;
	frequency: string;
	percentageSavings: number;
	annualSavings: number;
	pros: string[];
	cons: string[];
}

export interface ChatMessage {
	id: string;
	role: "assistant" | "user" | "system";
	content: string;
	summary?: string;
	alternatives?: Alternative[];
}
