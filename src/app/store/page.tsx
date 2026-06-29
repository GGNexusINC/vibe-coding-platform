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
        <Suspense fallback={<div className="py-20 text-center animate-pulse text-slate-500 font-bold italic">Loading store...</div>}>
          <StoreClient user={user as any} initialPackages={initialPackages} />
        </Suspense>
      </CartProvider>
    </PayPalProvider>
  );
}
