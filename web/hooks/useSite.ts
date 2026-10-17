"use client";
import { useEffect, useState } from "react";
import { getSite } from "@/lib/api/client";
import type { SiteResponse } from "@/lib/api/generated";

export function useSite() {
  const [site, setSite] = useState<SiteResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSite()
      .then((response) => {
        if (!cancelled) setSite(response);
      })
      .catch(() => {
        /* site settings are optional; header works without them */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { site };
}
