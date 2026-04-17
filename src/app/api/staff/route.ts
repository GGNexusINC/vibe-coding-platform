import { NextResponse } from "next/server";
import { getRoster } from "@/lib/admin-roster";
import { getPresenceMap } from "@/lib/presence";
import { KNOWN_ADMINS } from "@/lib/env";

export async function GET() {
  try {
    const [roster, presenceMap] = await Promise.all([
      getRoster(),
      getPresenceMap(),
    ]);
    
    // Only return approved admins with live presence, filter out sensitive data
    const publicStaff = roster
      .filter((r) => r.status === "approved")
      .map((r) => {
        const presence = presenceMap.get(r.discordId);
        return {
          discordId: r.discordId,
          username: r.username,
          avatarUrl: r.avatarUrl,
          role: KNOWN_ADMINS.some((a) => a.discordId === r.discordId && a.role === "owner") ? "owner" : "admin",
          status: r.status,
          activeNow: presence?.activeNow ?? false,
          lastSeen: presence?.lastSeen ?? null,
        };
      })
      .sort((a, b) => {
        // Online first, then owners, then alphabetically
        if (a.activeNow !== b.activeNow) return b.activeNow ? 1 : -1;
        if (a.role !== b.role) return a.role === "owner" ? -1 : 1;
        return a.username.localeCompare(b.username);
      });

    return NextResponse.json({ ok: true, staff: publicStaff });
  } catch (error) {
    console.error("[staff-api] error:", error);
    return NextResponse.json({ ok: false, error: "Failed to load staff" }, { status: 500 });
  }
}
