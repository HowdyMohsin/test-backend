"use client";
import { useCallback, useEffect, useState } from "react";
import {
  subscribeAuth,
  signInEmail,
  signUpEmail,
  signInGoogleRedirect,
  signOutUser,
  isFirebaseConfigured,
  isGoogleConfigured,
  type AuthUser,
} from "@/lib/firebase";

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => subscribeAuth(setUser), []);

  const signIn = useCallback(async (email: string, password: string) => {
    await signInEmail(email, password);
  }, []);
  const signUp = useCallback(async (email: string, password: string) => {
    await signUpEmail(email, password);
  }, []);
  const signInGoogle = useCallback(() => signInGoogleRedirect(), []);
  const signOut = useCallback(() => signOutUser(), []);

  return {
    user,
    configured: isFirebaseConfigured(),
    googleConfigured: isGoogleConfigured(),
    signIn,
    signUp,
    signInGoogle,
    signOut,
  };
}
