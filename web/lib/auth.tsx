"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "./api/client";

type AuthUser = { email: string | null; mustChangePassword: boolean } | null;
type AuthApi = {
  user: AuthUser;
  ready: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthApi | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api.authMe().then((account) => setUser({ email: account.email, mustChangePassword: account.must_change_password })).catch(() => setUser(null)).finally(() => setReady(true));
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const account = await api.login(email, password);
    setUser({ email: account.email, mustChangePassword: account.must_change_password });
  }, []);
  const signUp = useCallback(async (email: string, password: string) => {
    const account = await api.register(email, password);
    setUser({ email: account.email, mustChangePassword: account.must_change_password });
  }, []);
  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    await api.changePassword(currentPassword, newPassword);
    setUser((current) => current ? { ...current, mustChangePassword: false } : current);
  }, []);
  const signOut = useCallback(async () => {
    await api.logout().catch(() => undefined);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, ready, signIn, signUp, changePassword, signOut }), [user, ready, signIn, signUp, changePassword, signOut]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthApi {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}
