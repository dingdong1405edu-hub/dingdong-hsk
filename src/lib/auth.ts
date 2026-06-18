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
    //
    // IMPORTANT: this must FAIL-OPEN. If the DB lookup throws (cold start, brief
    // connection drop, schema not yet pushed) we must NOT block the sign-in —
    // otherwise a transient DB error locks *everyone* out of Google login. The
    // only thing we deliberately reject is a confirmed `banned` user.
    async signIn({ user }) {
      if (!user?.email) return true;
      try {
        const existing = await db.user.findUnique({
          where: { email: user.email },
          select: { banned: true },
        });
        if (existing?.banned) return false;
      } catch (err) {
        console.error("[auth] signIn ban-check failed, allowing sign-in:", err);
      }
      return true;
    },
  },
});
