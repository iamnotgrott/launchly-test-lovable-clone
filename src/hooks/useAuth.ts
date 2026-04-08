"use client";

import { useSession, signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

export function useAuth() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  const logout = useCallback(async () => {
    await signOut();
    router.push("/login");
  }, [router]);

  return {
    user: session?.user ?? null,
    session: session?.session ?? null,
    isLoading: isPending,
    isAuthenticated: !!session?.user,
    logout,
  };
}
