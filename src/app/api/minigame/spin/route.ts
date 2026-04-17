import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

const PRIZES = [
  { name: "M4A1 Assault Rifle", rarity: "rare", emoji: "🔫", color: 0x3b82f6 },
  { name: "AK-47 Assault Rifle", rarity: "rare", emoji: "🔫", color: 0x3b82f6 },
  { name: "Sniper Rifle (AWM)", rarity: "epic", emoji: "🎯", color: 0x8b5cf6 },
  { name: "SPAS-12 Shotgun", rarity: "uncommon", emoji: "💥", color: 0x22c55e },
  { name: "MP5 Submachine Gun", rarity: "uncommon", emoji: "🔫", color: 0x22c55e },
  { name: "Desert Eagle Pistol", rarity: "common", emoji: "🔫", color: 0x94a3b8 },
  { name: "Crossbow", rarity: "common", emoji: "🏹", color: 0x94a3b8 },
  { name: "Flamethrower", rarity: "legendary", emoji: "🔥", color: 0xf97316 },
  { name: "Minigun", rarity: "legendary", emoji: "⚙️", color: 0xef4444 },
  { name: "Better Luck Next Time", rarity: "none", emoji: "😔", color: 0x475569 },
];

const WEIGHTS = [12, 12, 6, 15, 15, 20, 20, 2, 1, 30];

function pickPrize() {
  const total = WEIGHTS.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < PRIZES.length; i++) {
    r -= WEIGHTS[i];
    if (r <= 0) return PRIZES[i];
  }
  return PRIZES[PRIZES.length - 1];
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function POST() {
  const session = await getSession();
  if (!session?.discord_id) {
    return NextResponse.json({ ok: false, error: "Sign in with Discord to play." }, { status: 401 });
  }

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

  const prize = pickPrize();
  const now = new Date().toISOString();

  if (sb) {
    await sb.from("minigame_spins").insert({
      discord_id: session.discord_id,
      username: session.username,
      avatar_url: session.avatar_url ?? null,
      prize_name: prize.name,
      prize_rarity: prize.rarity,
      spun_at: now,
    });
  }

  // Send to Discord script-hook webhook
  const webhookUrl = env.discordWebhookUrlForPage("script-hook");
  if (webhookUrl && prize.rarity !== "none") {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: "NewHopeGGN Mini-Game",
        embeds: [{
          title: `${prize.emoji} Weekly Spin Result`,
          description: `**${session.username}** won a prize from the weekly spin!`,
          color: prize.color,
          fields: [
            { name: "Player", value: session.username, inline: true },
            { name: "Prize", value: `${prize.emoji} ${prize.name}`, inline: true },
            { name: "Rarity", value: prize.rarity.toUpperCase(), inline: true },
            { name: "Discord ID", value: `\`${session.discord_id}\``, inline: false },
          ],
          thumbnail: session.avatar_url ? { url: session.avatar_url } : undefined,
          footer: { text: "NewHopeGGN Weekly Gun Spin" },
          timestamp: now,
        }],
      }),
    }).catch(() => null);
  }

  return NextResponse.json({ ok: true, prize, spunAt: now });
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
