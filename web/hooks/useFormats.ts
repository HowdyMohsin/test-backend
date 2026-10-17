"use client";
import { useCallback, useEffect, useState } from "react";
import { getFormats, ApiError } from "@/lib/api/client";
import type { FormatsResponse } from "@/lib/api/generated";

export interface FormatsState extends Partial<FormatsResponse> {
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/** Live formats/pairs/presets/popular from /v1/formats. Nothing is hardcoded. */
export function useFormats(): FormatsState {
  const [data, setData] = useState<FormatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    getFormats()
      .then((response) => {
        if (!cancelled) setData(response);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Could not load formats.");
      });
    return () => {
      cancelled = true;
    };
  }, [nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { ...data, loading: data === null && error === null, error, reload };
}
