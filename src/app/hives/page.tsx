import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listHives } from "@/lib/hive-store";
import { HivesClient } from "./hives-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hive Command Center | NewHopeGGN",
  description: "Coordinate with your hive, claim territories, earn bonus points, and dominate the Once Human map.",
  keywords: ["hives", "territory", "map", "Once Human", "NewHopeGGN", "community"],
};

export default async function HivesPage() {
  const user = await getSession();
  const sb = createSupabaseAdminClient();
  const hives = await listHives(sb);
  return <HivesClient user={user as any} initialHives={hives} />;
}
