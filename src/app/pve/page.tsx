import { getSession } from "@/lib/session";
import { Suspense } from "react";
import { PveClient } from "./pve-client";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function PvePage() {
  const user = await getSession();
  
  let storePackages = null;
  try {
    const supabase = createClient(env.supabaseUrl(), env.supabaseAnonKey());
    const { data } = await supabase.from('site_settings').select('value').eq('key', 'store_packages').single();
    if (data?.value?.packages && Array.isArray(data.value.packages) && data.value.packages.length > 0) {
      storePackages = data.value.packages;
    }
  } catch (e) {
    console.error("Failed to fetch store settings in pve page", e);
  }

  return (
    <Suspense fallback={<div className="py-20 text-center animate-pulse text-emerald-400 font-bold font-mono">LOADING PVE REALM MATRIX...</div>}>
      <PveClient user={user as any} storePackages={storePackages} />
    </Suspense>
  );
}
