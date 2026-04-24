import type { Metadata } from "next";
import { Suspense } from "react";
import SupportClient from "./support-client";

export const metadata: Metadata = {
  title: "Support | VoxBridge",
  description:
    "VoxBridge support center. Get help with wipe packs, technical issues, or community questions.",
  keywords: ["support", "help", "ticket", "Once Human", "VoxBridge", "contact"],
  openGraph: {
    title: "Support | VoxBridge",
    description: "Get help with payments, UID linking, pack delivery, and more. Our staff team is ready to assist.",
    url: "https://newhopeggn.vercel.app/support",
    type: "website",
    images: [{ url: "https://newhopeggn.vercel.app/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", images: ["https://newhopeggn.vercel.app/opengraph-image"] },
};

export default function SupportPage() {
  return (
    <Suspense>
      <SupportClient />
    </Suspense>
  );
}

