import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  BOT_PLAN_PRICES,
  defaultBotPremium,
  normalizeBotPremium,
  type BotPlanId,
} from "@/lib/bot-premium";
import { env } from "@/lib/env";
import { appendBotOpsEvent } from "@/lib/system-status";

const allowedPlans = new Set<BotPlanId>(["locked", "free", "starter", "pro_voice", "server_ops", "internal"]);
const DISCORD_API = "https://discord.com/api/v10";

type DiscordBotGuild = {
  id: string;
  name: string;
  icon?: string | null;
};

async function fetchBotGuilds(): Promise<DiscordBotGuild[]> {
  const token =
    process.env.DISCORD_BOT_TOKEN ||
    process.env.BOT_TOKEN ||
    process.env.DISCORD_TOKEN ||
    process.env.TOKEN;

  if (!token) return [];

  const res = await fetch(`${DISCORD_API}/users/@me/guilds`, {
    headers: { authorization: `Bot ${token}` },
    cache: "no-store",
  });

  if (!res.ok) return [];
  const guilds = await res.json().catch(() => []);
  return Array.isArray(guilds)
    ? guilds
        .filter((guild): guild is DiscordBotGuild => Boolean(guild?.id && guild?.name))
        .map((guild) => ({ id: guild.id, name: guild.name, icon: guild.icon ?? null }))
    : [];
}

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  let supabase: ReturnType<typeof createSupabaseAdminClient>;
  try {
    supabase = createSupabaseAdminClient();
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Admin database access is not configured." },
      { status: 500 },
    );
  }
  const [{ data, error }, botGuilds] = await Promise.all([
    supabase
    .from("bot_settings")
    .select("guild_id, settings, updated_at")
    .order("updated_at", { ascending: false })
      .limit(100),
    fetchBotGuilds(),
  ]);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const entitlementMap = new Map<string, {
    guildId: string;
    guildName: string;
    premium: ReturnType<typeof normalizeBotPremium>;
    updatedAt?: string;
  }>();

  for (const guild of botGuilds) {
    entitlementMap.set(guild.id, {
      guildId: guild.id,
      guildName: guild.name,
      premium: normalizeBotPremium(defaultBotPremium(guild.id === env.discordGuildId() ? "internal" : "free")),
    });
  }

  for (const row of data || []) {
    const settings = row.settings && typeof row.settings === "object" ? row.settings as Record<string, unknown> : {};
    const premium = normalizeBotPremium(settings.premium);
    const fromBot = entitlementMap.get(row.guild_id);
    entitlementMap.set(row.guild_id, {
      guildId: row.guild_id,
      guildName: typeof settings.guildName === "string" && settings.guildName
        ? settings.guildName
        : fromBot?.guildName || "",
      premium,
      updatedAt: row.updated_at,
    });
  }

  const entitlements = Array.from(entitlementMap.values()).sort((a, b) => {
    if (a.premium.enabled !== b.premium.enabled) return a.premium.enabled ? -1 : 1;
    return (a.guildName || a.guildId).localeCompare(b.guildName || b.guildId);
  });

  return NextResponse.json({ ok: true, entitlements, prices: BOT_PLAN_PRICES });
}

export async function PATCH(req: Request) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const guildId = String(body?.guildId || "").trim();
  const plan = String(body?.plan || "free") as BotPlanId;

  if (!guildId) {
    return NextResponse.json({ ok: false, error: "Missing guildId." }, { status: 400 });
  }

  if (!allowedPlans.has(plan)) {
    return NextResponse.json({ ok: false, error: "Invalid premium plan." }, { status: 400 });
  }

  if (plan === "internal" && guildId !== env.discordGuildId()) {
    return NextResponse.json(
      { ok: false, error: "NewHope Internal can only be enabled for the main NewHopeGGN server." },
      { status: 400 },
    );
  }

  let supabase: ReturnType<typeof createSupabaseAdminClient>;
  try {
    supabase = createSupabaseAdminClient();
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Admin database access is not configured." },
      { status: 500 },
    );
  }
  const { data: existing, error: readError } = await supabase
    .from("bot_settings")
    .select("settings")
    .eq("guild_id", guildId)
    .maybeSingle();

  if (readError) {
    return NextResponse.json({ ok: false, error: readError.message }, { status: 500 });
  }

  const existingSettings = existing?.settings && typeof existing.settings === "object"
    ? existing.settings as Record<string, unknown>
    : {};

  const basePremium = defaultBotPremium(plan);
  const premium = normalizeBotPremium({
    ...basePremium,
    enabled: plan !== "locked",
    plan,
    priceMonthlyUsd:
      typeof body?.priceMonthlyUsd === "number" && body.priceMonthlyUsd >= 0
        ? body.priceMonthlyUsd
        : BOT_PLAN_PRICES[plan],
    expiresAt: body?.expiresAt ? String(body.expiresAt) : null,
    notes: body?.notes ? String(body.notes).slice(0, 500) : "",
    approvedBy: admin.discord_id,
    approvedAt: new Date().toISOString(),
  });

  const settings = {
    ...existingSettings,
    guildName: body?.guildName ? String(body.guildName).slice(0, 120) : existingSettings.guildName,
    premium,
  };

  const { error } = await supabase
    .from("bot_settings")
    .upsert({ guild_id: guildId, settings, updated_at: new Date().toISOString() }, { onConflict: "guild_id" });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  await appendBotOpsEvent({
    kind: "info",
    title: "Premium entitlement updated",
    detail: `${admin.username || "Admin"} set ${settings.guildName || "a Discord server"} to ${plan}.`,
    meta: { guildId, plan, priceMonthlyUsd: premium.priceMonthlyUsd },
  }).catch(() => null);

  return NextResponse.json({ ok: true, premium });
}
