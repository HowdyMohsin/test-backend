"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { adminApi, setUnauthorizedHandler, type Me } from "./api";

type Ctx = { admin: Me | null; ready: boolean; login: (email: string, password: string) => Promise<void>; logout: () => Promise<void> };
const C = createContext<Ctx | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setUnauthorizedHandler(() => setAdmin(null));
    adminApi.get<Me>("/auth/me").then(setAdmin).catch(() => setAdmin(null)).finally(() => setReady(true));
  }, []);
  const login = useCallback(async (email: string, password: string) => setAdmin(await adminApi.post<Me>("/auth/login", { email, password })), []);
  const logout = useCallback(async () => {
    await adminApi.post("/auth/logout").catch(() => undefined);
    setAdmin(null);
  }, []);
  const value = useMemo(() => ({ admin, ready, login, logout }), [admin, ready, login, logout]);
  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useAdmin(): Ctx {
  const v = useContext(C);
  if (!v) throw new Error("useAdmin must be used inside AdminProvider");
  return v;
}
