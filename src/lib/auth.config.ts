import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  // The app runs under Next.js basePath "/zh", so the Auth.js routes live at
  // /zh/api/auth (not the default /api/auth). Without this, client signIn() and
  // the route handler disagree and the session cookie is never set.
  basePath: "/zh/api/auth",
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
