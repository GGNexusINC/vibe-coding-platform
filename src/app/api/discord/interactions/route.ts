import { NextResponse } from "next/server";
import { BOT_PLAN_PRICES, canUseBotFeature } from "@/lib/bot-premium";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { defaultBotPremium } from "@/lib/bot-premium";

const PERM_VIEW_CHANNEL = BigInt("1024");
const PERM_CONNECT = BigInt("1048576");
const PERM_SPEAK = BigInt("2097152");
const PERM_ADMIN = BigInt("8");
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "https://newhopeggn.vercel.app";
const PREMIUM_PANEL_URL = process.env.PREMIUM_PANEL_URL || `${SITE_URL}/bot?ref=discord`;

type DiscordRole = { id: string; permissions: string };
type DiscordMember = { roles?: string[]; user?: { id: string } };
type DiscordGuildMember = { roles?: string[] };
type DiscordChannel = {
  id: string;
  type?: number;
  permission_overwrites?: Array<{ id: string; type: number; allow: string; deny: string }>;
  name?: string;
};
type SlashOption = { name: string; value?: string | boolean };
type InteractionBody = {
  type: number;
  token?: string;
  application_id?: string;
  guild_id?: string;
  channel_id?: string;
  user?: { id: string };
  member?: DiscordMember;
  data?: {
    name?: string;
    options?: SlashOption[];
    resolved?: { channels?: Record<string, DiscordChannel> };
    custom_id?: string;
  };
};

const defaultGuildSettings = {
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
    channelIds: [] as string[],
    includeBotMessages: false,
  },
  premium: defaultBotPremium("free"),
};

async function verifyDiscordSignature(
  publicKey: string,
  signature: string,
  timestamp: string,
  body: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const keyData = hexToUint8Array(publicKey);
    const sigData = hexToUint8Array(signature);
    const message = encoder.encode(timestamp + body);

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "Ed25519" },
      false,
      ["verify"]
    );

    return await crypto.subtle.verify("Ed25519", cryptoKey, sigData, message);
  } catch (error) {
    console.error("[discord-interactions] signature verification error:", error);
    return false;
  }
}

function hexToUint8Array(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes.buffer as ArrayBuffer;
}

function parsePerms(value: string | undefined): bigint {
  if (!value) return BigInt(0);
  try {
    return BigInt(value);
  } catch {
    return BigInt(0);
  }
}

function applyOverwrite(base: bigint, overwrite?: { allow: string; deny: string }): bigint {
  if (!overwrite) return base;
  const allow = parsePerms(overwrite.allow);
  const deny = parsePerms(overwrite.deny);
  return (base & ~deny) | allow;
}

function hasPerm(perms: bigint, flag: bigint): boolean {
  return (perms & PERM_ADMIN) === PERM_ADMIN || (perms & flag) === flag;
}

async function discordApi<T>(path: string, botToken: string): Promise<T> {
  const res = await fetch(`https://discord.com/api/v10${path}`, {
    headers: { Authorization: `Bot ${botToken}` },
  });
  if (!res.ok) {
    throw new Error(`Discord API ${path} failed with ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function sendBotControlMessage(channelId: string, botToken: string, payload: Record<string, unknown>) {
  const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${botToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content: `[NH-CONTROL] ${JSON.stringify(payload)}`,
    }),
  });

  if (!res.ok) {
    throw new Error(`Control message failed with ${res.status}`);
  }
}

function slashOption(body: InteractionBody, name: string): string | boolean | undefined {
  return body.data?.options?.find((opt) => opt.name === name)?.value;
}

async function updateGuildTranslationSettings(
  guildId: string,
  patch: {
    enabled: boolean;
    targetLang: string;
    channelIds: string[];
    includeBotMessages: boolean;
  },
) {
  const supabase = createSupabaseAdminClient();
  const { data: existing, error: existingError } = await supabase
    .from("bot_settings")
    .select("settings")
    .eq("guild_id", guildId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
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

  const nextSettings = {
    ...defaultGuildSettings,
    ...currentSettings,
    logging: {
      ...defaultGuildSettings.logging,
      ...currentLogging,
    },
    translation: {
      ...defaultGuildSettings.translation,
      ...currentTranslation,
      ...patch,
    },
    premium: currentSettings.premium ?? defaultGuildSettings.premium,
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
    throw new Error(error.message);
  }

  return nextSettings;
}

function premiumResponse(featureName = "premium voice translation") {
  return NextResponse.json({
    type: 4,
    data: {
      flags: 64,
      embeds: [
        {
          color: 0x5865f2,
          title: "NewHope Translate Premium",
          description: `**${featureName}** is available on NewHopeGGN and premium-enabled Discord servers.`,
          thumbnail: { url: `${SITE_URL}/favicon-32x32.png` },
          fields: [
            {
              name: "Plans",
              value: `Starter: $${BOT_PLAN_PRICES.starter}/mo text tools\nPro Voice: $${BOT_PLAN_PRICES.pro_voice}/mo live VC + spoken translation\nServer Ops: $${BOT_PLAN_PRICES.server_ops}/mo logs, controls, and priority setup`,
            },
            {
              name: "Access",
              value: "The main NewHopeGGN server keeps full internal access. Outside servers need premium approval before voice features unlock.",
            },
          ],
          footer: { text: "NewHopeGGN Translate" },
          timestamp: new Date().toISOString(),
        },
      ],
      components: [
        {
          type: 1,
          components: [
            {
              type: 2,
              style: 5,
              label: "Open Premium Panel",
              url: PREMIUM_PANEL_URL,
            },
          ],
        },
      ],
    },
  });
}

function translateEmbed(original: string, translated: string, targetLang: string, speak: boolean) {
  const target = targetLang.toUpperCase();
  return {
    color: 0x5865f2,
    title: speak ? "NewHope Translate + Voice" : "NewHope Translate",
    fields: [
      { name: "Said", value: original.slice(0, 1024) || "No text provided." },
      { name: `Translation -> ${target}`, value: translated.slice(0, 1024) || "No translation returned." },
    ],
    footer: { text: speak ? "Voice playback queued through the live bot" : "Use speak:true to have the bot say it in VC" },
    timestamp: new Date().toISOString(),
  };
}

async function translateText(text: string, targetLang: string): Promise<string> {
  const providers = [translateWithGoogle, translateWithMyMemory];
  let lastError: unknown = null;

  for (const provider of providers) {
    try {
      return await provider(text, targetLang);
    } catch (error) {
      lastError = error;
      console.error("[discord-interactions] translation provider failed:", error);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Translation failed");
}

async function translateWithGoogle(text: string, targetLang: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4500);
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`Google translate failed with ${res.status}`);
    const json = await res.json();
    const translated = Array.isArray(json?.[0])
      ? json[0].map((part: unknown) => Array.isArray(part) ? String(part[0] || "") : "").join("").trim()
      : "";
    if (!translated) throw new Error("Google translation returned no text");
    return translated;
  } catch (error) {
    clearTimeout(timer);
    throw error;
  }
}

async function translateWithMyMemory(text: string, targetLang: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4500);
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=autodetect|${encodeURIComponent(targetLang)}`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`MyMemory translate failed with ${res.status}`);
    const json = await res.json();
    if (json.responseStatus !== 200) throw new Error(json.responseMessage || "Translation failed");
    return String(json.responseData?.translatedText || "").trim();
  } catch (error) {
    clearTimeout(timer);
    throw error;
  }
}

async function buildVcPermCheckMessage(body: InteractionBody) {
  const botToken = process.env.DISCORD_BOT_TOKEN || process.env.BOT_TOKEN;
  const guildId = body.guild_id;
  if (!guildId) {
    return "ERROR: missing guild context for vcpermcheck.";
  }
  if (!botToken) {
    return "ERROR: bot token is not configured.";
  }

  const rawOptionChannelId = body.data?.options?.find((opt) => opt.name === "channel")?.value;
  const optionChannelId = typeof rawOptionChannelId === "string" ? rawOptionChannelId : undefined;
  const fallbackChannelId = body.channel_id;
  const channelId = optionChannelId || fallbackChannelId;
  if (!channelId) {
    return "ERROR: no voice channel was provided. Use `/vcpermcheck channel:` to inspect a specific voice channel.";
  }

  const botUser = await discordApi<{ id: string }>(`/users/@me`, botToken);
  const [member, roles, channel] = await Promise.all([
    discordApi<DiscordGuildMember>(`/guilds/${guildId}/members/${botUser.id}`, botToken),
    discordApi<DiscordRole[]>(`/guilds/${guildId}/roles`, botToken),
    body.data?.resolved?.channels?.[channelId] ?? discordApi<DiscordChannel>(`/channels/${channelId}`, botToken),
  ]);

  if (channel.type !== 2 && channel.type !== 13) {
    return `ERROR: **${channel.name ?? "That channel"}** is not a voice or stage channel.`;
  }

  const memberRoles = new Set(member.roles ?? []);
  let perms = BigInt(0);
  const everyoneRole = roles.find((role) => role.id === guildId);
  perms |= parsePerms(everyoneRole?.permissions);

  for (const role of roles) {
    if (memberRoles.has(role.id)) perms |= parsePerms(role.permissions);
  }

  const overwrites = channel.permission_overwrites ?? [];
  const everyoneOverwrite = overwrites.find((ow) => ow.id === guildId && ow.type === 0);
  perms = applyOverwrite(perms, everyoneOverwrite);

  for (const overwrite of overwrites) {
    if (overwrite.type !== 0) continue;
    if (!memberRoles.has(overwrite.id)) continue;
    perms = applyOverwrite(perms, overwrite);
  }

  const memberOverwrite = overwrites.find((ow) => ow.id === botUser.id && ow.type === 1);
  perms = applyOverwrite(perms, memberOverwrite);

  const missing: string[] = [];
  if (!hasPerm(perms, PERM_VIEW_CHANNEL)) missing.push("View Channel");
  if (!hasPerm(perms, PERM_CONNECT)) missing.push("Connect");
  if (!hasPerm(perms, PERM_SPEAK)) missing.push("Speak");

  const lines = [
    `Voice channel: **${channel.name ?? "Unknown"}**`,
    `Bot can view: ${hasPerm(perms, PERM_VIEW_CHANNEL) ? "yes" : "no"}`,
    `Bot can connect: ${hasPerm(perms, PERM_CONNECT) ? "yes" : "no"}`,
    `Bot can speak: ${hasPerm(perms, PERM_SPEAK) ? "yes" : "no"}`,
    `Bot has administrator: ${hasPerm(perms, PERM_ADMIN) ? "yes" : "no"}`,
    missing.length ? `Missing required perms: ${missing.join(", ")}` : "Required voice permissions: all present",
  ];

  return lines.join("\n");
}

export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  const signature = req.headers.get("x-signature-ed25519") || "";
  const timestamp = req.headers.get("x-signature-timestamp") || "";
  const rawBody = await req.text();
  const publicKey = process.env.DISCORD_PUBLIC_KEY || "";

  if (!publicKey || !signature || !timestamp) {
    console.error("[discord-interactions] missing public key or signature headers");
    return new Response("Invalid signature", { status: 401 });
  }

  const isValid = await verifyDiscordSignature(publicKey, signature, timestamp, rawBody);
  if (!isValid) {
    console.error("[discord-interactions] rejected invalid signature");
    return new Response("Invalid signature", { status: 401 });
  }

  let body: InteractionBody;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (body.type === 1) {
    return NextResponse.json({ type: 1 });
  }

  if (body.type === 2) {
    const commandName = body.data?.name || "";

    if (commandName === "nhpremium") {
      return premiumResponse("NewHope Translate Premium");
    }

    if (commandName === "nhtranslate") {
      const botToken = process.env.DISCORD_BOT_TOKEN || process.env.BOT_TOKEN;
      const guildId = body.guild_id;
      const channelId = body.channel_id;
      const userId = body.member?.user?.id || body.user?.id;
      const text = String(slashOption(body, "text") || "").trim();
      const targetLang = String(slashOption(body, "to") || process.env.TRANSLATE_TARGET_LANG || "en").toLowerCase().trim();
      const speak = slashOption(body, "speak") === true;

      if (!text) {
        return NextResponse.json({
          type: 4,
          data: {
            content: "ERROR: add text to translate. Example: `/nhtranslate text:hello to:es`",
            flags: 64,
          },
        });
      }

      if (speak && !(await canUseBotFeature(guildId, "spokenVoice"))) {
        return premiumResponse("voice-channel translated speech");
      }

      try {
        const translated = await translateText(text, targetLang);

        if (speak) {
          if (!botToken || !guildId || !channelId || !userId) {
            return NextResponse.json({
              type: 4,
              data: {
                content: "ERROR: unable to queue voice playback. Missing bot token, guild, channel, or user context.",
                flags: 64,
              },
            });
          }

          await sendBotControlMessage(channelId, botToken, {
            action: "nhtranslate_speak",
            guildId,
            userId,
            replyChannelId: channelId,
            targetLang,
            translated,
          });
        }

        return NextResponse.json({
          type: 4,
          data: {
            content: speak ? "Translation ready. Voice playback is queued in your VC." : undefined,
            embeds: [translateEmbed(text, translated, targetLang, speak)],
          },
        });
      } catch (error) {
        console.error("[discord-interactions] nhtranslate error:", error);
        return NextResponse.json({
          type: 4,
          data: {
            content: `ERROR: translation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            flags: 64,
          },
        });
      }
    }

    if (commandName === "nhnotes") {
      const botToken = process.env.DISCORD_BOT_TOKEN || process.env.BOT_TOKEN;
      const channelId = body.channel_id;
      const groqKey = process.env.GROQ_API_KEY;

      if (!groqKey) {
        return NextResponse.json({
          type: 4,
          data: {
            content: "ERROR: AI Summarization is not configured (missing GROQ_API_KEY on Vercel dashboard).",
            flags: 64,
          },
        });
      }

      if (!botToken || !channelId) {
        return NextResponse.json({
          type: 4,
          data: {
            content: "ERROR: missing bot token or channel context.",
            flags: 64,
          },
        });
      }

      try {
        const messages = await discordApi<any[]>(`/channels/${channelId}/messages?limit=50`, botToken);
        const transcript = messages
          .reverse()
          .map((m) => `${m.author.username}: ${m.content}`)
          .filter(Boolean)
          .join("\n");

        if (transcript.length < 20) {
          return NextResponse.json({
            type: 4,
            data: { content: "Not enough chat history to summarize.", flags: 64 },
          });
        }

        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${groqKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages: [
              {
                role: "system",
                content:
                  "You are a helpful AI assistant. Summarize the following chat conversation into a brief, easy-to-read bulleted list of key takeaways. Do not include extra conversational filler.",
              },
              { role: "user", content: transcript.slice(-12000) },
            ],
            temperature: 0.5,
          }),
        });

        const groqData = await groqRes.json();
        const summary = groqData.choices?.[0]?.message?.content || "Could not generate a summary.";

        return NextResponse.json({
          type: 4,
          data: {
            embeds: [
              {
                color: 0x5865f2,
                title: "📝 Channel Conversation Notes",
                description: summary,
                footer: { text: "Powered by Groq & Llama 3" },
                timestamp: new Date().toISOString(),
              },
            ],
          },
        });
      } catch (error) {
        console.error("[discord-interactions] nhnotes error:", error);
        return NextResponse.json({
          type: 4,
          data: {
            content: `ERROR: summarization failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            flags: 64,
          },
        });
      }
    }


    if (commandName === "autotext") {
      const guildId = body.guild_id;
      const requesterId = body.member?.user?.id || body.user?.id;
      const botToken = process.env.DISCORD_BOT_TOKEN || process.env.BOT_TOKEN;
      const mode = String(slashOption(body, "mode") || "off").toLowerCase();
      const language = String(slashOption(body, "language") || "auto").toLowerCase().trim();
      const rawChannelId = slashOption(body, "channel");
      const channelId = typeof rawChannelId === "string" ? rawChannelId : "";
      const botMessages = String(slashOption(body, "bot_messages") || "").toLowerCase().trim();

      if (!guildId) {
        return NextResponse.json({
          type: 4,
          data: {
            content: "ERROR: missing guild context for autotext.",
            flags: 64,
          },
        });
      }

      if (!botToken) {
        return NextResponse.json({
          type: 4,
          data: {
            content: "ERROR: bot token is not configured.",
            flags: 64,
          },
        });
      }

      if (!requesterId) {
        return NextResponse.json({
          type: 4,
          data: {
            content: "ERROR: missing user context for autotext.",
            flags: 64,
          },
        });
      }

      const [member, roles] = await Promise.all([
        discordApi<DiscordGuildMember>(`/guilds/${guildId}/members/${requesterId}`, botToken),
        discordApi<DiscordRole[]>(`/guilds/${guildId}/roles`, botToken),
      ]);

      const requesterRoleIds = new Set(member.roles ?? []);
      let requesterPerms = BigInt(0);
      const everyoneRole = roles.find((role) => role.id === guildId);
      requesterPerms |= parsePerms(everyoneRole?.permissions);
      for (const role of roles) {
        if (requesterRoleIds.has(role.id)) requesterPerms |= parsePerms(role.permissions);
      }

      const canManageGuild = hasPerm(requesterPerms, BigInt("32"));
      if (!canManageGuild && !hasPerm(requesterPerms, PERM_ADMIN)) {
        return NextResponse.json({
          type: 4,
          data: {
            content: "ERROR: you need Manage Server or Administrator to change auto text translation.",
            flags: 64,
          },
        });
      }

      const enabled = mode === "on";
      const existingSettings = await updateGuildTranslationSettings(guildId, {
        enabled,
        targetLang: language,
        channelIds: enabled && channelId ? [channelId] : [],
        includeBotMessages: botMessages === "on",
      });

      try {
        if (body.channel_id) {
          await sendBotControlMessage(body.channel_id, botToken, {
            action: "autotext_sync",
            guildId,
            translation: existingSettings.translation,
          });
        }
      } catch (error) {
        console.error("[discord-interactions] autotext sync queue failed:", error);
      }

      return NextResponse.json({
        type: 4,
        data: {
          flags: 64,
          content:
            `Auto text translation is now **${enabled ? "enabled" : "disabled"}**.\n` +
            `Target language: **${language}**\n` +
            `Scope: **${channelId ? `<#${channelId}>` : "all text channels"}**\n` +
            `Bot and webhook messages: **${existingSettings.translation.includeBotMessages ? "included" : "ignored"}**`,
        },
      });
    }

    if (commandName === "vcpermcheck") {
      try {
        const content = await buildVcPermCheckMessage(body);
        return NextResponse.json({ type: 4, data: { content, flags: 64 } });
      } catch (error) {
        console.error("[discord-interactions] vcpermcheck error:", error);
        return NextResponse.json({
          type: 4,
          data: {
            content: `ERROR: vcpermcheck failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            flags: 64,
          },
        });
      }
    }

    if (commandName === "vclisten") {
      const botToken = process.env.DISCORD_BOT_TOKEN || process.env.BOT_TOKEN;
      const guildId = body.guild_id;
      const channelId = body.channel_id;
      const userId = body.member?.user?.id || body.user?.id;
      const targetLang = String(body.data?.options?.find((opt) => opt.name === "translate_to")?.value || "en");

      if (!(await canUseBotFeature(guildId, "liveVoice"))) {
        return premiumResponse("live voice translation");
      }

      if (!botToken || !guildId || !channelId || !userId) {
        return NextResponse.json({
          type: 4,
          data: {
            content: "ERROR: unable to queue vclisten. Missing bot token, guild, channel, or user context.",
            flags: 64,
          },
        });
      }

      try {
        await sendBotControlMessage(channelId, botToken, {
          action: "vclisten",
          guildId,
          userId,
          replyChannelId: channelId,
          targetLang,
        });

        return NextResponse.json({
          type: 4,
          data: {
            content: "Queued voice listener startup. The bot is joining your voice channel now.",
            flags: 64,
          },
        });
      } catch (error) {
        console.error("[discord-interactions] vclisten queue error:", error);
        return NextResponse.json({
          type: 4,
          data: {
            content: `ERROR: failed to queue vclisten: ${error instanceof Error ? error.message : "Unknown error"}`,
            flags: 64,
          },
        });
      }
    }

    if (commandName === "vcauto") {
      const botToken = process.env.DISCORD_BOT_TOKEN || process.env.BOT_TOKEN;
      const guildId = body.guild_id;
      const channelId = body.channel_id;
      const userId = body.member?.user?.id || body.user?.id;

      if (!(await canUseBotFeature(guildId, "liveVoice"))) {
        return premiumResponse("auto live voice translation");
      }

      if (!botToken || !guildId || !channelId || !userId) {
        return NextResponse.json({
          type: 4,
          data: {
            content: "ERROR: unable to queue vcauto. Missing bot token, guild, channel, or user context.",
            flags: 64,
          },
        });
      }

      try {
        await sendBotControlMessage(channelId, botToken, {
          action: "vclisten",
          guildId,
          userId,
          replyChannelId: channelId,
          targetLang: "auto",
          auto: true,
        });

        return NextResponse.json({
          type: 4,
          data: {
            content: "Queued auto voice translation startup. The bot is joining your voice channel now.",
            flags: 64,
          },
        });
      } catch (error) {
        console.error("[discord-interactions] vcauto queue error:", error);
        return NextResponse.json({
          type: 4,
          data: {
            content: `ERROR: failed to queue vcauto: ${error instanceof Error ? error.message : "Unknown error"}`,
            flags: 64,
          },
        });
      }
    }

    if (commandName === "vcstop") {
      const botToken = process.env.DISCORD_BOT_TOKEN || process.env.BOT_TOKEN;
      const guildId = body.guild_id;
      const channelId = body.channel_id;

      if (!botToken || !guildId || !channelId) {
        return NextResponse.json({
          type: 4,
          data: {
            content: "ERROR: unable to queue vcstop. Missing bot token, guild, or channel context.",
            flags: 64,
          },
        });
      }

      try {
        await sendBotControlMessage(channelId, botToken, {
          action: "vcstop",
          guildId,
          replyChannelId: channelId,
        });

        return NextResponse.json({
          type: 4,
          data: {
            content: "Queued voice listener stop request.",
            flags: 64,
          },
        });
      } catch (error) {
        console.error("[discord-interactions] vcstop queue error:", error);
        return NextResponse.json({
          type: 4,
          data: {
            content: `ERROR: failed to queue vcstop: ${error instanceof Error ? error.message : "Unknown error"}`,
            flags: 64,
          },
        });
      }
    }

    return NextResponse.json({
      type: 4,
      data: {
        content: "ERROR: this slash command is not wired through the web interactions endpoint yet.",
        flags: 64,
      },
    });
  }

  if (body.type !== 3) {
    return NextResponse.json({ type: 1 });
  }

  const customId = body.data?.custom_id || "";
  if (!customId.startsWith("close_ticket_")) {
    return NextResponse.json({ type: 1 });
  }

  const channelId = customId.replace("close_ticket_", "");
  const botToken = process.env.DISCORD_BOT_TOKEN || process.env.BOT_TOKEN;

  if (!botToken) {
    return NextResponse.json({
      type: 4,
      data: { content: "ERROR: bot token not configured", flags: 64 },
    });
  }

  (async () => {
    try {
      await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bot ${botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: "Ticket closed by staff. This channel will be deleted in 5 seconds.",
        }),
      });

      await new Promise((resolve) => setTimeout(resolve, 5000));

      await fetch(`https://discord.com/api/v10/channels/${channelId}`, {
        method: "DELETE",
        headers: { Authorization: `Bot ${botToken}` },
      });
    } catch (error) {
      console.error("[discord-interactions] Error closing:", error);
    }
  })();

  return NextResponse.json({
    type: 4,
    data: {
      content: "Closing ticket... Channel will be deleted in 5 seconds.",
      flags: 64,
    },
  });
}
