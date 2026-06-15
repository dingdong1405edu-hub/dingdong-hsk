"use client";
import { SessionProvider } from "next-auth/react";

// Tell the next-auth/react client where the Auth.js routes live. Must match the
// basePath in src/lib/auth.config.ts, otherwise client signIn()/signOut()/
// useSession() call /api/auth (which 404s under the /zh basePath).
export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider basePath="/zh/api/auth">{children}</SessionProvider>;
}
