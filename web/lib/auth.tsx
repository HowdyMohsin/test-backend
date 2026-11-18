"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { setAuthHeaderProvider } from "./api/client";

type Mode = "firebase" | "dev" | "none";
type AuthUser = { email: string | null } | null;

type AuthApi = {
  user: AuthUser;
  ready: boolean;
  mode: Mode;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  google: () => Promise<void>;
  devSignIn: (email: string) => void;
  signOut: () => Promise<void>;
};

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
};
const MODE: Mode = firebaseConfig.apiKey ? "firebase" : process.env.NEXT_PUBLIC_DEV_LOGIN === "1" ? "dev" : "none";
const DEV_KEY = "qic.dev.user";

async function firebase() {
  const { initializeApp, getApps } = await import("firebase/app");
  const auth = await import("firebase/auth");
  const app = getApps()[0] ?? initializeApp(firebaseConfig);
  return { auth, instance: auth.getAuth(app) };
}

function friendly(e: unknown): Error {
  const code = (e as { code?: string })?.code ?? "";
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) return new Error("Wrong email or password.");
  if (code.includes("email-already-in-use")) return new Error("An account with this email already exists. Try signing in.");
  if (code.includes("weak-password")) return new Error("Please use a password with at least 6 characters.");
  if (code.includes("invalid-email")) return new Error("That email address does not look right.");
  if (code.includes("too-many-requests")) return new Error("Too many attempts. Please wait a few minutes.");
  if (code.includes("popup-closed")) return new Error("");
  return new Error("Could not sign in. Please try again.");
}

const Ctx = createContext<AuthApi | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (MODE === "firebase") {
      setAuthHeaderProvider(async (): Promise<Record<string, string>> => {
        const { instance } = await firebase();
        const token = await instance.currentUser?.getIdToken();
        return token ? { Authorization: `Bearer ${token}` } : {};
      });
      let off: (() => void) | undefined;
      firebase().then(({ auth, instance }) => {
        off = auth.onAuthStateChanged(instance, (u) => {
          setUser(u ? { email: u.email } : null);
          setReady(true);
        });
      });
      return () => off?.();
    }
    if (MODE === "dev") {
      const read = () => {
        try {
          return localStorage.getItem(DEV_KEY);
        } catch {
          return null;
        }
      };
      setAuthHeaderProvider(async (): Promise<Record<string, string>> => {
        const email = read();
        return email ? { "X-Dev-User": email } : {};
      });
      const email = read();
      setUser(email ? { email } : null);
    }
    setReady(true);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { auth, instance } = await firebase();
      await auth.signInWithEmailAndPassword(instance, email, password);
    } catch (e) {
      throw friendly(e);
    }
  }, []);
  const signUp = useCallback(async (email: string, password: string) => {
    try {
      const { auth, instance } = await firebase();
      await auth.createUserWithEmailAndPassword(instance, email, password);
    } catch (e) {
      throw friendly(e);
    }
  }, []);
  const google = useCallback(async () => {
    try {
      const { auth, instance } = await firebase();
      await auth.signInWithPopup(instance, new auth.GoogleAuthProvider());
    } catch (e) {
      throw friendly(e);
    }
  }, []);
  const devSignIn = useCallback((email: string) => {
    try {
      localStorage.setItem(DEV_KEY, email);
    } catch {
      /* storage can be blocked; the session then lasts until reload */
    }
    setUser({ email });
  }, []);
  const signOut = useCallback(async () => {
    if (MODE === "firebase") {
      const { auth, instance } = await firebase();
      await auth.signOut(instance);
    } else {
      try {
        localStorage.removeItem(DEV_KEY);
      } catch {
        /* ignore */
      }
      setUser(null);
    }
  }, []);

  const value = useMemo(() => ({ user, ready, mode: MODE, signIn, signUp, google, devSignIn, signOut }), [user, ready, signIn, signUp, google, devSignIn, signOut]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthApi {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}
