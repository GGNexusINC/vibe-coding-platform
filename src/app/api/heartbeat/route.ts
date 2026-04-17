import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getAdminSession } from "@/lib/admin-auth";
import { logActivity } from "@/lib/activity-log";
import { upsertPresence } from "@/lib/presence";

export async function POST() {
  const [session, adminSession] = await Promise.all([
    getSession(),
    getAdminSession(),
  ]);

  const discordId = session?.discord_id ?? adminSession?.discord_id;
  const username = session?.username ?? adminSession?.username ?? "Unknown";
  const avatarUrl = session?.avatar_url ?? undefined;
  const globalName = session?.global_name ?? null;

  if (!discordId) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  await Promise.all([
    logActivity({
      type: "login",
      username,
      discordId,
      avatarUrl,
      globalName,
      discriminator: null,
      details: "Heartbeat — user active on site.",
    }),
    upsertPresence({ discordId, username, avatarUrl, globalName }),
  ]);

  return NextResponse.json({ ok: true });
}
