import { NextResponse } from "next/server";
import { getAdminSession, getActiveWindowMinutes } from "@/lib/admin-auth";
import { getActivitySummary, getRecentActivities } from "@/lib/activity-log";
import { getRoster } from "@/lib/admin-roster";
import { getPresenceMap } from "@/lib/presence";
import { createClient } from "@supabase/supabase-js";
import { KNOWN_ADMINS } from "@/lib/env";

async function getGuildMembers() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { data } = await sb
    .from("guild_members")
    .select("discord_id, username, display_name, avatar_url, roles, joined_at, last_synced")
    .eq("is_bot", false);
  return data ?? [];
}

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

  const [summary, recent, roster, presenceMap, guildMembers] = await Promise.all([
    getActivitySummary(),
    getRecentActivities(30),
    getRoster(),
    getPresenceMap(),
    getGuildMembers(),
  ]);

  // Build set of approved admin IDs for gold badge tagging
  const adminIds = new Set(roster.filter(r => r.status === "approved").map(r => r.discordId));

  // Build a map of discordId -> member from activity log, tagging admins
  const memberMap = new Map(summary.members.map((m) => [m.discordId, { ...m, isAdmin: adminIds.has(m.discordId) }]));

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
        isAdmin: true,
      });
    }
  }

  // Merge ALL guild members from bot sync — this is the full Discord server member list
  for (const gm of guildMembers) {
    if (!memberMap.has(gm.discord_id)) {
      const presence = presenceMap.get(gm.discord_id);
      memberMap.set(gm.discord_id, {
        discordId:    gm.discord_id,
        username:     gm.display_name || gm.username,
        globalName:   gm.display_name || null,
        discriminator: null,
        avatarUrl:    gm.avatar_url,
        profile:      undefined,
        lastActiveAt: gm.last_synced,
        activeDays:   0,
        events:       0,
        activeNow:    presence?.activeNow ?? false,
        isAdmin:      adminIds.has(gm.discord_id),
      });
    }
  }

  // Re-sort: active now first, then by lastActiveAt
  const mergedMembers = [...memberMap.values()].sort((a, b) => {
    if (Number(b.activeNow) !== Number(a.activeNow)) return Number(b.activeNow) - Number(a.activeNow);
    return new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime();
  });

  const isOwner = KNOWN_ADMINS.some(
    (a) => a.discordId === admin.discord_id && a.role === "owner"
  );

  return NextResponse.json({
    ok: true,
    activeWindowMinutes: getActiveWindowMinutes(),
    viewer: { discordId: admin.discord_id, username: admin.username, isOwner },
    summary: {
      ...summary,
      totalMembersTracked: mergedMembers.length,
      members: mergedMembers,
    },
    recent,
  });
}
