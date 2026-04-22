import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { buildRewardInventoryItem, getCurrentWipeCycle } from "@/lib/reward-inventory";
import { scoreToWhackAMolePrize, type OnceHumanPrize } from "@/lib/once-human-items";

function scoreToPrize(score: number): OnceHumanPrize {
  return scoreToWhackAMolePrize(score);
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.discord_id) {
    return NextResponse.json({ ok: false, error: "Sign in with Discord to play." }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const score = typeof body?.score === "number" ? Math.max(0, Math.floor(body.score)) : 0;

  const sb = getSupabase();

  if (sb) {
    const { data: existing } = await sb
      .from("minigame_spins")
      .select("id, spun_at")
      .eq("discord_id", session.discord_id)
      .order("spun_at", { ascending: false })
      .limit(1)
      .single();

    if (existing?.spun_at) {
      const last = new Date(existing.spun_at).getTime();
      const now = Date.now();
      const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
      const msLeft = oneWeekMs - (now - last);
      if (msLeft > 0) {
        const hours = Math.floor(msLeft / 3600000);
        const mins = Math.floor((msLeft % 3600000) / 60000);
        return NextResponse.json({
          ok: false,
          cooldown: true,
          msLeft,
          error: `You already spun this week! Come back in ${hours}h ${mins}m.`,
        }, { status: 429 });
      }
    }
  }

  const prize = scoreToPrize(score);
  const now = new Date().toISOString();

  if (sb) {
    await sb.from("minigame_spins").insert({
      discord_id: session.discord_id,
      username: session.username,
      avatar_url: session.avatar_url ?? null,
      prize_name: prize.name,
      prize_rarity: prize.rarity,
      score,
      spun_at: now,
    });

    if (prize.rarity !== "none") {
      const rewardItem = buildRewardInventoryItem({
        userId: session.discord_id,
        itemSlug: `whackamole-${prize.rarity}-${score}-${Date.now()}`.toLowerCase(),
        itemName: `Whack-a-Mole Reward: ${prize.name}`,
        source: "whackamole",
        prizeLabel: prize.name,
        score,
        rewardAt: now,
        wipeCycle: getCurrentWipeCycle(new Date(now)),
        note: "Whack-a-Mole reward",
      });
      rewardItem.metadata.item_image_url = prize.image;
      rewardItem.metadata.item_art_source_name = prize.sourceName ?? "Wikily Once Human item database";
      rewardItem.metadata.item_art_source_url = prize.sourceUrl;
      rewardItem.metadata.item_art_verified = Boolean(prize.image);

      const rewardInsert = await sb
        .from("user_inventory")
        .insert(rewardItem)
        .select("id, item_name, item_type, status, expires_at, metadata")
        .single();
      let rewardRow: any = rewardInsert.data;
      let rewardError = rewardInsert.error;

      if (rewardError) {
        console.warn("[minigame] Reward insert with expires_at failed, retrying without column:", {
          error: rewardError,
          rewardItem,
        });
        const fallbackItem = {
          ...rewardItem,
          metadata: {
            ...rewardItem.metadata,
            reward_claim_expires_at: rewardItem.metadata.reward_claim_expires_at,
          },
        } as Record<string, unknown>;
        delete (fallbackItem as Record<string, unknown>).expires_at;

        const fallbackInsert = await sb
          .from("user_inventory")
          .insert(fallbackItem)
          .select("id, item_name, item_type, status, metadata")
          .single();
        rewardRow = fallbackInsert.data;
        rewardError = fallbackInsert.error;
      }

      if (rewardError) {
        console.error("[minigame] Failed to create reward inventory item:", {
          error: rewardError,
          rewardItem,
        });
      } else {
        console.log("[minigame] Reward inventory item created:", {
          id: rewardRow?.id,
          item_name: rewardRow?.item_name,
          item_type: rewardRow?.item_type,
          status: rewardRow?.status,
          expires_at: rewardRow?.expires_at ?? rewardRow?.metadata?.reward_claim_expires_at,
        });
      }
    }
  }

  // Always send to Discord minigame webhook
  const webhookUrl = env.discordWebhookUrlForPage("minigame");
  console.log("[minigame] Discord webhook URL:", webhookUrl ? webhookUrl.slice(0, 60) + "..." : "NONE");
  if (webhookUrl) {
    const rarityBar: Record<string, string> = {
      legendary: "🟠🟠🟠🟠🟠",
      epic: "🟣🟣🟣🟣⬛",
      rare: "🔵🔵🔵⬛⬛",
      uncommon: "🟢🟢⬛⬛⬛",
      common: "⬜⬜⬛⬛⬛",
      none: "⬛⬛⬛⬛⬛",
    };
    const winMessage = prize.rarity === "none"
      ? `❌ **${session.username}** played Whack-a-Mole but didn't score high enough.`
      : `🎉 **${session.username} WON ${prize.name.toUpperCase()}!**`;
    
    const description = prize.rarity === "none"
      ? `Score: **${score} hits** — No prize this week. Better luck next time!`
      : `Congratulations! You earned **${prize.name}** (${prize.rarity.toUpperCase()} rarity)`;

    await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        content: winMessage,
        username: "NewHopeGGN 🐹 Whack-a-Mole",
        embeds: [{
          title: prize.rarity === "none" ? "No Prize This Week" : `🎁 Prize: ${prize.emoji} ${prize.name}`,
          description,
          color: prize.color,
          fields: [
            { name: "Claim Window", value: prize.rarity !== "none" ? "48 hours" : "No claim window", inline: true },
            { name: "Choice", value: prize.rarity !== "none" ? "Use it to open a ticket or save it in inventory" : "No prize earned", inline: true },
            { name: "Uses Per Wipe", value: "3 chances per wipe", inline: true },
            { name: "👤 Player", value: session.username, inline: true },
            { name: "🎯 Score", value: `**${score} hits**`, inline: true },
            { name: "🏆 Prize Won", value: prize.rarity !== "none" ? `${prize.emoji} **${prize.name}**` : "No prize", inline: true },
            { name: "⭐ Rarity", value: `${rarityBar[prize.rarity] ?? ""} ${prize.rarity.toUpperCase()}`, inline: false },
            { name: "🆔 Discord ID", value: `\`${session.discord_id}\``, inline: false },
          ],
          image: prize.image ? { url: prize.image } : undefined,
          thumbnail: session.avatar_url ? { url: session.avatar_url } : undefined,
          footer: { text: "NewHopeGGN Whack-a-Mole • Once per week • Rewards claim within 48 hours" },
          timestamp: now,
        }],
      }),
    }).then(async (r) => {
      if (!r.ok) console.error("[minigame] Discord webhook failed:", r.status, await r.text().catch(() => ""));
      else console.log("[minigame] Discord webhook sent OK:", r.status);
    }).catch((e) => console.error("[minigame] Discord fetch error:", e));
  }

  return NextResponse.json({ ok: true, prize, score, spunAt: now });
}

export async function GET() {
  const session = await getSession();
  if (!session?.discord_id) {
    return NextResponse.json({ ok: false, canSpin: false, error: "Not signed in." });
  }

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ ok: true, canSpin: true, msLeft: 0 });

  const { data: existing } = await sb
    .from("minigame_spins")
    .select("spun_at, prize_name, prize_rarity")
    .eq("discord_id", session.discord_id)
    .order("spun_at", { ascending: false })
    .limit(1)
    .single();

  if (!existing?.spun_at) {
    return NextResponse.json({ ok: true, canSpin: true, msLeft: 0 });
  }

  const last = new Date(existing.spun_at).getTime();
  const msLeft = Math.max(0, 7 * 24 * 60 * 60 * 1000 - (Date.now() - last));
  return NextResponse.json({
    ok: true,
    canSpin: msLeft === 0,
    msLeft,
    lastPrize: existing.prize_name,
    lastRarity: existing.prize_rarity,
  });
}
