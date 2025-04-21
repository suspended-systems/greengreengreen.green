export interface ChatMessage {
	id: string;
	role: "system" | "assistant" | "user";
	content: string;
	// if the assistant “called” our function, we’ll stash the parsed array here:
	alternatives?: Alternative[];
}

export interface Alternative {
	id: string;
	name: string;
	description: string;
}
