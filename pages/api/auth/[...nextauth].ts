import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions = {
	providers: [
		GoogleProvider({
			clientId: process.env.GOOGLE_CLIENT_ID!,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
			// Request access to Google Sheets along with basic profile info:
			authorization: {
				params: {
					// Add other scopes if needed
					scope:
						"https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email",
				},
			},
		}),
	],
	secret: process.env.NEXTAUTH_SECRET,
	callbacks: {
		// Persist the OAuth access token and refresh token in the JWT
		async jwt({ token, account }: any) {
			if (account) {
				token.accessToken = account.access_token;
				token.refreshToken = account.refresh_token;
				// Optionally, save the access token expiry time if provided:
				token.accessTokenExpires = Date.now() + account.expires_in * 1000;
			}
			return token;
		},
		// Make the access token available in the session
		async session({ session, token }: any) {
			session.accessToken = token.accessToken;
			session.refreshToken = token.refreshToken;
			return session;
		},
	},
};

export default NextAuth(authOptions);
