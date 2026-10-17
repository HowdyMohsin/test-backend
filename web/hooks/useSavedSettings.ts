"use client";
import { useCallback } from "react";
import type { SettingValue } from "@/lib/api/generated";

const PREFIX = "qic_settings_";

function read(target: string): Record<string, SettingValue> {
  try {
    const raw = window.localStorage.getItem(`${PREFIX}${target}`);
    return raw ? (JSON.parse(raw) as Record<string, SettingValue>) : {};
  } catch {
    return {};
  }
}

/** Last-used option values, remembered per output format (convenience only). */
export function useSavedSettings() {
  const load = useCallback((target: string) => {
    if (typeof window === "undefined") return {};
    return read(target);
  }, []);
  const save = useCallback((target: string, settings: Record<string, SettingValue>) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(`${PREFIX}${target}`, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
  }, []);
  return { load, save };
}
