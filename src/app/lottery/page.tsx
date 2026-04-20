import type { Metadata } from "next";
import LotteryClient from "./lottery-client";

export const metadata: Metadata = {
  title: "Lottery | NewHopeGGN",
  description: "Enter the NewHopeGGN lottery for a chance to win Once Human supply packs and rare gear. Free entry for active community members.",
  keywords: ["lottery", "prizes", "Once Human", "supply pack", "win", "NewHopeGGN"],
  openGraph: {
    title: "Lottery | NewHopeGGN",
    description: "Enter the NewHopeGGN lottery for a chance to win Once Human supply packs and rare gear.",
    type: "website",
    images: [{ url: "https://newhopeggn-ggnexusteam.vercel.app/opengraph-image", width: 1200, height: 630 }],
  },
};

export default function LotteryPage() {
  return <LotteryClient />;
}
