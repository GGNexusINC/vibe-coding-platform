import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { getRoster, updateAdminStatus, getAdminByDiscordId, upsertAdmin } from "@/lib/admin-roster";
import { sendDiscordWebhook } from "@/lib/discord";
import { getActivitySummary } from "@/lib/activity-log";
import type { AdminStatus } from "@/lib/admin-roster";

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const [rosterRaw, activitySummary] = await Promise.all([
    getRoster(),
    getActivitySummary(15),
  ]);

  // Build a map of activity data keyed by discordId
  const activityMap = new Map(
    activitySummary.members.map((m) => [m.discordId, m]),
  );

  // Build a map of roster entries keyed by discordId
  const rosterMap = new Map(rosterRaw.map((r) => [r.discordId, r]));

  // Any activity member not in roster was a pre-existing admin — add them as approved
  const upsertPromises: Promise<unknown>[] = [];
  for (const member of activitySummary.members) {
    if (!rosterMap.has(member.discordId)) {
      upsertPromises.push(
        upsertAdmin({
          discordId: member.discordId,
          username: member.globalName || member.username,
          avatarUrl: member.avatarUrl,
          status: "approved",
        }),
      );
    }
  }
  if (upsertPromises.length > 0) {
    await Promise.all(upsertPromises);
    // Re-fetch after upserts
    const fresh = await getRoster();
    fresh.forEach((r) => rosterMap.set(r.discordId, r));
  }

  // Merge roster + activity into enriched list
  const allIds = new Set([...rosterMap.keys(), ...activityMap.keys()]);
  const enriched = [...allIds].map((id) => {
    const r = rosterMap.get(id);
    const a = activityMap.get(id);
    return {
      id: r?.id ?? id,
      discordId: id,
      username: r?.username ?? a?.globalName ?? a?.username ?? id,
      avatarUrl: r?.avatarUrl ?? a?.avatarUrl,
      status: r?.status ?? "approved",
      addedAt: r?.addedAt ?? a?.lastActiveAt ?? new Date().toISOString(),
      updatedAt: r?.updatedAt ?? a?.lastActiveAt ?? new Date().toISOString(),
      activeNow: a?.activeNow ?? false,
      lastActiveAt: a?.lastActiveAt ?? null,
    };
  });

  // Sort: active first, then by last active
  enriched.sort((a, b) => {
    if (Number(b.activeNow) !== Number(a.activeNow)) return Number(b.activeNow) - Number(a.activeNow);
    if (a.lastActiveAt && b.lastActiveAt) return new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime();
    return 0;
  });

  return NextResponse.json({ ok: true, roster: enriched });
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
