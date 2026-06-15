import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  // NOTE: Do NOT set `basePath` here. Next.js strips the app basePath ("/zh")
  // before the route handler runs, so the server sees /api/auth (the default).
  // The /zh prefix is only needed on the CLIENT, which is configured via
  // <SessionProvider basePath="/zh/api/auth"> in src/app/providers.tsx.
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
};
