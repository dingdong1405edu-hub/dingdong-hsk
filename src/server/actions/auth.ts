"use server";
import { signOut } from "@/lib/auth";

// Email/password registration & login were removed — Google is the only sign-in
// method (see src/lib/auth.ts). Accounts are provisioned on first Google sign-in.

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}
