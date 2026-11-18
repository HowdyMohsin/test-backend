import type { Catalog } from "../types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/** Used at build time and on the server. Fails loudly: pages must never be built from a guessed format list. */
export async function serverCatalog(): Promise<Catalog> {
  const res = await fetch(`${BASE}/v1/formats`, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`Cannot load /v1/formats (${res.status}). Start the API before building the site.`);
  return (await res.json()) as Catalog;
}

export async function serverPlans() {
  const res = await fetch(`${BASE}/v1/plans`, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`Cannot load /v1/plans (${res.status}).`);
  return (await res.json()) as import("../types").PlansResponse;
}
