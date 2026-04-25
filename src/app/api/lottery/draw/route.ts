import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { drawLotteryWinner, saveLotteryDraw, clearLotteryEntries, getLotteryDraws } from "@/lib/lottery-store";
import { env } from "@/lib/env";
import { sendDiscordWebhook } from "@/lib/discord";
import { buildRewardInventoryItem, getCurrentWipeCycle } from "@/lib/reward-inventory";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const clearAfter = body?.clearAfter !== false;

  const winner = await drawLotteryWinner();
  if (!winner) {
    return NextResponse.json({ ok: false, error: "No entries in the lottery." }, { status: 400 });
  }

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

  // Fetch dynamic webhooks from DB
  const { getDynamicWebhookUrl } = await import("@/lib/webhooks");
  const communityWebhookUrl = await getDynamicWebhookUrl("lottery-entries") || "";
  const winnerAnnouncementWebhookUrl = await getDynamicWebhookUrl("lottery-winners") || "";

  const targetWebhooks = [
    communityWebhookUrl,
    winnerAnnouncementWebhookUrl
  ].filter(Boolean);

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

  return NextResponse.json({ ok: true, winner });
}

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  const draws = await getLotteryDraws();
  return NextResponse.json({ ok: true, draws });
}
