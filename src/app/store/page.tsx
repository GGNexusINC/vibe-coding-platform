import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { StoreClient } from "./store-client";

export const metadata: Metadata = {
  title: "Store | NewHopeGGN",
  description: "Buy wipe packs for Once Human. Construction, Defense, PvP, and Clan packages with VIP perks. Instant delivery via Discord.",
  keywords: ["store", "wipe packs", "Once Human", "VIP", "construction", "defense", "pvp", "packages"],
  openGraph: {
    title: "Store | NewHopeGGN",
    description: "Buy wipe packs for Once Human. Construction, Defense, PvP, and Clan packages with VIP perks.",
    type: "website",
    images: [{ url: "https://newhopeggn.vercel.app/opengraph-image", width: 1200, height: 630 }],
  },
};

export default async function StorePage() {
  const user = await getSession();

  return <StoreClient user={user as any} />;
}
