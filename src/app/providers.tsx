"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import {
  ConvexPersistenceProvider,
  NullPersistenceProvider,
} from "@/hooks/PersistenceContext";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

export function Providers({ children }: { children: React.ReactNode }) {
  if (!convex) {
    return <NullPersistenceProvider>{children}</NullPersistenceProvider>;
  }
  return (
    <ConvexProvider client={convex}>
      <ConvexPersistenceProvider>{children}</ConvexPersistenceProvider>
    </ConvexProvider>
  );
}
