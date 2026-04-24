import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { StoreClient } from "./store-client";

export const metadata: Metadata = {
  title: "Store | VoxBridge",
  description: "Browse and purchase VoxBridge wipe packs, VIP perks, and rare rewards for the Once Human community server.",
  keywords: ["store", "shop", "wipe packs", "VIP", "Once Human", "VoxBridge"],
  openGraph: {
    title: "Store | VoxBridge",
    description: "Buy wipe packs for Once Human. Construction, Defense, PvP, and Clan packages with VIP perks.",
    url: "https://newhopeggn.vercel.app/store",
    type: "website",
    images: [{ url: "https://newhopeggn.vercel.app/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", images: ["https://newhopeggn.vercel.app/opengraph-image"] },
};

export default async function StorePage() {
  const user = await getSession();

  return <StoreClient user={user as any} />;
}
