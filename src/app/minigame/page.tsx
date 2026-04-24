import type { Metadata } from "next";
import MinigameClient from "./minigame-client";

export const metadata: Metadata = {
  title: "Whack-a-Mole | VoxBridge",
  description: "Play the VoxBridge weekly Whack-a-Mole minigame. Hit moles to win Once Human weapons — legendary, epic, rare and more. One chance per week.",
  keywords: ["minigame", "whack a mole", "Once Human", "prizes", "weapons", "VoxBridge", "weekly"],
  openGraph: {
    title: "Whack-a-Mole | VoxBridge",
    description: "Play the weekly minigame and win Once Human weapons. One chance per week — how high can you score?",
    url: "https://newhopeggn.vercel.app/minigame",
    type: "website",
    images: [{ url: "https://newhopeggn.vercel.app/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["https://newhopeggn.vercel.app/opengraph-image"],
  },
};

export default function MinigamePage() {
  return <MinigameClient />;
}
