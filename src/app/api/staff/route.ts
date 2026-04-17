import { NextResponse } from "next/server";
import { getRoster } from "@/lib/admin-roster";
import { KNOWN_ADMINS } from "@/lib/env";

export async function GET() {
  try {
    const roster = await getRoster();
    
    // Only return approved admins, filter out sensitive data
    const publicStaff = roster
      .filter((r) => r.status === "approved")
      .map((r) => ({
        discordId: r.discordId,
        username: r.username,
        avatarUrl: r.avatarUrl,
        role: KNOWN_ADMINS.some((a) => a.discordId === r.discordId && a.role === "owner") ? "owner" : "admin",
        status: r.status,
      }))
      .sort((a, b) => (a.role === "owner" ? -1 : b.role === "owner" ? 1 : 0));

    return NextResponse.json({ ok: true, staff: publicStaff });
  } catch (error) {
    console.error("[staff-api] error:", error);
    return NextResponse.json({ ok: false, error: "Failed to load staff" }, { status: 500 });
  }
}
