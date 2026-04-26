export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { fetchUserGuilds } from "@/lib/discord-oauth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { defaultBotPremium, getBotPremiumForGuild } from "@/lib/bot-premium";
import { getAdminSession } from "@/lib/admin-auth";

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
  const adminSession = await getAdminSession();
  const session = await getSession();

  if (!adminSession && (!session || !session.access_token)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!guildId) {
    return NextResponse.json({ ok: false, error: "Missing guildId" }, { status: 400 });
  }

  // Security check: Is the user a manager of this guild or a site admin?
  if (!adminSession) {
    try {
      const canManage = await verifyGuildManager(guildId, session!.access_token as string);
      if (!canManage) {
        return NextResponse.json({ ok: false, error: "Forbidden: You do not manage this guild" }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ ok: false, error: "Check failed" }, { status: 500 });
    }
  }

  try {

    let data, error;
    if (adminSession) {
      const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
      const adminSupabase = createSupabaseAdminClient();
      const res = await adminSupabase
        .from("bot_settings")
        .select("*")
        .eq("guild_id", guildId)
        .single();
      data = res.data;
      error = res.error;
    } else {
      const supabase = await createSupabaseServerClient();
      const res = await supabase
        .from("bot_settings")
        .select("*")
        .eq("guild_id", guildId)
        .single();
      data = res.data;
      error = res.error;
    }

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
  const adminSession = await getAdminSession();
  const session = await getSession();

  if (!adminSession && (!session || !session.access_token)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!guildId) {
    return NextResponse.json({ ok: false, error: "Missing guildId" }, { status: 400 });
  }

  if (!adminSession) {
    try {
      const canManage = await verifyGuildManager(guildId, session!.access_token as string);
      if (!canManage) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ ok: false, error: "Check failed" }, { status: 500 });
    }
  }
  try {
    const body = await req.json();
    const { premium: _ignoredPremium, ...safeBody } = body && typeof body === "object" ? body : {};
    const supabase = await createSupabaseServerClient();
    
    // For writes, we use the admin client because the table has RLS policies that might block the anon client
    // since we use custom Discord session auth instead of Supabase Auth.
    // We already verified the user can manage the guild above.
    const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
    const adminSupabase = createSupabaseAdminClient();

    const { data: existing } = await adminSupabase
      .from("bot_settings")
      .select("settings")
      .eq("guild_id", guildId)
      .maybeSingle();

    const existingSettings = (existing?.settings && typeof existing.settings === "object" ? existing.settings : {}) as Record<string, any>;
    const bodySettings = (safeBody && typeof safeBody === "object" ? safeBody : {}) as Record<string, any>;

    const nextSettings = {
      ...existingSettings,
      ...bodySettings,
      translation: {
        ...(existingSettings.translation || {}),
        ...(bodySettings.translation || {}),
      },
      ai: {
        ...(existingSettings.ai || {}),
        ...(bodySettings.ai || {}),
      },
      logging: {
        ...(existingSettings.logging || {}),
        ...(bodySettings.logging || {}),
      },
      premium: existingSettings.premium || defaultBotPremium("free"),
    };

    const { error } = await adminSupabase
      .from("bot_settings")
      .upsert({ 
        guild_id: guildId, 
        settings: nextSettings,
        updated_at: new Date().toISOString()
      }, { onConflict: "guild_id" });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // Log the change to staff audits
    try {
      const { sendDiscordWebhook } = await import("@/lib/discord");
      await sendDiscordWebhook({
        username: "NewHope Bot Controller",
        embeds: [{
          title: "🤖 Bot Settings Updated",
          color: 0x0ea5e9, // sky-500
          description: `Bot settings for guild \`${guildId}\` were updated.`,
          fields: [
            { name: "Guild ID", value: `\`${guildId}\``, inline: true },
            { name: "Updated By", value: adminSession ? "Site Admin" : (session?.username || "Unknown"), inline: true },
            { name: "Modules", value: [
              nextSettings.translation?.enabled ? "✅ Translation" : "❌ Translation",
              nextSettings.ai?.enabled ? "✅ AI" : "❌ AI",
              nextSettings.logging?.enabled ? "✅ Logs" : "❌ Logs",
            ].join("\n"), inline: false }
          ],
          timestamp: new Date().toISOString()
        }]
      }, { webhookUrl: (await import("@/lib/env")).env.discordWebhookUrlForPage("staff-audits") });
    } catch (e) {
      console.error("[bot-settings] Audit log failed:", e);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: "Update failed" }, { status: 500 });
  }
}
