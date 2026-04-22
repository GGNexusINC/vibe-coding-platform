import { NextResponse } from "next/server";
import { getAdminSession, getActiveWindowMinutes } from "@/lib/admin-auth";
import { getActivitySummary, getRecentActivities } from "@/lib/activity-log";
import { getRoster } from "@/lib/admin-roster";
import { getPresenceMap } from "@/lib/presence";
import { readBotOpsEvents, readBotSystemStatus } from "@/lib/system-status";
import { createClient } from "@supabase/supabase-js";
import { KNOWN_ADMINS } from "@/lib/env";

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function getGuildMembers() {
  const sb = getSupabaseClient();
  if (!sb) return [];
  const { data } = await sb
    .from("guild_members")
    .select("discord_id, username, display_name, avatar_url, roles, joined_at, last_synced, is_bot")
    .order("is_bot", { ascending: true })
    .order("display_name", { ascending: true });
  return data ?? [];
}

async function getSupabaseHealth() {
  const sb = getSupabaseClient();
  if (!sb) {
    return {
      status: "offline" as const,
      label: "Supabase",
      detail: "Database env is missing.",
      score: 8,
      updatedAt: new Date().toISOString(),
    };
  }

  const { error } = await sb.from("site_settings").select("key").limit(1);
  if (error) {
    return {
      status: "degraded" as const,
      label: "Supabase",
      detail: error.message,
      score: 42,
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    status: "online" as const,
    label: "Supabase",
    detail: "Database queries are responding.",
    score: 96,
    updatedAt: new Date().toISOString(),
  };
}

// Get true active day counts per user from user_active_days (permanent, never pruned)
async function getActiveDaysMap(): Promise<Map<string, number>> {
  const sb = getSupabaseClient();
  if (!sb) return new Map();

  // Primary: read from persistent user_active_days table
  const { data: persistentDays, error: persistentErr } = await sb
    .from("user_active_days")
    .select("discord_id, day");

  if (!persistentErr && persistentDays && persistentDays.length > 0) {
    const map = new Map<string, number>();
    for (const row of persistentDays) {
      if (!row.discord_id) continue;
      map.set(row.discord_id, (map.get(row.discord_id) ?? 0) + 1);
    }
    return map;
  }

  // Fallback: count distinct days from activity_logs (may be incomplete due to pruning)
  const { data: raw } = await sb
    .from("activity_logs")
    .select("discord_id, created_at")
    .not("discord_id", "is", null);

  if (!raw) return new Map();

  const dayMap = new Map<string, Set<string>>();
  for (const row of raw) {
    if (!row.discord_id) continue;
    if (!dayMap.has(row.discord_id)) dayMap.set(row.discord_id, new Set());
    dayMap.get(row.discord_id)!.add(String(row.created_at).slice(0, 10));
  }

  return new Map([...dayMap.entries()].map(([id, days]) => [id, days.size]));
}

// Get total active minutes per user (time between first and last event per day, summed)
async function getActiveMinutesMap(): Promise<Map<string, number>> {
  const sb = getSupabaseClient();
  if (!sb) return new Map();

  const { data: raw } = await sb
    .from("activity_logs")
    .select("discord_id, created_at")
    .not("discord_id", "is", null)
    .order("created_at", { ascending: true });

  if (!raw) return new Map();

  // Group timestamps by user+day, sum the span (last - first) per day
  const userDayMap = new Map<string, Map<string, { first: number; last: number }>>();
  for (const row of raw) {
    if (!row.discord_id) continue;
    const day = String(row.created_at).slice(0, 10);
    const ts = new Date(row.created_at).getTime();
    if (!userDayMap.has(row.discord_id)) userDayMap.set(row.discord_id, new Map());
    const dayMap = userDayMap.get(row.discord_id)!;
    const existing = dayMap.get(day);
    if (!existing) {
      dayMap.set(day, { first: ts, last: ts });
    } else {
      if (ts < existing.first) existing.first = ts;
      if (ts > existing.last) existing.last = ts;
    }
  }

  const result = new Map<string, number>();
  for (const [userId, days] of userDayMap.entries()) {
    let totalMs = 0;
    for (const { first, last } of days.values()) {
      totalMs += Math.max(0, last - first);
    }
    result.set(userId, Math.round(totalMs / 60000));
  }
  return result;
}

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

  const [summary, recent, roster, presenceMap, guildMembers, activeDaysMap, activeMinutesMap, botStatus, botEvents, supabaseHealth] = await Promise.all([
    getActivitySummary(),
    getRecentActivities(30),
    getRoster(),
    getPresenceMap(),
    getGuildMembers(),
    getActiveDaysMap(),
    getActiveMinutesMap(),
    readBotSystemStatus(),
    readBotOpsEvents(),
    getSupabaseHealth(),
  ]);

  // Build set of approved admin IDs for gold badge tagging
  const adminIds = new Set(roster.filter(r => r.status === "approved").map(r => r.discordId));

  // Build a map of discordId -> member from activity log, tagging admins
  const memberMap = new Map(summary.members.map((m) => [m.discordId, { ...m, isAdmin: adminIds.has(m.discordId), isBot: false }]));

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
        isBot: false,
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
        isBot:        gm.is_bot,
      });
    }
  }

  // Override activeDays + set activeMinutes for every member from the full activity_logs table
  for (const [id, member] of memberMap.entries()) {
    const trueDays = activeDaysMap.get(id);
    if (trueDays !== undefined) member.activeDays = trueDays;
    const mins = activeMinutesMap.get(id);
    (member as typeof member & { activeMinutes?: number }).activeMinutes = mins ?? 0;
  }

  // Re-sort: active now first, then by lastActiveAt
  const mergedMembers = [...memberMap.values()].sort((a, b) => {
    if (Number(b.activeNow) !== Number(a.activeNow)) return Number(b.activeNow) - Number(a.activeNow);
    return new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime();
  });

  const isOwner = KNOWN_ADMINS.some(
    (a) => a.discordId === admin.discord_id && a.role === "owner"
  );
  const activeListeners = botStatus?.snapshot?.voice.activeListeners ?? 0;

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
    botStatus,
    botEvents,
    systemConnections: [
      {
        id: "fly-discord-bot",
        label: "Fly Discord Bot",
        status: botStatus?.snapshot?.ready ? "online" : botStatus?.snapshot ? "degraded" : "offline",
        detail: botStatus?.snapshot
          ? `${botStatus.snapshot.discord.guilds} guild${botStatus.snapshot.discord.guilds === 1 ? "" : "s"} · ${activeListeners} listener${activeListeners === 1 ? "" : "s"}`
          : "No heartbeat received yet.",
        score: botStatus?.snapshot
          ? (botStatus.snapshot.status === "online" ? 100 : botStatus.snapshot.status === "degraded" ? 58 : 42)
          : 8,
        updatedAt: botStatus?.updatedAt ?? null,
      },
      {
        id: "voice-relay",
        label: "Voice Relay",
        status: activeListeners > 0 ? "online" : botStatus?.snapshot ? "degraded" : "offline",
        detail: botStatus?.snapshot
          ? `${activeListeners} active listener${activeListeners === 1 ? "" : "s"}`
          : "No live voice session yet.",
        score: activeListeners > 0 ? 94 : botStatus?.snapshot ? 36 : 8,
        updatedAt: botStatus?.updatedAt ?? null,
      },
      {
        id: "deepgram",
        label: "Deepgram",
        status: botStatus?.snapshot?.deepgram.configured ? (botStatus.snapshot.deepgram.activeSessions > 0 ? "online" : "degraded") : "offline",
        detail: botStatus?.snapshot
          ? `${botStatus.snapshot.deepgram.activeSessions} active session${botStatus.snapshot.deepgram.activeSessions === 1 ? "" : "s"}`
          : "No transcription stream.",
        score: botStatus?.snapshot?.deepgram.configured ? 90 : 10,
        updatedAt: botStatus?.updatedAt ?? null,
      },
      {
        id: "supabase",
        label: "Supabase",
        status: supabaseHealth.status,
        detail: supabaseHealth.detail,
        score: supabaseHealth.score,
        updatedAt: supabaseHealth.updatedAt,
      },
      {
        id: "admin-api",
        label: "Admin API",
        status: "online",
        detail: "This dashboard payload loaded successfully.",
        score: 100,
        updatedAt: new Date().toISOString(),
      },
    ],
  });
}
