import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { defaultBotPremium, getBotPremiumForGuild } from "@/lib/bot-premium";

const defaultSettings = {
  prefix: "!",
  language: "en",
  logging: {
    enabled: false,
    channelId: "",
    events: ["joins", "leaves", "bans", "commands", "voice", "errors"],
  },
  translation: {
    enabled: false,
    targetLang: "auto",
    channelIds: [],
    includeBotMessages: false,
  },
  ai: {
    enabled: false,
    tone: "default",
    channelIds: [],
  },
};

function isAuthorized(secret?: string | null) {
  if (!secret) return false;
  return env.discordIngestSecrets().includes(secret.trim());
}

async function readGuildSettings(guildId: string) {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("bot_settings")
      .select("settings")
      .eq("guild_id", guildId)
      .maybeSingle();

    if (error) throw error;
    return data?.settings && typeof data.settings === "object" ? data.settings as Record<string, unknown> : {};
  } catch (adminError) {
    const publicClient = createClient(env.supabaseUrl(), env.supabaseAnonKey(), {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await publicClient
      .from("bot_settings")
      .select("settings")
      .eq("guild_id", guildId)
      .maybeSingle();

    if (error) {
      throw new Error(
        adminError instanceof Error
          ? `${adminError.message} | ${error.message}`
          : error.message,
      );
    }

    return data?.settings && typeof data.settings === "object" ? data.settings as Record<string, unknown> : {};
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const guildId = typeof body?.guildId === "string" ? body.guildId.trim() : "";
    const secret = typeof body?.secret === "string" ? body.secret : "";

    if (!isAuthorized(secret)) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    if (!guildId) {
      return NextResponse.json({ ok: false, error: "Missing guildId." }, { status: 400 });
    }

    const settings = await readGuildSettings(guildId).catch((error) => {
      console.error("[bot-config] failed to read guild settings:", error instanceof Error ? error.message : error);
      return {};
    });
    const settingsRecord = settings as {
      logging?: Record<string, unknown>;
      translation?: Record<string, unknown>;
    };
    const premium = await getBotPremiumForGuild(guildId);

    return NextResponse.json({
      ok: true,
      settings: {
        ...defaultSettings,
        ...settings,
        logging: {
          ...defaultSettings.logging,
          ...(settingsRecord.logging || {}),
        },
        translation: {
          ...defaultSettings.translation,
          ...(settingsRecord.translation || {}),
        },
        ai: {
          ...(defaultSettings as any).ai,
          ...(settingsRecord as any).ai,
        },
        premium: premium ?? defaultBotPremium("free"),
      },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: "Failed to load guild config." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const guildId = typeof body?.guildId === "string" ? body.guildId.trim() : "";
    const secret = typeof body?.secret === "string" ? body.secret : "";
    const patch =
      body?.settings && typeof body.settings === "object"
        ? (body.settings as Record<string, unknown>)
        : null;

    if (!isAuthorized(secret)) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    if (!guildId || !patch) {
      return NextResponse.json({ ok: false, error: "Missing guildId or settings." }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    const { data: existing, error: existingError } = await supabase
      .from("bot_settings")
      .select("settings")
      .eq("guild_id", guildId)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ ok: false, error: existingError.message }, { status: 500 });
    }

    const currentSettings =
      existing?.settings && typeof existing.settings === "object"
        ? (existing.settings as Record<string, unknown>)
        : {};
    const currentLogging =
      currentSettings.logging && typeof currentSettings.logging === "object"
        ? (currentSettings.logging as Record<string, unknown>)
        : {};
    const currentTranslation =
      currentSettings.translation && typeof currentSettings.translation === "object"
        ? (currentSettings.translation as Record<string, unknown>)
        : {};
    const patchLogging =
      patch.logging && typeof patch.logging === "object"
        ? (patch.logging as Record<string, unknown>)
        : {};
    const patchTranslation =
      patch.translation && typeof patch.translation === "object"
        ? (patch.translation as Record<string, unknown>)
        : {};

    const nextSettings = {
      ...currentSettings,
      ...patch,
      logging: {
        ...defaultSettings.logging,
        ...currentLogging,
        ...patchLogging,
      },
      translation: {
        ...defaultSettings.translation,
        ...currentTranslation,
        ...patchTranslation,
      },
      ai: {
        ...(defaultSettings as any).ai,
        ...(currentSettings as any).ai,
        ...(patch as any).ai,
      },
      premium: currentSettings.premium ?? defaultBotPremium("free"),
    };

    const { error } = await supabase
      .from("bot_settings")
      .upsert(
        {
          guild_id: guildId,
          settings: nextSettings,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "guild_id" },
      );

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, settings: nextSettings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update guild config.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
