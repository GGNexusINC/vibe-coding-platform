import type { SupabaseClient } from "@supabase/supabase-js";
import { listHives } from "@/lib/hive-store";

export type PurchasePointsResult = {
  basePoints: number;
  hiveBonus: number;
  totalPoints: number;
  hiveName: string;
};

/**
 * Calculates total points earned for a store purchase based on pack slug(s), total amount,
 * custom pointsOverride setting in site_settings, and Hive membership bonus (+15%).
 */
export async function calculatePurchasePoints(
  supabase: SupabaseClient,
  userId: string | null,
  packSlug: string,
  amountStr: string | number
): Promise<PurchasePointsResult> {
  const numericAmount = typeof amountStr === "number" ? amountStr : parseFloat(String(amountStr || "0"));
  const fallbackBase = Math.floor(numericAmount * 100);

  let totalBasePoints = 0;
  let hasOverrideMatch = false;

  // 1. Fetch dynamic store packages to check for pointsOverride or package prices
  try {
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "store_packages")
      .maybeSingle();

    const packages: any[] = data?.value?.packages || [];

    // Parse multi-item format: slug:qty,slug:qty
    const itemPairs = packSlug.includes(",")
      ? packSlug.split(",")
      : [packSlug.includes(":") ? packSlug : `${packSlug}:1`];

    for (const pair of itemPairs) {
      const [slug, qtyStr] = pair.split(":");
      const quantity = parseInt(qtyStr || "1", 10) || 1;
      const pkg = packages.find((p) => p.slug === slug);

      if (pkg) {
        if (pkg.pointsOverride !== undefined && pkg.pointsOverride !== null && Number(pkg.pointsOverride) >= 0) {
          totalBasePoints += Number(pkg.pointsOverride) * quantity;
          hasOverrideMatch = true;
        } else if (pkg.price) {
          totalBasePoints += Math.floor(Number(pkg.price) * 100) * quantity;
          hasOverrideMatch = true;
        }
      }
    }
  } catch (e) {
    console.warn("[store-points] Failed to fetch site_settings packages:", e);
  }

  if (!hasOverrideMatch || totalBasePoints <= 0) {
    totalBasePoints = fallbackBase;
  }

  // 2. Check Hive bonus (+15%)
  let hiveBonus = 0;
  let hiveName = "";

  try {
    if (userId && userId !== "guest") {
      const hives = await listHives(supabase);
      const userHive = hives.find((h) => h.members.some((m) => m.discord_id === userId));
      if (userHive) {
        hiveBonus = Math.floor(totalBasePoints * 0.15);
        hiveName = userHive.name;
      }
    }
  } catch (e) {
    console.warn("[store-points] Failed to check hive bonus:", e);
  }

  return {
    basePoints: totalBasePoints,
    hiveBonus,
    totalPoints: totalBasePoints + hiveBonus,
    hiveName,
  };
}

/**
 * Grants points for a completed store transaction idempotently.
 */
export async function fulfillPurchasePoints(
  supabase: SupabaseClient,
  userId: string | null,
  transactionId: string,
  packSlug: string,
  amount: string | number,
  packName: string,
  source: string = "paypal_store"
): Promise<{ granted: boolean; pointsEarned: number; hiveBonus: number }> {
  if (!userId || userId === "guest" || !transactionId || transactionId === "N/A") {
    return { granted: false, pointsEarned: 0, hiveBonus: 0 };
  }

  try {
    // 1. Idempotency check: see if points for this transaction_id were already recorded
    const { data: existingLedger } = await supabase
      .from("points_ledger")
      .select("id")
      .eq("discord_id", userId)
      .filter("metadata->>transaction_id", "eq", transactionId)
      .maybeSingle();

    if (existingLedger?.id) {
      console.log(`[store-points] Points for transaction ${transactionId} already granted — skipping`);
      return { granted: false, pointsEarned: 0, hiveBonus: 0 };
    }

    // 2. Calculate points
    const pointsInfo = await calculatePurchasePoints(supabase, userId, packSlug, amount);
    if (pointsInfo.totalPoints <= 0) {
      return { granted: false, pointsEarned: 0, hiveBonus: 0 };
    }

    // 3. Fetch user's existing profile points
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("points")
      .eq("discord_id", userId)
      .maybeSingle();

    const currentPoints = profile?.points || 0;
    const newPoints = currentPoints + pointsInfo.totalPoints;

    // 4. Upsert user_profiles (creates row if user profile did not exist)
    const { error: profileErr } = await supabase
      .from("user_profiles")
      .upsert({ discord_id: userId, points: newPoints }, { onConflict: "discord_id" });

    if (profileErr) {
      console.error("[store-points] Failed to update user_profiles points:", profileErr);
      return { granted: false, pointsEarned: 0, hiveBonus: 0 };
    }

    // 5. Insert points_ledger record
    const reason = `Earned from purchase: ${packName || packSlug}${
      pointsInfo.hiveBonus > 0 ? ` (+${pointsInfo.hiveBonus} Hive Bonus)` : ""
    }`;

    const { error: ledgerErr } = await supabase.from("points_ledger").insert({
      discord_id: userId,
      amount: pointsInfo.totalPoints,
      reason,
      metadata: {
        transaction_id: transactionId,
        pack_slug: packSlug,
        base_points: pointsInfo.basePoints,
        hive_bonus: pointsInfo.hiveBonus,
        hive_name: pointsInfo.hiveName,
        source,
      },
    });

    if (ledgerErr) {
      console.error("[store-points] Failed to insert points_ledger:", ledgerErr);
    }

    console.log(`[store-points] Successfully granted ${pointsInfo.totalPoints} pts to ${userId} for transaction ${transactionId}`);
    return { granted: true, pointsEarned: pointsInfo.totalPoints, hiveBonus: pointsInfo.hiveBonus };
  } catch (err) {
    console.error("[store-points] Error in fulfillPurchasePoints:", err);
    return { granted: false, pointsEarned: 0, hiveBonus: 0 };
  }
}

/**
 * Reconciles and awards missing points for past purchases found in user_inventory.
 */
export async function reconcileUserStorePoints(
  supabase: SupabaseClient,
  userId: string | null
): Promise<{ totalReconciled: number; itemsProcessed: number }> {
  if (!userId || userId === "guest") return { totalReconciled: 0, itemsProcessed: 0 };

  try {
    // 1. Fetch user's purchased packs from user_inventory
    const { data: inventory } = await supabase
      .from("user_inventory")
      .select("id, item_slug, item_name, metadata")
      .eq("user_id", userId)
      .eq("item_type", "pack");

    if (!inventory || inventory.length === 0) {
      return { totalReconciled: 0, itemsProcessed: 0 };
    }

    // 2. Group inventory by transaction_id
    const txMap = new Map<string, { packSlug: string; packName: string; price: string }>();

    for (const item of inventory) {
      const meta = item.metadata || {};
      const txnId = meta.transaction_id || meta.order_id;
      if (!txnId || txnId === "N/A") continue;

      if (!txMap.has(txnId)) {
        txMap.set(txnId, {
          packSlug: item.item_slug,
          packName: item.item_name || item.item_slug,
          price: meta.price || "0.00",
        });
      }
    }

    let totalReconciled = 0;
    let itemsProcessed = 0;

    // 3. For each transaction ID, check if points were awarded
    for (const [txnId, txData] of txMap.entries()) {
      const result = await fulfillPurchasePoints(
        supabase,
        userId,
        txnId,
        txData.packSlug,
        txData.price,
        txData.packName,
        "retroactive_reconciliation"
      );

      if (result.granted) {
        totalReconciled += result.pointsEarned;
        itemsProcessed++;
      }
    }

    return { totalReconciled, itemsProcessed };
  } catch (e) {
    console.error("[store-points] Reconciliation error:", e);
    return { totalReconciled: 0, itemsProcessed: 0 };
  }
}
