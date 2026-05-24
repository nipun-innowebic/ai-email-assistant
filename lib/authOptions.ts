import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { supabaseAdmin } from "./supabaseAdmin"

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: {
                params: {
                    scope: "openid email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send",
                    access_type: "offline",
                    prompt: "consent",
                },
            },
        }),
    ],
    callbacks: {
        async signIn({ user, account }) {
            if (account?.refresh_token && user?.email) {
                try {
                    await supabaseAdmin.from('user_tokens').upsert(
                        {
                            user_id: user.email,
                            refresh_token: account.refresh_token,
                            updated_at: new Date().toISOString()
                        },
                        { onConflict: 'user_id' }
                    )
                } catch (err) {
                    // Log but never block sign-in — token storage is best-effort.
                    console.error('[authOptions] failed to persist refresh token:', err)
                }
            }
            return true
        },
        async jwt({ token, account }) {
            if (account) {
                token.accessToken = account.access_token
                token.refreshToken = account.refresh_token
            }
            return token
        },
        async session({ session, token }) {
            if (token.accessToken) {
                session.accessToken = token.accessToken as string
            }
            return session
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
}