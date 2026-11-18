"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, adminApi } from "@/lib/api";

/** Loads one admin endpoint. `reload()` fetches again; `setData` allows optimistic edits. */
export function useLoad<T>(path: string | null, every?: number) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async (quiet = false) => {
    if (!path) return;
    if (!quiet) setLoading(true);
    try {
      setData(await adminApi.get<T>(path));
      setError("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load this section.");
    } finally {
      setLoading(false);
    }
  }, [path]);
  useEffect(() => {
    reload();
    if (!every) return;
    const t = setInterval(() => reload(true), every);
    return () => clearInterval(t);
  }, [reload, every]);
  return { data, error, loading, reload, setData };
}
