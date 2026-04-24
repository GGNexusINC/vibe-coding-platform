import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { fetchUserGuilds } from "@/lib/discord-oauth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { defaultBotPremium, getBotPremiumForGuild } from "@/lib/bot-premium";

async function verifyGuildManager(guildId: string, accessToken: string) {
  const guilds = await fetchUserGuilds(accessToken);
  const guild = guilds.find(g => g.id === guildId);
  if (!guild) return false;

  const perms = BigInt(guild.permissions);
  const isManager = (perms & 0x20n) === 0x20n;
  const isAdmin = (perms & 0x8n) === 0x8n;
  return isManager || isAdmin || guild.owner;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const guildId = searchParams.get("guildId");
  const session = await getSession();

  if (!session || !session.access_token) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!guildId) {
    return NextResponse.json({ ok: false, error: "Missing guildId" }, { status: 400 });
  }

  // Security check: Is the user a manager of this guild?
  try {
    const canManage = await verifyGuildManager(guildId, session.access_token);
    if (!canManage) {
      return NextResponse.json({ ok: false, error: "Forbidden: You do not manage this guild" }, { status: 403 });
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("bot_settings")
      .select("*")
      .eq("guild_id", guildId)
      .single();

    if (error && error.code !== "PGRST116") { // PGRST116 is 'no rows'
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // Default settings if not found
    const defaultSettings = {
      prefix: "/",
      language: "en",
      botNickname: "",
      logging: {
        enabled: false,
        channelId: "",
        events: ["bans", "unbans", "deletes", "joins", "leaves", "errors"]
      },
      translation: {
        enabled: false,
        targetLang: "auto",
        channelIds: [],
        includeBotMessages: false
      },
      ai: {
        enabled: false,
        tone: "default",
        frequency: "sometimes",
        bilingual: false,
        channelIds: []
      },
      premium: defaultBotPremium("free")
    };

    const premium = await getBotPremiumForGuild(guildId);
    return NextResponse.json({
      ok: true,
      settings: {
        ...defaultSettings,
        ...(data?.settings || {}),
        premium,
      },
      premium,
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: "Check failed" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const { searchParams } = new URL(req.url);
  const guildId = searchParams.get("guildId");
  const session = await getSession();

  if (!session || !session.access_token) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!guildId) {
    return NextResponse.json({ ok: false, error: "Missing guildId" }, { status: 400 });
  }

  try {
    const canManage = await verifyGuildManager(guildId, session.access_token);
    if (!canManage) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { premium: _ignoredPremium, ...safeBody } = body && typeof body === "object" ? body : {};
    const supabase = await createSupabaseServerClient();
    
    // For writes, we use the admin client because the table has RLS policies that might block the anon client
    // since we use custom Discord session auth instead of Supabase Auth.
    // We already verified the user can manage the guild above.
    const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
    const adminSupabase = createSupabaseAdminClient();

    const { data: existing } = await supabase
      .from("bot_settings")
      .select("settings")
      .eq("guild_id", guildId)
      .maybeSingle();

    const existingSettings = existing?.settings && typeof existing.settings === "object" ? existing.settings : {};

    const { error } = await adminSupabase
      .from("bot_settings")
      .upsert({ 
        guild_id: guildId, 
        settings: {
          ...existingSettings,
          ...safeBody,
          translation: {
            ...(existingSettings as Record<string, unknown>).translation && typeof (existingSettings as Record<string, unknown>).translation === "object"
              ? ((existingSettings as Record<string, unknown>).translation as Record<string, unknown>)
              : {},
            ...(safeBody && typeof safeBody === "object" && "translation" in safeBody && typeof (safeBody as Record<string, unknown>).translation === "object"
              ? ((safeBody as Record<string, unknown>).translation as Record<string, unknown>)
              : {}),
          },
          ai: {
            ...((existingSettings as Record<string, unknown>).ai && typeof (existingSettings as Record<string, unknown>).ai === "object"
              ? ((existingSettings as Record<string, unknown>).ai as Record<string, unknown>)
              : {}),
            ...(safeBody && typeof safeBody === "object" && "ai" in safeBody && typeof (safeBody as Record<string, unknown>).ai === "object"
              ? ((safeBody as Record<string, unknown>).ai as Record<string, unknown>)
              : {}),
          },
          premium: (existingSettings as Record<string, unknown>).premium || defaultBotPremium("free"),
        },
        updated_at: new Date().toISOString()
      }, { onConflict: "guild_id" });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: "Update failed" }, { status: 500 });
  }
}
