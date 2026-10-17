"use client";
import { useEffect, useRef } from "react";
import { getJobs } from "@/lib/api/client";
import type { JobResponse } from "@/lib/api/generated";

/**
 * Batched job polling: one call for all active jobs, 1.5s at first,
 * slowing to 4s after a while (guide section 5.10).
 */
export function useJobPolling(
  jobIds: string[],
  active: boolean,
  onUpdate: (jobs: JobResponse[]) => void
) {
  const callbackRef = useRef(onUpdate);
  callbackRef.current = onUpdate;
  const idsKey = jobIds.slice().sort().join(",");

  useEffect(() => {
    if (!active || jobIds.length === 0) return;
    let cancelled = false;
    let polls = 0;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      if (cancelled) return;
      polls += 1;
      try {
        const jobs = await getJobs(idsKey.split(","));
        if (!cancelled) callbackRef.current(jobs);
      } catch {
        /* keep polling; ErrorBox surfaces persistent failures */
      }
      if (!cancelled) timer = setTimeout(poll, polls < 20 ? 1500 : 4000);
    };
    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, active]);
}
