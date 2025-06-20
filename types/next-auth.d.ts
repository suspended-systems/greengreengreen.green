import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
	interface Session extends DefaultSession {
		accessToken?: string;
		error?: string;
		user: DefaultUser;
	}
}

declare module "next-auth/jwt" {
	interface JWT {
		accessToken: string;
		accessTokenExpires: number;
		refreshToken: string;
		user?: DefaultSession["user"];
		error?: string;
	}
}
