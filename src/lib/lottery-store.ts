import { createClient } from "@supabase/supabase-js";

const TABLE_ENTRIES = "lottery_entries";
const TABLE_DRAWS = "lottery_draws";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export type LotteryEntry = {
  id: string;
  discordId: string;
  username: string;
  avatarUrl?: string | null;
  prize: string;
  enteredAt: string;
};

export type LotteryDraw = {
  id: string;
  winnerId: string;
  winnerUsername: string;
  winnerAvatarUrl?: string | null;
  prize: string;
  drawnAt: string;
  notified: boolean;
};

export async function enterLottery(opts: {
  discordId: string;
  username: string;
  avatarUrl?: string | null;
  prize: string;
}): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: "Database not configured." };

  // Check if already entered
  const { data: existing } = await sb
    .from(TABLE_ENTRIES)
    .select("id")
    .eq("discord_id", opts.discordId)
    .single();

  if (existing) return { ok: false, error: "You have already entered this lottery." };

  const { error } = await sb.from(TABLE_ENTRIES).insert({
    discord_id: opts.discordId,
    username: opts.username,
    avatar_url: opts.avatarUrl ?? null,
    prize: opts.prize,
    entered_at: new Date().toISOString(),
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function getLotteryEntries(): Promise<LotteryEntry[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb.from(TABLE_ENTRIES).select("*").order("entered_at", { ascending: false });
  return (data ?? []).map((r) => ({
    id: String(r.id),
    discordId: String(r.discord_id),
    username: String(r.username),
    avatarUrl: r.avatar_url as string | null,
    prize: String(r.prize),
    enteredAt: String(r.entered_at),
  }));
}

export async function drawLotteryWinner(): Promise<LotteryEntry | null> {
  const entries = await getLotteryEntries();
  if (entries.length === 0) return null;
  return entries[Math.floor(Math.random() * entries.length)];
}

export async function clearLotteryEntries(): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from(TABLE_ENTRIES).delete().neq("id", "00000000-0000-0000-0000-000000000000");
}

export async function getLotteryDraws(): Promise<LotteryDraw[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb.from(TABLE_DRAWS).select("*").order("drawn_at", { ascending: false }).limit(20);
  return (data ?? []).map((r) => ({
    id: String(r.id),
    winnerId: String(r.winner_id),
    winnerUsername: String(r.winner_username),
    winnerAvatarUrl: r.winner_avatar_url as string | null,
    prize: String(r.prize),
    drawnAt: String(r.drawn_at),
    notified: Boolean(r.notified),
  }));
}

export async function saveLotteryDraw(draw: Omit<LotteryDraw, "id">): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from(TABLE_DRAWS).insert({
    winner_id: draw.winnerId,
    winner_username: draw.winnerUsername,
    winner_avatar_url: draw.winnerAvatarUrl ?? null,
    prize: draw.prize,
    drawn_at: draw.drawnAt,
    notified: draw.notified,
  });
}
