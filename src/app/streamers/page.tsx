import type { Metadata } from "next";
import StreamersClient from "./streamers-client";

export const metadata: Metadata = {
  title: "Streamers | VoxBridge",
  description: "Watch VoxBridge community members stream Once Human live on Twitch and YouTube. Apply to become a featured streamer.",
  keywords: ["streamers", "Twitch", "YouTube", "Once Human", "live streams", "VoxBridge"],
  openGraph: {
    title: "Streamers | VoxBridge",
    description: "Watch VoxBridge community members stream Once Human live on Twitch and YouTube.",
    url: "https://newhopeggn.vercel.app/streamers",
    type: "website",
    images: [{ url: "https://newhopeggn.vercel.app/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", images: ["https://newhopeggn.vercel.app/opengraph-image"] },
};

export default function StreamersPage() {
  return <StreamersClient />;
}
