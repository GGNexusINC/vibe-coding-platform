import { createClient } from "@supabase/supabase-js";

const TABLE = "streamers";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export type StreamerStatus = "pending" | "approved" | "denied";

export type StreamLink = {
  url: string;
  title: string;
  platform: string;
};

export type Streamer = {
  id: string;
  discordId: string;
  username: string;
  avatarUrl?: string | null;
  streamUrl: string; // Stored as JSON string of StreamLink[]
  streamTitle: string; // Fallback title
  platform: string; // Fallback platform
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

  // Fetch the existing entry (there can only be one because of the unique constraint on discord_id)
  const { data: existing } = await sb
    .from(TABLE)
    .select("*")
    .eq("discord_id", opts.discordId)
    .maybeSingle();

  const newLink: StreamLink = {
    url: opts.streamUrl,
    title: opts.streamTitle,
    platform: opts.platform
  };

  if (existing) {
    let links: StreamLink[] = [];
    try {
      // Try to parse existing links from stream_url
      const parsed = JSON.parse(existing.stream_url);
      links = Array.isArray(parsed) ? parsed : [];
    } catch {
      // Fallback if it was a plain URL before
      if (existing.stream_url) {
        links = [{
          url: existing.stream_url,
          title: existing.stream_title || "Stream",
          platform: existing.platform || "twitch"
        }];
      }
    }

    // Check if this URL already exists in the list to avoid duplicates
    const alreadyExists = links.some(l => l.url === opts.streamUrl);
    if (!alreadyExists) {
      links.push(newLink);
    } else {
      // Update the existing link's title/platform
      links = links.map(l => l.url === opts.streamUrl ? newLink : l);
    }

    await sb.from(TABLE).update({
      username: opts.username,
      avatar_url: opts.avatarUrl ?? null,
      stream_url: JSON.stringify(links),
      stream_title: opts.streamTitle, // Keep last submitted as fallback
      platform: opts.platform, // Keep last submitted as fallback
      updated_at: now,
    }).eq("discord_id", opts.discordId);
    
    return { ok: true };
  }

  // Create new entry with the link in a JSON array
  const { error } = await sb.from(TABLE).insert({
    discord_id: opts.discordId,
    username: opts.username,
    avatar_url: opts.avatarUrl ?? null,
    stream_url: JSON.stringify([newLink]),
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
  const { data: streamersData } = await query;
  if (!streamersData) return [];

  // Fetch fresh synced avatars from guild_members to prevent expired URL links
  const discordIds = streamersData.map((s) => s.discord_id).filter(Boolean);
  if (discordIds.length > 0) {
    const { data: membersData } = await sb
      .from("guild_members")
      .select("discord_id, avatar_url")
      .in("discord_id", discordIds);

    if (membersData && membersData.length > 0) {
      const avatarMap = new Map(membersData.map((m) => [m.discord_id, m.avatar_url]));
      return streamersData.map((r) => {
        const mapped = mapRow(r);
        const freshAvatar = avatarMap.get(mapped.discordId);
        if (freshAvatar) {
          mapped.avatarUrl = freshAvatar;
        }
        return mapped;
      });
    }
  }

  return streamersData.map(mapRow);
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
