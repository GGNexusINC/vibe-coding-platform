import type { Metadata } from "next";
import CommunityClient from "./community-client";

export const metadata: Metadata = {
  title: "Community | VoxBridge",
  description: "Join the VoxBridge Discord community. Live voice channels, Discord messages, server stats, and member activity.",
  keywords: ["community", "Discord", "Once Human", "voice channels", "chat", "VoxBridge"],
  openGraph: {
    title: "Community | VoxBridge",
    description: "Join the NewHopeGGN Discord community. Live voice channels, messages, and member activity.",
    url: "https://newhopeggn.vercel.app/community",
    type: "website",
    images: [{ url: "https://newhopeggn.vercel.app/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", images: ["https://newhopeggn.vercel.app/opengraph-image"] },
};

export default function CommunityPage() {
  return <CommunityClient />;
}
