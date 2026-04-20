import type { Metadata } from "next";
import SupportClient from "./support-client";

export const metadata: Metadata = {
  title: "Support | NewHopeGGN",
  description: "Get help with payments, UID linking, pack delivery, and more. Submit a support ticket and our staff team will respond directly through Discord.",
  keywords: ["support", "help", "ticket", "Once Human", "NewHopeGGN", "contact"],
  openGraph: {
    title: "Support | NewHopeGGN",
    description: "Get help with payments, UID linking, pack delivery, and more. Our staff team is ready to assist.",
    type: "website",
    images: [{ url: "https://newhopeggn.vercel.app/opengraph-image", width: 1200, height: 630 }],
  },
};

export default function SupportPage() {
  return <SupportClient />;
}

