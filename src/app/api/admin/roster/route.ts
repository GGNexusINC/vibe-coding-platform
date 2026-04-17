import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { getRoster, updateAdminStatus, getAdminByDiscordId } from "@/lib/admin-roster";
import { sendDiscordWebhook } from "@/lib/discord";
import type { AdminStatus } from "@/lib/admin-roster";

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const roster = await getRoster();
  return NextResponse.json({ ok: true, roster });
}

export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const discordId = String(body?.discordId ?? "").trim();
  const status = String(body?.status ?? "").trim() as AdminStatus;

  if (!discordId || !["approved", "denied", "pending"].includes(status)) {
    return NextResponse.json(
      { ok: false, error: "discordId and valid status required." },
      { status: 400 },
    );
  }

  const entry = await getAdminByDiscordId(discordId);
  const ok = await updateAdminStatus(discordId, status);
  if (!ok) {
    return NextResponse.json({ ok: false, error: "Admin not found in roster." }, { status: 404 });
  }

  const username = entry?.username ?? discordId;
  const actingAdmin = admin.username ?? admin.discord_id ?? "An admin";
  const now = new Date().toISOString();

  try {
    if (status === "approved") {
      await sendDiscordWebhook({
        content:
          `✅ **Admin Approved**\n` +
          `**${username}** (ID: \`${discordId}\`) has been approved as admin by **${actingAdmin}**.\n` +
          `They can now sign in with Discord to access the panel.\n` +
          `Time (UTC): \`${now}\``,
        username: "NewHopeGGN Admin Gate",
      });
    } else if (status === "denied") {
      await sendDiscordWebhook({
        content:
          `❌ **Admin Denied**\n` +
          `**${username}** (ID: \`${discordId}\`) was denied admin access by **${actingAdmin}**.\n` +
          `Time (UTC): \`${now}\``,
        username: "NewHopeGGN Admin Gate",
      });
    } else if (status === "pending") {
      await sendDiscordWebhook({
        content:
          `🔄 **Admin Revoked**\n` +
          `**${username}** (ID: \`${discordId}\`) had their admin access revoked by **${actingAdmin}**.\n` +
          `Time (UTC): \`${now}\``,
        username: "NewHopeGGN Admin Gate",
      });
    }
  } catch {
    // webhook failure is non-fatal
  }

  const roster = await getRoster();
  return NextResponse.json({ ok: true, roster });
}
