"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type T = { id: number; text: string; bad: boolean };
const C = createContext<(text: string, bad?: boolean) => void>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<T[]>([]);
  const push = useCallback((text: string, bad = false) => {
    const id = Date.now() + Math.random();
    setItems((l) => [...l.slice(-2), { id, text, bad }]);
    setTimeout(() => setItems((l) => l.filter((x) => x.id !== id)), 5000);
  }, []);
  return (
    <C.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 flex-col gap-2" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`pop pointer-events-auto rounded-xl border px-4 py-3 text-sm shadow-lg ${t.bad ? "border-danger bg-danger-soft text-danger" : "border-line bg-surface"}`}>{t.text}</div>
        ))}
      </div>
    </C.Provider>
  );
}

export const useToast = () => useContext(C);
