import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import { db } from "@/lib/db";
import { authConfig } from "@/lib/auth.config";

// Google is the ONLY sign-in method. Email/password (Credentials) has been
// removed by request — accounts are created automatically on first Google
// sign-in via the Prisma adapter.
//
// REQUIRED env in every environment: AUTH_GOOGLE_ID + AUTH_GOOGLE_SECRET.
// Without them no provider is registered and nobody can sign in.
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      // Google verifies email ownership, so it is safe to link a Google login to
      // an existing account with the same email (e.g. the admin's Gmail that was
      // previously created with email/password). Without this, such a sign-in
      // fails with OAuthAccountNotLinked.
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    // Block banned users from completing sign-in.
    async signIn({ user }) {
      if (!user?.email) return true;
      const existing = await db.user.findUnique({ where: { email: user.email } });
      if (existing?.banned) return false;
      return true;
    },
  },
});
