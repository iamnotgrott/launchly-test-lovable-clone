"use client";

import React, { createContext, useContext } from "react";
import { useConvexPersistence } from "./useConvexPersistence";

type PersistenceAPI = ReturnType<typeof useConvexPersistence>;

const noopAsync = async () => null;

const defaultApi: PersistenceAPI = {
  persistProject: noopAsync,
  persistMessage: noopAsync,
  updateMessage: noopAsync as any,
  persistTurn: noopAsync,
  updateTurn: noopAsync as any,
  persistCheckpoint: noopAsync,
};

const PersistenceCtx = createContext<PersistenceAPI>(defaultApi);

export function ConvexPersistenceProvider({ children }: { children: React.ReactNode }) {
  const api = useConvexPersistence();
  return <PersistenceCtx.Provider value={api}>{children}</PersistenceCtx.Provider>;
}

export function NullPersistenceProvider({ children }: { children: React.ReactNode }) {
  return <PersistenceCtx.Provider value={defaultApi}>{children}</PersistenceCtx.Provider>;
}

export function usePersistence() {
  return useContext(PersistenceCtx);
}
