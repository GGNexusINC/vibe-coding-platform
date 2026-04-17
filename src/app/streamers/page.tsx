import type { Metadata } from "next";
import StreamersClient from "./streamers-client";

export const metadata: Metadata = {
  title: "Streamers | NewHopeGGN",
  description: "Watch NewHopeGGN community members stream Once Human live on Twitch and YouTube. Apply to become a featured streamer.",
  keywords: ["streamers", "Twitch", "YouTube", "Once Human", "live streams", "NewHopeGGN"],
  openGraph: {
    title: "Streamers | NewHopeGGN",
    description: "Watch NewHopeGGN community members stream Once Human live on Twitch and YouTube.",
    type: "website",
  },
};

export default function StreamersPage() {
  return <StreamersClient />;
}
