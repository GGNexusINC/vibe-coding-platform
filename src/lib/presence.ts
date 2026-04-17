import { createClient } from "@supabase/supabase-js";

const TABLE = "presence";
const ACTIVE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type PresenceEntry = {
  discordId: string;
  username: string;
  avatarUrl?: string | null;
  globalName?: string | null;
  lastSeen: string;
  activeNow: boolean;
};

export async function upsertPresence(opts: {
  discordId: string;
  username: string;
  avatarUrl?: string | null;
  globalName?: string | null;
}) {
  const sb = getSupabase();
  if (!sb) return;
  const now = new Date().toISOString();
  await sb.from(TABLE).upsert(
    {
      discord_id: opts.discordId,
      username: opts.username,
      avatar_url: opts.avatarUrl ?? null,
      global_name: opts.globalName ?? null,
      last_seen: now,
    },
    { onConflict: "discord_id" },
  );
}

export async function getPresenceMap(): Promise<Map<string, PresenceEntry>> {
  const sb = getSupabase();
  const map = new Map<string, PresenceEntry>();
  if (!sb) return map;

  const { data } = await sb.from(TABLE).select("*");
  if (!data) return map;

  const cutoff = Date.now() - ACTIVE_WINDOW_MS;
  for (const row of data) {
    const lastSeen = String(row.last_seen ?? "");
    map.set(String(row.discord_id), {
      discordId: String(row.discord_id),
      username: String(row.username ?? ""),
      avatarUrl: (row.avatar_url as string | null) ?? null,
      globalName: (row.global_name as string | null) ?? null,
      lastSeen,
      activeNow: lastSeen ? new Date(lastSeen).getTime() >= cutoff : false,
    });
  }
  return map;
}
