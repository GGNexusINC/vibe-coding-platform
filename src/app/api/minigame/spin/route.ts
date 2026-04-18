import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

type Prize = { name: string; rarity: string; emoji: string; color: number; image: string };

// Once Human actual weapons with images from Steam CDN
function scoreToPrize(score: number): Prize {
  if (score >= 60) return { name: "AWS.338 - Bullseye", rarity: "legendary", emoji: "🎯", color: 0xef4444, image: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2139460/ss_1.jpg" };
  if (score >= 48) return { name: "HAMR - Brahminy", rarity: "legendary", emoji: "🦅", color: 0xf97316, image: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2139460/ss_2.jpg" };
  if (score >= 36) return { name: "SN700 - Gulped Lore", rarity: "epic", emoji: "🐍", color: 0x8b5cf6, image: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2139460/ss_3.jpg" };
  if (score >= 28) return { name: "M416 - Scorched Earth", rarity: "rare", emoji: "�", color: 0x3b82f6, image: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2139460/ss_4.jpg" };
  if (score >= 20) return { name: "SOCR - Outsider", rarity: "rare", emoji: "⚔️", color: 0x3b82f6, image: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2139460/ss_5.jpg" };
  if (score >= 14) return { name: "ACS12 - Corrosion", rarity: "uncommon", emoji: "☣️", color: 0x22c55e, image: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2139460/ss_6.jpg" };
  if (score >= 8)  return { name: "KV-SBR - Little Jaws", rarity: "uncommon", emoji: "🦈", color: 0x22c55e, image: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2139460/ss_7.jpg" };
  if (score >= 2)  return { name: "DE.50", rarity: "common", emoji: "🔫", color: 0x94a3b8, image: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2139460/ss_8.jpg" };
  return { name: "Better Luck Next Time", rarity: "none", emoji: "☣️", color: 0x475569, image: "" };
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
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
            { name: "👤 Player", value: session.username, inline: true },
            { name: "🎯 Score", value: `**${score} hits**`, inline: true },
            { name: "🏆 Prize Won", value: prize.rarity !== "none" ? `${prize.emoji} **${prize.name}**` : "No prize", inline: true },
            { name: "⭐ Rarity", value: `${rarityBar[prize.rarity] ?? ""} ${prize.rarity.toUpperCase()}`, inline: false },
            { name: "🆔 Discord ID", value: `\`${session.discord_id}\``, inline: false },
          ],
          thumbnail: session.avatar_url ? { url: session.avatar_url } : undefined,
          footer: { text: "NewHopeGGN Whack-a-Mole • Once per week" },
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
