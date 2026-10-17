"use client";
import { useEffect, useState } from "react";
import { getPlans } from "@/lib/api/client";
import type { PlansResponse } from "@/lib/api/generated";

export function usePlans() {
  const [data, setData] = useState<PlansResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPlans()
      .then((response) => {
        if (!cancelled) setData(response);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load plans.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { plans: data?.plans ?? [], messages: data?.messages ?? {}, loading: data === null && error === null, error };
}
