import type { NextAuthOptions, User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

async function refreshAccessToken(token: JWT): Promise<JWT> {
	try {
		const url =
			"https://oauth2.googleapis.com/token?" +
			new URLSearchParams({
				client_id: process.env.GOOGLE_CLIENT_ID!,
				client_secret: process.env.GOOGLE_CLIENT_SECRET!,
				grant_type: "refresh_token",
				refresh_token: token.refreshToken,
			});

		const res = await fetch(url, { method: "POST" });
		const refreshed = await res.json();
		if (!res.ok) throw refreshed;

		return {
			...token,
			accessToken: refreshed.access_token,
			accessTokenExpires: Date.now() + refreshed.expires_in * 1000,
			// Fall back to old refresh token if Google didn’t return a new one
			refreshToken: refreshed.refresh_token ?? token.refreshToken,
		};
	} catch (error) {
		console.error("❌ Error refreshing Google access token", error);
		return { ...token, error: "RefreshAccessTokenError" };
	}
}

export const authOptions: NextAuthOptions = {
	providers: [
		GoogleProvider({
			clientId: process.env.GOOGLE_CLIENT_ID!,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
			/**
			 * Google only provides Refresh Token to an application the first time a user signs in.
			 *
			 * To force Google to re-issue a Refresh Token, the user needs to remove the application
			 * from their account and sign in again: https://myaccount.google.com/permissions
			 *
			 * Alternatively, you can also pass options in the params object of authorization which
			 * will force the Refresh Token to always be provided on sign in, however this will ask
			 * all users to confirm if they wish to grant your application access every time they
			 * sign in.
			 *
			 * If you need access to the RefreshToken or AccessToken for a Google account and you
			 * are not using a database to persist user accounts, this may be something you need to do.
			 */
			authorization: {
				params: {
					prompt: "consent",
					access_type: "offline",
					response_type: "code",
				},
			},
		}),
	],
	secret: process.env.NEXTAUTH_SECRET,
	callbacks: {
		// 1) On sign in, save tokens & expiry to the JWT
		async jwt({ token, account, user }) {
			if (account && user) {
				return {
					...token,
					accessToken: account.access_token!,
					accessTokenExpires: account.expires_at! * 1000,
					refreshToken: account.refresh_token!,
					user,
				};
			}

			// 2) Return previous token if not expired
			if (Date.now() < token.accessTokenExpires) {
				return token;
			}

			// 3) Otherwise refresh
			return refreshAccessToken(token);
		},

		// 4) Make token fields available in client session
		async session({ session, token }) {
			session.user = token.user as User;
			session.accessToken = token.accessToken;
			session.error = token.error;
			return session;
		},
	},
};

export default NextAuth(authOptions);
