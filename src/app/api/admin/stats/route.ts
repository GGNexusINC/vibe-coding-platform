import { NextResponse } from "next/server";
import { getAdminSession, getActiveWindowMinutes } from "@/lib/admin-auth";
import { getActivitySummary, getRecentActivities } from "@/lib/activity-log";
import { getRoster } from "@/lib/admin-roster";
import { getPresenceMap } from "@/lib/presence";

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

  const [summary, recent, roster, presenceMap] = await Promise.all([
    getActivitySummary(),
    getRecentActivities(30),
    getRoster(),
    getPresenceMap(),
  ]);

  // Build a map of discordId -> member from activity log
  const memberMap = new Map(summary.members.map((m) => [m.discordId, m]));

  // Merge in roster members who have logged in but may have no other activity entries
  for (const entry of roster) {
    if (entry.status === "approved" && !memberMap.has(entry.discordId)) {
      const presence = presenceMap.get(entry.discordId);
      memberMap.set(entry.discordId, {
        discordId: entry.discordId,
        username: entry.username,
        globalName: null,
        discriminator: null,
        avatarUrl: entry.avatarUrl,
        profile: undefined,
        lastActiveAt: entry.updatedAt,
        activeDays: 0,
        events: 0,
        activeNow: presence?.activeNow ?? false,
      });
    }
  }

  // Re-sort: active now first, then by lastActiveAt
  const mergedMembers = [...memberMap.values()].sort((a, b) => {
    if (Number(b.activeNow) !== Number(a.activeNow)) return Number(b.activeNow) - Number(a.activeNow);
    return new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime();
  });

  return NextResponse.json({
    ok: true,
    activeWindowMinutes: getActiveWindowMinutes(),
    summary: {
      ...summary,
      totalMembersTracked: mergedMembers.length,
      members: mergedMembers,
    },
    recent,
  });
}
