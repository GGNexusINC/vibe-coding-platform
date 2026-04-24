import type { Metadata } from "next";
import BanListPage from "./bans-client";

export const metadata: Metadata = {
  title: "Ban List | VoxBridge",
  description: "Public moderation record for the VoxBridge Once Human server. View bans issued by staff and appeal via support ticket.",
  keywords: ["ban list", "moderation", "enforcement", "Once Human", "VoxBridge", "appeal"],
  openGraph: {
    title: "Ban List | VoxBridge",
    description: "Public moderation record for the VoxBridge Once Human server.",
    url: "https://newhopeggn.vercel.app/bans",
    type: "website",
    images: [{ url: "https://newhopeggn.vercel.app/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["https://newhopeggn.vercel.app/opengraph-image"],
  },
};

export default function BansPage() {
  return <BanListPage />;
}
