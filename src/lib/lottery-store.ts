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

// ISO week identifier, e.g. "2026-W35" — used to tell whether a draw (manual
// or automatic) has already happened during the current week.
export function getIsoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

/** Has a draw (manual admin draw or automatic weekly draw) already happened this ISO week? */
export async function hasDrawnThisWeek(now: Date = new Date()): Promise<boolean> {
  const draws = await getLotteryDraws();
  const latest = draws[0];
  if (!latest) return false;
  return getIsoWeekKey(new Date(latest.drawnAt)) === getIsoWeekKey(now);
}

/**
 * Runs a full lottery draw: picks a winner, records it, grants the reward to
 * inventory, notifies Discord, and clears entries. Shared by the admin manual
 * draw endpoint and the weekly automatic cron draw so both stay in sync.
 */
export async function performLotteryDraw(opts: { clearAfter?: boolean } = {}): Promise<LotteryEntry | null> {
  const clearAfter = opts.clearAfter !== false;

  const winner = await drawLotteryWinner();
  if (!winner) return null;

  const now = new Date().toISOString();
  await saveLotteryDraw({
    winnerId: winner.discordId,
    winnerUsername: winner.username,
    winnerAvatarUrl: winner.avatarUrl ?? null,
    prize: winner.prize,
    drawnAt: now,
    notified: true,
  });

  const sb = getSupabase();
  if (sb && winner.prize && winner.prize.toLowerCase() !== "better luck next time") {
    const { buildRewardInventoryItem, getCurrentWipeCycle } = await import("@/lib/reward-inventory");
    const rewardItem = buildRewardInventoryItem({
      userId: winner.discordId,
      itemSlug: `lottery-${winner.prize}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
      itemName: `Lottery Reward: ${winner.prize}`,
      source: "lottery",
      prizeLabel: winner.prize,
      rewardAt: now,
      wipeCycle: getCurrentWipeCycle(new Date(now)),
      note: "Lottery reward",
    });

    const rewardInsert = await sb
      .from("user_inventory")
      .insert(rewardItem)
      .select("id, item_name, item_type, status, expires_at, metadata")
      .single();
    if (rewardInsert.error) {
      const fallbackItem = { ...rewardItem };
      delete (fallbackItem as Record<string, unknown>).expires_at;
      const fallbackInsert = await sb
        .from("user_inventory")
        .insert(fallbackItem)
        .select("id, item_name, item_type, status, metadata")
        .single();
      if (fallbackInsert.error) {
        console.error("[lottery] Failed to create reward inventory item:", fallbackInsert.error);
      } else {
        console.log("[lottery] Reward inventory item created:", fallbackInsert.data);
      }
    } else {
      console.log("[lottery] Reward inventory item created:", rewardInsert.data);
    }
  }

  const { getDynamicWebhookUrl } = await import("@/lib/webhooks");
  const { sendDiscordWebhook } = await import("@/lib/discord");
  const communityWebhookUrl = await getDynamicWebhookUrl("lottery-entries") || "";
  const winnerAnnouncementWebhookUrl = await getDynamicWebhookUrl("lottery-winners") || "";

  const targetWebhooks = [communityWebhookUrl, winnerAnnouncementWebhookUrl].filter(Boolean);

  if (targetWebhooks.length > 0) {
    const payload = {
      username: "NewHopeGGN Lottery",
      content: "**Lottery winner drawn.**",
      embeds: [
        {
          title: "Lottery Winner",
          description: `Congratulations to **${winner.username}**.\n\nPrize: **${winner.prize}**`,
          color: 0xfacc15,
          fields: [
            { name: "Claim Window", value: "48 hours", inline: true },
            { name: "Choice", value: "Use it to open a ticket or save it in inventory", inline: true },
            { name: "Draw Rule", value: "One winner per draw - randomly selected by system", inline: true },
            { name: "Winner", value: winner.username, inline: true },
            { name: "Discord ID", value: `\`${winner.discordId}\``, inline: true },
            { name: "Prize", value: winner.prize, inline: false },
            { name: "Drawn At", value: `<t:${Math.floor(new Date(now).getTime() / 1000)}:F>`, inline: false },
          ],
          thumbnail: winner.avatarUrl ? { url: winner.avatarUrl } : undefined,
          footer: { text: "NewHopeGGN Lottery System - rewards claim within 48 hours" },
          timestamp: now,
        },
      ],
    };

    for (const webhookUrl of targetWebhooks) {
      await sendDiscordWebhook(payload, { webhookUrl }).catch(() => null);
    }
  }

  if (clearAfter) await clearLotteryEntries();

  return winner;
}
