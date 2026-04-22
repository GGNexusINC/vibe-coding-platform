import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const REWARD_CLAIM_WINDOW_HOURS = 48;
export const REWARD_CLAIM_WINDOW_MS = REWARD_CLAIM_WINDOW_HOURS * 60 * 60 * 1000;

export type RewardSource = "lottery" | "whackamole";

export type RewardInventoryMetadata = {
  reward_source?: RewardSource;
  reward_prize?: string;
  reward_score?: number;
  reward_won_at?: string;
  reward_claim_expires_at?: string;
  reward_claim_window_hours?: number;
  reward_claim_note?: string;
  item_image_url?: string;
  item_art_source_name?: string;
  item_art_source_url?: string;
  item_art_verified?: boolean;
  [key: string]: unknown;
};

export type RewardInventoryItem = {
  user_id: string;
  item_type: string;
  item_slug: string;
  item_name: string;
  wipe_cycle: string;
  metadata: RewardInventoryMetadata;
  expires_at: string;
};

export function getSupabaseClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function getCurrentWipeCycle(now = new Date()): string {
  return `wipe-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function buildRewardInventoryItem(opts: {
  userId: string;
  itemSlug: string;
  itemName: string;
  source: RewardSource;
  prizeLabel: string;
  score?: number;
  rewardAt?: string;
  wipeCycle?: string;
  note?: string;
}): RewardInventoryItem {
  const rewardAt = opts.rewardAt ?? new Date().toISOString();
  const expiresAt = new Date(new Date(rewardAt).getTime() + REWARD_CLAIM_WINDOW_MS).toISOString();

  return {
    user_id: opts.userId,
    item_type: "reward",
    item_slug: opts.itemSlug,
    item_name: opts.itemName,
    wipe_cycle: opts.wipeCycle ?? getCurrentWipeCycle(new Date(rewardAt)),
    expires_at: expiresAt,
    metadata: {
      reward_source: opts.source,
      reward_prize: opts.prizeLabel,
      reward_score: opts.score,
      reward_won_at: rewardAt,
      reward_claim_expires_at: expiresAt,
      reward_claim_window_hours: REWARD_CLAIM_WINDOW_HOURS,
      reward_claim_note: opts.note ?? "Claim within 48 hours",
    },
  };
}

export async function cleanupExpiredRewardItems(sb: SupabaseClient, userId?: string) {
  const now = new Date().toISOString();
  const applyUserFilter = <T extends { user_id?: string }>(rows: T[]) =>
    userId ? rows.filter((row) => row.user_id === userId) : rows;

  const parseExpiry = (row: { expires_at?: string | null; metadata?: RewardInventoryMetadata }) =>
    row.expires_at || (row.metadata?.reward_claim_expires_at ?? null);

  const buildExpiredIds = (rows: Array<{ id: string; expires_at?: string | null; metadata?: RewardInventoryMetadata; status?: string; user_id?: string }>) =>
    applyUserFilter(rows)
      .filter((row) => row.status !== "used")
      .filter((row) => {
        const candidate = parseExpiry(row);
        return Boolean(candidate) && new Date(candidate as string).getTime() < Date.now();
      })
      .map((row) => row.id);

  let expiredIds: string[] = [];

  const primaryQuery = sb
    .from("user_inventory")
    .select("id, user_id, item_name, item_type, expires_at, metadata, status")
    .neq("status", "used");
  if (userId) primaryQuery.eq("user_id", userId);

  const primary = await primaryQuery.limit(100);
  if (!primary.error && primary.data?.length) {
    expiredIds = buildExpiredIds(primary.data as Array<{ id: string; expires_at?: string | null; metadata?: RewardInventoryMetadata; status?: string; user_id?: string }>);
  } else {
    const fallbackQuery = sb
      .from("user_inventory")
      .select("id, user_id, item_name, item_type, metadata, status")
      .neq("status", "used");
    if (userId) fallbackQuery.eq("user_id", userId);

    const fallback = await fallbackQuery.limit(100);
    if (fallback.error || !fallback.data?.length) return { expired: 0 };
    expiredIds = buildExpiredIds(fallback.data as Array<{ id: string; metadata?: RewardInventoryMetadata; status?: string; user_id?: string }>);
  }

  if (!expiredIds.length) return { expired: 0 };

  const expiredAt = new Date().toISOString();

  const { error: deleteError } = await sb
    .from("user_inventory")
    .delete()
    .in("id", expiredIds);

  if (deleteError) {
    return { expired: 0, error: deleteError.message };
  }

  return { expired: expiredIds.length, expiredAt };
}
