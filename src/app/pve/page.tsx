import { getSession } from "@/lib/session";
import { Suspense } from "react";
import { PveClient } from "./pve-client";

export const dynamic = "force-dynamic";

export default async function PvePage() {
  const user = await getSession();
  return (
    <Suspense fallback={<div className="py-20 text-center animate-pulse text-emerald-400 font-bold font-mono">LOADING PVE REALM MATRIX...</div>}>
      <PveClient user={user as any} />
    </Suspense>
  );
}
