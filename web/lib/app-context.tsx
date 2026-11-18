"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "./api/client";
import { useAuth } from "./auth";
import type { Catalog, FormatInfo, Me, PairInfo, PlanInfo, SiteInfo } from "./types";

type AppApi = {
  catalog: Catalog | null;
  plans: PlanInfo[];
  site: SiteInfo | null;
  me: Me | null;
  apiDown: boolean;
  refreshMe: () => Promise<Me | null>;
  formatBy: (slug: string) => FormatInfo | undefined;
  pairBy: (from: string, to: string) => PairInfo | undefined;
};

const Ctx = createContext<AppApi | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [site, setSite] = useState<SiteInfo | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [apiDown, setApiDown] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [c, p, s] = await Promise.all([api.formats(), api.plans(), api.site()]);
        if (cancelled) return;
        setCatalog(c);
        setPlans(p.plans);
        setSite(s);
        setApiDown(false);
      } catch {
        if (!cancelled) {
          setApiDown(true);
          setTimeout(load, 4000);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshMe = useCallback(async () => {
    try {
      const m = await api.me();
      setMe(m);
      return m;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (ready) refreshMe();
  }, [ready, user, refreshMe]);

  const value = useMemo<AppApi>(
    () => ({
      catalog, plans, site, me, apiDown, refreshMe,
      formatBy: (slug) => catalog?.formats.find((f) => f.slug === slug),
      pairBy: (from, to) => catalog?.pairs.find((p) => p.from === from && p.to === to),
    }),
    [catalog, plans, site, me, apiDown, refreshMe],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppApi {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used inside AppProvider");
  return v;
}
