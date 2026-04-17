import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { logActivity } from "@/lib/activity-log";

export async function POST() {
  const session = await getSession();
  if (!session?.discord_id) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  await logActivity({
    type: "login",
    username: session.username ?? "Unknown",
    discordId: session.discord_id,
    avatarUrl: session.avatar_url ?? undefined,
    globalName: session.global_name ?? null,
    discriminator: null,
    details: "Heartbeat — user active on site.",
  });

  return NextResponse.json({ ok: true });
}
