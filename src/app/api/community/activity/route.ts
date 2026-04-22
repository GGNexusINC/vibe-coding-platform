import { NextResponse } from "next/server";
import { getRecentActivities } from "@/lib/activity-log";

export const revalidate = 30;

const PRIVATE_ACTIVITY_TYPES = new Set(["admin_broadcast"]);

export async function GET() {
  const recent = (await getRecentActivities(25)).filter((entry) => {
    if (entry.metadata?.isAdmin) return false;
    return !PRIVATE_ACTIVITY_TYPES.has(entry.type);
  });

  return NextResponse.json(
    { ok: true, recent },
    {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    }
  );
}
