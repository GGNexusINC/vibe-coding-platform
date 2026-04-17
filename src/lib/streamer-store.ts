import { createClient } from "@supabase/supabase-js";

const TABLE = "streamers";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export type StreamerStatus = "pending" | "approved" | "denied";

export type Streamer = {
  id: string;
  discordId: string;
  username: string;
  avatarUrl?: string | null;
  streamUrl: string;
  streamTitle: string;
  platform: string;
  status: StreamerStatus;
  appliedAt: string;
  updatedAt: string;
};

export async function applyAsStreamer(opts: {
  discordId: string;
  username: string;
  avatarUrl?: string | null;
  streamUrl: string;
  streamTitle: string;
  platform: string;
}): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: "Database not configured." };
  const now = new Date().toISOString();

  const { data: existing } = await sb
    .from(TABLE)
    .select("id, status")
    .eq("discord_id", opts.discordId)
    .single();

  if (existing) {
    // Update stream info but keep status
    await sb.from(TABLE).update({
      username: opts.username,
      avatar_url: opts.avatarUrl ?? null,
      stream_url: opts.streamUrl,
      stream_title: opts.streamTitle,
      platform: opts.platform,
      updated_at: now,
    }).eq("discord_id", opts.discordId);
    return { ok: true };
  }

  const { error } = await sb.from(TABLE).insert({
    discord_id: opts.discordId,
    username: opts.username,
    avatar_url: opts.avatarUrl ?? null,
    stream_url: opts.streamUrl,
    stream_title: opts.streamTitle,
    platform: opts.platform,
    status: "pending",
    applied_at: now,
    updated_at: now,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function getStreamers(statusFilter?: StreamerStatus): Promise<Streamer[]> {
  const sb = getSupabase();
  if (!sb) return [];
  let query = sb.from(TABLE).select("*").order("applied_at", { ascending: false });
  if (statusFilter) query = query.eq("status", statusFilter);
  const { data } = await query;
  return (data ?? []).map(mapRow);
}

export async function updateStreamerStatus(discordId: string, status: StreamerStatus): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { data } = await sb
    .from(TABLE)
    .update({ status, updated_at: new Date().toISOString() })
    .eq("discord_id", discordId)
    .select();
  return (data ?? []).length > 0;
}

function mapRow(r: Record<string, unknown>): Streamer {
  return {
    id: String(r.id),
    discordId: String(r.discord_id),
    username: String(r.username),
    avatarUrl: r.avatar_url as string | null,
    streamUrl: String(r.stream_url ?? ""),
    streamTitle: String(r.stream_title ?? ""),
    platform: String(r.platform ?? "twitch"),
    status: (r.status as StreamerStatus) ?? "pending",
    appliedAt: String(r.applied_at),
    updatedAt: String(r.updated_at),
  };
}
