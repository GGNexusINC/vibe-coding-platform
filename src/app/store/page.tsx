import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { StoreClient } from "./store-client";
import { CartProvider } from "./cart-context";
import { PayPalProvider } from "./paypal-provider";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Store | NewHopeGGN",
  description: "Browse and purchase NewHopeGGN wipe packs, VIP perks, and rare rewards for the Once Human community server.",
  keywords: ["store", "shop", "wipe packs", "VIP", "Once Human", "NewHopeGGN"],
  openGraph: {
    title: "Store | NewHopeGGN",
    description: "Buy wipe packs for Once Human. Construction, Defense, PvP, and Clan packages with VIP perks.",
    url: "https://newhopeggn.vercel.app/store",
    type: "website",
    images: [{ url: "https://newhopeggn.vercel.app/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", images: ["https://newhopeggn.vercel.app/opengraph-image"] },
};

import { Suspense } from "react";

export default async function StorePage() {
  const user = await getSession();

  let initialPackages = null;
  try {
    const supabase = createClient(env.supabaseUrl(), env.supabaseAnonKey());
    const { data } = await supabase.from('site_settings').select('value').eq('key', 'store_packages').single();
    if (data?.value?.packages && Array.isArray(data.value.packages) && data.value.packages.length > 0) {
      initialPackages = data.value.packages;
    }
  } catch (e) {
    console.error("Failed to fetch dynamic store packages", e);
  }

  return (
    <PayPalProvider>
      <CartProvider>
        <Suspense fallback={
          <div className="relative mx-auto w-full max-w-7xl px-4 py-10 sm:py-14">
            <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-[2.5rem] border border-white/10 bg-slate-900/40 p-8">
                <div className="rz-skeleton h-5 w-40 rounded-full" />
                <div className="rz-skeleton mt-6 h-12 w-3/4 rounded-2xl" />
                <div className="rz-skeleton mt-3 h-12 w-1/2 rounded-2xl" />
                <div className="rz-skeleton mt-6 h-4 w-full max-w-lg rounded-full" />
                <div className="mt-10 grid gap-6 sm:grid-cols-3">
                  {[0, 1, 2].map((i) => <div key={i} className="rz-skeleton h-24 rounded-2xl" />)}
                </div>
              </div>
              <div className="rounded-[2.5rem] border border-white/10 bg-slate-900/40 p-8">
                <div className="rz-skeleton h-5 w-48 rounded-full" />
                <div className="mt-6 space-y-4">
                  {[0, 1, 2].map((i) => <div key={i} className="rz-skeleton h-12 rounded-2xl" />)}
                </div>
              </div>
            </div>
            <div className="mt-12 grid gap-8 md:grid-cols-2">
              {[0, 1].map((i) => <div key={i} className="rz-skeleton h-80 rounded-[2.5rem]" />)}
            </div>
          </div>
        }>
          <StoreClient user={user as any} initialPackages={initialPackages} />
        </Suspense>
      </CartProvider>
    </PayPalProvider>
  );
}
