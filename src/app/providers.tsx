"use client";
import { SessionProvider } from "next-auth/react";

// App is served at the root now (no basePath), so the default /api/auth is correct.
export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
