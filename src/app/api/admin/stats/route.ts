import { NextResponse } from "next/server";
import { getAdminSession, getActiveWindowMinutes } from "@/lib/admin-auth";
import { getActivitySummary, getRecentActivities } from "@/lib/activity-log";

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

  return NextResponse.json({
    ok: true,
    activeWindowMinutes: getActiveWindowMinutes(),
    summary: await getActivitySummary(),
    recent: await getRecentActivities(30),
  });
}
