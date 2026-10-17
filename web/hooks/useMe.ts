"use client";
import { useCallback, useEffect, useState } from "react";
import { getMe, ApiError } from "@/lib/api/client";
import type { MeResponse } from "@/lib/api/generated";

export function useMe() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    getMe()
      .then((response) => {
        if (!cancelled) setMe(response);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Could not load usage.");
      });
    return () => {
      cancelled = true;
    };
  }, [nonce]);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);
  return { me, loading: me === null && error === null, error, refresh };
}
