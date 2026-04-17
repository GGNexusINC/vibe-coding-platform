import type { Metadata } from "next";
import CommunityClient from "./community-client";

export const metadata: Metadata = {
  title: "Community | NewHopeGGN",
  description: "Join the NewHopeGGN Discord community. Live voice channels, Discord messages, server stats, and member activity.",
  keywords: ["community", "Discord", "Once Human", "voice channels", "chat", "NewHopeGGN"],
  openGraph: {
    title: "Community | NewHopeGGN",
    description: "Join the NewHopeGGN Discord community. Live voice channels, messages, and member activity.",
    type: "website",
  },
};

export default function CommunityPage() {
  return <CommunityClient />;
}
