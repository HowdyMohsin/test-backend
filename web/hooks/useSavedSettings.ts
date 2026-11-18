"use client";

import { useCallback, useEffect, useState } from "react";
import type { SettingValues } from "@/lib/types";

const KEY = "qic.settings.v1";
type Store = Record<string, SettingValues>;

/** Remembers the last options used for each output format. Only a convenience; never required. */
export function useSavedSettings() {
  const [store, setStore] = useState<Store>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setStore(JSON.parse(raw) as Store);
    } catch {
      /* storage blocked or corrupt: start fresh */
    }
  }, []);

  const persist = (next: Store) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const setValue = useCallback((target: string, key: string, value: string | number | boolean) => {
    setStore((s) => {
      const next = { ...s, [target]: { ...s[target], [key]: value } };
      persist(next);
      return next;
    });
  }, []);

  const setMany = useCallback((target: string, values: SettingValues) => {
    setStore((s) => {
      const next = { ...s, [target]: { ...s[target], ...values } };
      persist(next);
      return next;
    });
  }, []);

  const reset = useCallback((target: string) => {
    setStore((s) => {
      const next = { ...s };
      delete next[target];
      persist(next);
      return next;
    });
  }, []);

  return { store, setValue, setMany, reset };
}
