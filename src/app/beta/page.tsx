import { Metadata } from "next";
import { BetaPortalClient } from "./beta-portal-client";

export const metadata: Metadata = {
  title: "Beta Portal | NewHopeGGN",
  description: "Exclusive beta features for testing - Raid system and more",
};

export default function BetaPage() {
  return <BetaPortalClient />;
}
