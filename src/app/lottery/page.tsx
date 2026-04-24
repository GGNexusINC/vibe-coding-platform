import type { Metadata } from "next";
import LotteryClient from "./lottery-client";

export const metadata: Metadata = {
  title: "Lottery | VoxBridge",
  description: "Enter the VoxBridge lottery for a chance to win Once Human supply packs and rare gear. Free entry for active community members.",
  keywords: ["lottery", "prizes", "Once Human", "supply pack", "win", "VoxBridge"],
  openGraph: {
    title: "Lottery | VoxBridge",
    description: "Enter the VoxBridge lottery for a chance to win Once Human supply packs and rare gear.",
    url: "https://newhopeggn.vercel.app/lottery",
    type: "website",
    images: [{ url: "https://newhopeggn.vercel.app/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", images: ["https://newhopeggn.vercel.app/opengraph-image"] },
};

export default function LotteryPage() {
  return <LotteryClient />;
}
