"use client";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { SignInForm } from "./SignInForm";
import { SignUpForm } from "./SignUpForm";
import { isGoogleConfigured } from "@/lib/firebase";

export function AuthModal({ open, onClose, initialTab = "signin" }: { open: boolean; onClose: () => void; initialTab?: "signin" | "signup" }) {
  const [tab, setTab] = useState<"signin" | "signup">(initialTab);
  const [googleError, setGoogleError] = useState<string | null>(null);

  const google = async () => {
    setGoogleError(null);
    try {
      const { signInGoogleRedirect } = await import("@/lib/firebase");
      signInGoogleRedirect();
    } catch (err) {
      setGoogleError(err instanceof Error ? err.message : "Google sign in failed.");
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={tab === "signin" ? "Sign in" : "Create account"}>
      <Tabs
        tabs={[
          { id: "signin", label: "Sign in" },
          { id: "signup", label: "Create account" },
        ]}
        active={tab}
        onChange={setTab}
      />
      <div className="mt-4">
        {tab === "signin" ? <SignInForm onDone={onClose} /> : <SignUpForm onDone={onClose} />}
      </div>
      {isGoogleConfigured() && (
        <div className="mt-4">
          <div className="mb-3 flex items-center gap-2 text-xs text-text-muted">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>
          <Button variant="secondary" className="w-full" onClick={google}>
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
              <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 01-2.39 3.62v3h3.87c2.26-2.09 3.57-5.16 3.57-8.81z" />
              <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.07.72-2.44 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.1A12 12 0 0012 24z" />
              <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 014.89 12c0-.79.14-1.56.38-2.28v-3.1H1.29a12 12 0 000 10.76l3.98-3.1z" />
              <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.6 4.58 1.8l3.44-3.44A11.98 11.98 0 0012 0 12 12 0 001.29 6.62l3.98 3.1C6.22 6.88 8.87 4.77 12 4.77z" />
            </svg>
            Continue with Google
          </Button>
          {googleError && <p className="mt-2 text-sm text-danger" role="alert">{googleError}</p>}
        </div>
      )}
    </Modal>
  );
}
