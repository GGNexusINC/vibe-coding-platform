/**
 * VoxBridge Discord Bot
 * - Message relay to website
 * - Full moderation logging (bans, unbans, deletes, edits, joins, leaves, role/nick changes)
 *
 * Required bot permissions:
 *   View Audit Log, Manage Guild, Read Messages, Read Message History,
 *   View Channels, Ban Members, Manage Roles
 *
 * Required Privileged Gateway Intents (Discord Dev Portal):
 *   SERVER MEMBERS INTENT, MESSAGE CONTENT INTENT
 *
 * Env vars:
 *   BOT_TOKEN, SITE_URL, INGEST_SECRET, BOT_STATUS_SECRET, GUILD_ID, LOG_CHANNEL_ID
 */

process.stderr.write("[bot] Starting...\n");

require("dotenv").config();
try {
  require("@snazzah/davey");
  console.log("[bot] DAVE support library loaded");
} catch (error) {
  console.log("[bot] DAVE support library not loaded:", error.message);
}
const { Client, GatewayIntentBits, ChannelType, PermissionsBitField, EmbedBuilder, AuditLogEvent, REST, Routes, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { joinVoiceChannel, getVoiceConnection, EndBehaviorType, VoiceConnectionStatus, entersState, createAudioPlayer, createAudioResource, AudioPlayerStatus, StreamType } = require("@discordjs/voice");
const { createClient: createDeepgramClient, LiveTranscriptionEvents } = require("@deepgram/sdk");
const prism = require("prism-media");
const sodium = require("libsodium-wrappers");
const { Readable } = require("stream");
const { getGuildConfig, setGuildConfigOverride } = require("./guild-config-manager");
// libsodium-wrappers initializes lazily when needed

// ── Config ────────────────────────────────────────────────────────────────────
const BOT_TOKEN      = process.env.BOT_TOKEN;
const SITE_URL       = process.env.SITE_URL       || "https://newhopeggn.vercel.app";
const INGEST_SECRET  = process.env.INGEST_SECRET || process.env.DISCORD_INGEST_SECRET || "newhopeggn-bot-secret";
const BOT_STATUS_SECRET = process.env.BOT_STATUS_SECRET || process.env.DISCORD_BOT_STATUS_SECRET || INGEST_SECRET;
const GUILD_ID       = process.env.GUILD_ID       || "1419522458075005023";
const LOG_CHANNEL_ID       = process.env.LOG_CHANNEL_ID || "";
const TRANSLATE_TARGET     = process.env.TRANSLATE_TARGET_LANG || "en";
const STAFF_VOICE_WEBHOOK  = process.env.STAFF_VOICE_WEBHOOK || "";
const DEEPGRAM_API_KEY     = process.env.DEEPGRAM_API_KEY || "";
const GROQ_API_KEY         = process.env.GROQ_API_KEY || "";
const VOICE_STT_MODE       = (process.env.VOICE_STT_MODE || "deepgram").toLowerCase();
const LOCAL_STT_WORKER_URL = process.env.LOCAL_STT_WORKER_URL || "";
const VC_TARGET_LANG       = process.env.VC_TARGET_LANG || "en";
const VOICE_CONTROL_PREFIX = "[NH-CONTROL]";
const TRANSLATION_PROVIDER = (process.env.TRANSLATION_PROVIDER || "google").toLowerCase();
const VC_AUTO_LANG = "auto";
const PREMIUM_PANEL_URL = process.env.PREMIUM_PANEL_URL || `${SITE_URL}/bot/dashboard`;
const PREMIUM_GUILD_IDS = new Set(
  String(process.env.PREMIUM_GUILD_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
);
const TRANSLATION_COOLDOWN_MS = 3500;
const TRANSLATION_429_BACKOFF_MS = 15_000;
const translatedTranscriptCache = new Map();
const translationBackoffUntil = new Map();
const premiumAccessCache = new Map();
const vcTranscripts = new Map();
const textTranslationCooldowns = new Map();
let globalTranslationBackoffUntil = 0;
const aiChannelHistory = new Map();

function hasDeepgramVoiceBackend() {
  return Boolean(DEEPGRAM_API_KEY);
}

function hasLocalVoiceBackend() {
  return Boolean(LOCAL_STT_WORKER_URL);
}

function hasAnyVoiceBackend() {
  return hasDeepgramVoiceBackend() || hasLocalVoiceBackend();
}

function buildPcmWavBuffer(chunks, sampleRate = 48000, channels = 1, bitsPerSample = 16) {
  const pcmBuffer = Buffer.concat(chunks.filter(Boolean));
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);
  const header = Buffer.alloc(44);

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcmBuffer.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcmBuffer.length, 40);

  return Buffer.concat([header, pcmBuffer]);
}

async function transcribeWithLocalWorker(wavBuffer, options = {}) {
  if (!hasLocalVoiceBackend()) {
    throw new Error("LOCAL_STT_WORKER_URL is not configured.");
  }

  const form = new FormData();
  form.append("audio", new Blob([wavBuffer], { type: "audio/wav" }), "voice.wav");
  if (options.language) form.append("language", options.language);
  if (typeof options.beamSize === "number") form.append("beam_size", String(options.beamSize));
  if (typeof options.vadFilter === "boolean") form.append("vad_filter", String(options.vadFilter));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(`${LOCAL_STT_WORKER_URL.replace(/\/$/, "")}/transcribe`, {
      method: "POST",
      body: form,
      signal: controller.signal,
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok || !payload?.ok) {
      throw new Error(payload?.detail || payload?.error || `Local STT failed (${res.status})`);
    }
    return {
      text: String(payload.text || "").trim(),
      language: payload.language || null,
      latencyMs: payload.latencyMs || null,
      provider: "local",
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function transcribeWithDeepgramPrerecorded(wavBuffer) {
  if (!hasDeepgramVoiceBackend()) {
    throw new Error("DEEPGRAM_API_KEY is not configured.");
  }

  const res = await fetch("https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&detect_language=true", {
    method: "POST",
    headers: {
      Authorization: `Token ${DEEPGRAM_API_KEY}`,
      "content-type": "audio/wav",
    },
    body: wavBuffer,
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload?.err_msg || payload?.error || `Deepgram prerecorded failed (${res.status})`);
  }

  const transcript = payload?.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";
  const language = payload?.results?.channels?.[0]?.detected_language || payload?.results?.channels?.[0]?.alternatives?.[0]?.languages?.[0] || null;
  return {
    text: String(transcript || "").trim(),
    language,
    latencyMs: null,
    provider: "deepgram-prerecorded",
  };
}

async function getVoiceSttBackendForGuild(guildId) {
  const normalizedMode = ["deepgram", "local", "hybrid"].includes(VOICE_STT_MODE) ? VOICE_STT_MODE : "deepgram";

  if (normalizedMode === "local") {
    if (hasLocalVoiceBackend()) return "local";
    if (hasDeepgramVoiceBackend()) return "deepgram";
    return "none";
  }

  if (normalizedMode === "hybrid") {
    const premiumVoice = await canUsePremiumFeature(guildId, "liveVoice");
    if (premiumVoice && hasDeepgramVoiceBackend()) return "deepgram";
    if (hasLocalVoiceBackend()) return "local";
    if (hasDeepgramVoiceBackend()) return "deepgram";
    return "none";
  }

  if (hasDeepgramVoiceBackend()) return "deepgram";
  if (hasLocalVoiceBackend()) return "local";
  return "none";
}

console.log(`[bot] Opus engine: ${prism.opus.Encoder?.type ?? "unknown"}`);

process.stderr.write(`[bot] BOT_TOKEN present: ${!!BOT_TOKEN}\n`);
process.stderr.write(`[bot] SITE_URL: ${SITE_URL}\n`);

if (!BOT_TOKEN) {
  process.stderr.write("[bot] FATAL: BOT_TOKEN not set in environment\n");
  process.stderr.write(`[bot] Available env vars: ${Object.keys(process.env).filter(k => !k.includes("TOKEN")).join(", ")}\n`);
  process.exit(1);
}

// Relay ALL channels (whitelist is empty = no filter)
const CHANNEL_WHITELIST = [];
// ─────────────────────────────────────────────────────────────────────────────

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildBans,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

// ── Logging helpers ────────────────────────────────────────────────────────────
const BOT_AVATAR = "https://newhopeggn.vercel.app/favicon-32x32.png";
const BOT_NAME   = "NewHopeGGN Logs";

/** Fetch the log channel, returns null if not configured or not found */
async function getLogChannel(guild) {
  if (!guild) return null;
  const config = await getGuildConfig(guild.id);
  if (!config.logging?.enabled) return null;
  const logId = config.logging?.channelId || (guild.id === GUILD_ID ? LOG_CHANNEL_ID : null);
  if (!logId) return null;
  return client.channels.cache.get(logId) ?? await client.channels.fetch(logId).catch(() => null);
}

/**
 * Send a rich embed to the log channel.
 * @param {object} opts - { color, title, description, fields, thumbnail, footer }
 */
async function sendLog(opts) {
  const guild = opts.guild ?? (opts.guildId ? client.guilds.cache.get(opts.guildId) : null);
  if (!guild) return;
  const config = await getGuildConfig(guild.id);
  const enabledEvents = Array.isArray(config.logging?.events) ? config.logging.events : [];
  if (opts.eventId && enabledEvents.length > 0 && !enabledEvents.includes(opts.eventId)) return;
  const ch = await getLogChannel(guild);
  if (!ch) return;
  try {
    const embed = new EmbedBuilder()
      .setColor(opts.color ?? 0x5865f2)
      .setTitle(opts.title)
      .setTimestamp();

    if (opts.description) embed.setDescription(opts.description);
    if (opts.fields?.length) embed.addFields(opts.fields);
    if (opts.thumbnail) embed.setThumbnail(opts.thumbnail);
    if (opts.footer) embed.setFooter({ text: opts.footer, iconURL: BOT_AVATAR });
    else embed.setFooter({ text: BOT_NAME, iconURL: BOT_AVATAR });

    await ch.send({ embeds: [embed] });
  } catch (e) {
    console.error("[log] sendLog error:", e.message);
  }
}

/** Try to get the responsible moderator from the audit log for a given action */
async function getAuditMod(guild, actionType, targetId) {
  try {
    const logs = await guild.fetchAuditLogs({ type: actionType, limit: 1 });
    const entry = logs.entries.first();
    if (!entry) return null;
    if (targetId && entry.target?.id !== targetId) return null;
    if (Date.now() - entry.createdTimestamp > 5000) return null; // older than 5s
    return entry.executor;
  } catch {
    return null;
  }
}

function userTag(user) {
  return user ? `${user.displayName ?? user.username} (<@${user.id}>)` : "Unknown";
}

function avatarOf(user) {
  return user?.displayAvatarURL?.({ size: 64 }) ?? BOT_AVATAR;
}

function guildIconOf(guild) {
  return guild?.iconURL?.({ size: 128 }) ?? BOT_AVATAR;
}

const appliedNicknames = new Map();

async function syncBotNickname(guild, nickname) {
  if (!guild || !guild.members || !guild.members.me) return;
  const currentNick = guild.members.me.nickname || "";
  const targetNick = nickname || ""; // empty means reset
  
  if (currentNick === targetNick) return;
  
  const cacheKey = `${guild.id}:nick`;
  const lastSync = appliedNicknames.get(cacheKey) || 0;
  if (Date.now() - lastSync < 60000) return; // limit sync once per minute per guild

  try {
    await guild.members.me.setNickname(targetNick);
    appliedNicknames.set(cacheKey, Date.now());
    console.log(`[bot] Updated nickname in ${guild.name} to "${targetNick || "Default"}"`);
  } catch (error) {
    console.warn(`[bot] Failed to set nickname in ${guild.id}:`, error.message);
    appliedNicknames.set(cacheKey, Date.now() + 300000); // Wait 5 mins on error
  }
}

async function canUsePremiumFeature(guildId, feature = "liveVoice") {
  if (!guildId) return false;

  const cacheKey = `${guildId}:${feature}`;
  const cached = premiumAccessCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.allowed;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`${SITE_URL}/api/bot/premium-check`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ secret: INGEST_SECRET, guildId, feature }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.ok) {
      const allowed = Boolean(data.allowed);
      premiumAccessCache.set(cacheKey, { allowed, expiresAt: Date.now() + (allowed ? 30_000 : 5_000) });
      return allowed;
    }

    console.warn(`[bot] premium check denied/unavailable for ${guildId}:${feature}: ${res.status}`);
  } catch (error) {
    console.warn(`[bot] premium check failed for ${guildId}:${feature}: ${error?.message ?? error}`);
  }

  // Keep NewHope's primary server resilient even if the premium API has a temporary hiccup.
  const isPrimaryGuild = guildId === GUILD_ID;
  const fallbackAllowed =
    (PREMIUM_GUILD_IDS.has(guildId) || isPrimaryGuild) &&
    ["textTranslate", "liveVoice", "spokenVoice", "staffLogs", "reliability"].includes(feature);
  premiumAccessCache.set(cacheKey, { allowed: fallbackAllowed, expiresAt: Date.now() + (fallbackAllowed ? 10_000 : 3_000) });
  return fallbackAllowed;
}

async function updateGuildConfigFromBot(guildId, settingsPatch) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(`${SITE_URL}/api/bot/guild-config`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        secret: INGEST_SECRET,
        guildId,
        settings: settingsPatch,
      }),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) {
      throw new Error(data?.error || `HTTP ${res.status}`);
    }
    return data.settings || null;
  } finally {
    clearTimeout(timeout);
  }
}

function premiumUpgradePayload(featureName = "premium features", guildId = null) {
  const url = guildId ? `${PREMIUM_PANEL_URL}?guildId=${guildId}` : PREMIUM_PANEL_URL;
  const embed = new EmbedBuilder()
    .setColor(0x00f2ff) // Futuristic Cyan
    .setTitle("💎 NewHopeGGN Premium Elite")
    .setDescription(`**${featureName}** is part of our elite service tier. Elevate your server with next-generation translation and administration tools.`)
    .addFields(
      { 
        name: "🚀 Starter ($19/mo)", 
        value: "• Live Text Translation\n• Multi-Channel Support\n• Standard Priority", 
        inline: false 
      },
      { 
        name: "🎙️ Pro Voice ($59/mo)", 
        value: "• Everything in Starter\n• **Live Voice Translation**\n• TTS Spoken Voice\n• High-Reliability Nodes", 
        inline: false 
      },
      { 
        name: "🛡️ Server Ops ($149/mo)", 
        value: "• Everything in Pro Voice\n• **Staff Audit Logs**\n• Advanced Security Tools\n• 24/7 Dedicated Support", 
        inline: false 
      },
      { name: "✨ Benefits", value: "Real-time AI processing, low latency, and professional-grade translation engines (Google, DeepL, MyMemory).", inline: false },
    )
    .setThumbnail(BOT_AVATAR)
    .setImage("https://newhopeggn.vercel.app/og-premium.png") // Assuming this exists or looks good
    .setFooter({ text: "NewHopeGGN • The Future of Cross-Language Community", iconURL: BOT_AVATAR })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel("Go to Premium Dashboard")
      .setStyle(ButtonStyle.Link)
      .setURL(url),
    new ButtonBuilder()
      .setLabel("Compare Plans")
      .setStyle(ButtonStyle.Link)
      .setURL(`${SITE_URL}/bot`),
  );

  return { embeds: [embed], components: [row], ephemeral: true };
}

// ── Slash command definitions ─────────────────────────────────────────────
const vcListenCommand = new SlashCommandBuilder()
  .setName("vclisten")
  .setDescription("Bot joins your voice channel and translates speech live to Staff-Voice")
  .addStringOption(opt =>
    opt.setName("translate_to")
       .setDescription("Translate speech to which language? (default: English)")
       .setRequired(false)
       .addChoices(
         { name: "🇺🇸 English",    value: "en" },
         { name: "🇪🇸 Spanish",    value: "es" },
         { name: "🇵🇹 Portuguese", value: "pt" },
         { name: "🇫🇷 French",     value: "fr" },
         { name: "🇩🇪 German",     value: "de" },
         { name: "🇷🇺 Russian",    value: "ru" },
         { name: "🇨🇳 Chinese",    value: "zh" },
         { name: "🇯🇵 Japanese",   value: "ja" },
       )
  )
  .toJSON();

const vcAutoCommand = new SlashCommandBuilder()
  .setName("vcauto")
  .setDescription("Start smart English/Spanish live voice translation")
  .toJSON();

const vcStopCommand = new SlashCommandBuilder()
  .setName("vcstop")
  .setDescription("Stop the bot from listening and leave the voice channel")
  .toJSON();

const vcPermCheckCommand = new SlashCommandBuilder()
  .setName("vcpermcheck")
  .setDescription("Check whether the bot can join and speak in your voice channel")
  .addChannelOption((opt) =>
    opt
      .setName("channel")
      .setDescription("Voice channel to inspect")
      .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
      .setRequired(false)
  )
  .toJSON();

const notesCommand = new SlashCommandBuilder()
  .setName("nhnotes")
  .setDescription("Summarizes the last 50 messages in this channel using AI.")
  .toJSON();

const premiumCommand = new SlashCommandBuilder()
  .setName("nhpremium")
  .setDescription("Open the NewHopeGGN premium panel, plans, and setup")
  .toJSON();

const autoTextCommand = new SlashCommandBuilder()
  .setName("autotext")
  .setDescription("Enable or disable automatic text translation for this server")
  .addStringOption((opt) =>
    opt
      .setName("mode")
      .setDescription("Turn auto text translation on or off")
      .setRequired(true)
      .addChoices(
        { name: "Enable", value: "on" },
        { name: "Disable", value: "off" },
      ),
  )
  .addStringOption((opt) =>
    opt
      .setName("language")
      .setDescription("Target language for translated text")
      .setRequired(false)
      .addChoices(
        { name: "Auto English ↔ Spanish", value: "auto" },
        { name: "🇺🇸 English", value: "en" },
        { name: "🇪🇸 Spanish", value: "es" },
        { name: "🇵🇹 Portuguese", value: "pt" },
        { name: "🇫🇷 French", value: "fr" },
        { name: "🇩🇪 German", value: "de" },
        { name: "🇷🇺 Russian", value: "ru" },
        { name: "🇨🇳 Chinese", value: "zh" },
        { name: "🇯🇵 Japanese", value: "ja" },
      ),
  )
  .addStringOption((opt) =>
    opt
      .setName("bot_messages")
      .setDescription("Whether bot and webhook messages should also be translated")
      .setRequired(false)
      .addChoices(
        { name: "Off", value: "off" },
        { name: "On", value: "on" },
      ),
  )
  .addChannelOption((opt) =>
    opt
      .setName("channel")
      .setDescription("Optional text channel to limit this auto text rule to")
      .addChannelTypes(ChannelType.GuildText, ChannelType.PublicThread, ChannelType.PrivateThread, ChannelType.AnnouncementThread)
      .setRequired(false),
  )
  .toJSON();

const translateCommand = new SlashCommandBuilder()
  .setName("nhtranslate")
  .setDescription("Translate text and optionally speak it in voice chat")
  .addStringOption(opt =>
    opt.setName("text")
       .setDescription("The text you want to translate")
       .setRequired(true)
       .setMaxLength(500)
  )
  .addStringOption(opt =>
    opt.setName("to")
       .setDescription("Translate to which language? (default: English)")
       .setRequired(false)
       .addChoices(
         { name: "🇺🇸 English",    value: "en" },
         { name: "🇪🇸 Spanish",    value: "es" },
         { name: "🇵🇹 Portuguese", value: "pt" },
         { name: "🇫🇷 French",     value: "fr" },
         { name: "🇩🇪 German",     value: "de" },
         { name: "🇮🇹 Italian",    value: "it" },
         { name: "🇳🇱 Dutch",      value: "nl" },
         { name: "🇷🇺 Russian",    value: "ru" },
         { name: "🇨🇳 Chinese",    value: "zh" },
         { name: "🇯🇵 Japanese",   value: "ja" },
         { name: "🇰🇷 Korean",     value: "ko" },
         { name: "🇸🇦 Arabic",     value: "ar" },
         { name: "🇹🇷 Turkish",    value: "tr" },
         { name: "🇵🇱 Polish",     value: "pl" },
         { name: "🇮🇳 Hindi",      value: "hi" },
       )
  )
  .addBooleanOption(opt =>
    opt.setName("speak")
       .setDescription("Premium: speak the translated result in your current voice channel")
       .setRequired(false)
  )
  .toJSON();

const aiCommand = new SlashCommandBuilder()
  .setName("nhai")
  .setDescription("Configure AI conversation responses")
  .addStringOption(opt => 
    opt.setName("mode")
      .setDescription("Enable or disable AI responses")
      .setRequired(true)
      .addChoices(
        { name: "Enable", value: "on" },
        { name: "Disable", value: "off" }
      )
  )
  .addStringOption(opt =>
    opt.setName("tone")
      .setDescription("Choose the AI personality tone")
      .setRequired(false)
      .addChoices(
        { name: "Default (Helpful)", value: "default" },
        { name: "Funny/Joker", value: "funny" },
        { name: "Brat (Sassy/Attitude)", value: "brat" },
        { name: "Rude (Aggressive)", value: "rude" },
        { name: "Mean (Cold/Bully)", value: "mean" },
        { name: "Whatever (Dismissive)", value: "whatever" },
        { name: "Professional", value: "professional" }
      )
  )
  .addStringOption(opt =>
    opt.setName("frequency")
      .setDescription("How often should the bot jump into conversation?")
      .setRequired(false)
      .addChoices(
        { name: "Most of the time (50% chance)", value: "most" },
        { name: "Sometimes (20% chance)", value: "sometimes" },
        { name: "Rarely (5% chance)", value: "rarely" }
      )
  )
  .addChannelOption(opt =>
    opt.setName("channel")
      .setDescription("Specific channel to configure (defaults to current channel)")
      .setRequired(false)
  )
  .addBooleanOption(opt =>
    opt.setName("bilingual")
      .setDescription("Should the AI respond in both English and Spanish?")
      .setRequired(false)
  )
  .toJSON();


async function registerSlashCommands() {
  try {
    const rest = new REST({ version: "10" }).setToken(BOT_TOKEN);
    const commandList = [translateCommand, autoTextCommand, premiumCommand, vcListenCommand, vcAutoCommand, vcStopCommand, vcPermCheckCommand, notesCommand, aiCommand];

    console.log("[bot] Registering global slash commands...");
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commandList },
    );

    if (GUILD_ID) {
      console.log(`[bot] Clearing guild slash commands for ${GUILD_ID} to avoid duplicates...`);
      await rest.put(
        Routes.applicationGuildCommands(client.user.id, GUILD_ID),
        { body: [] },
      );
    }

    console.log("[bot] Slash commands synchronized.");
  } catch (e) {
    console.error("[bot] Failed to register slash commands:", e.message);
  }
}

function getTextTranslationCooldownKey(msg) {
  return `${msg.guildId || "dm"}:${msg.channelId}:${msg.author?.id || "unknown"}`;
}

function shouldSkipTextTranslation(msg, config) {
  if (!msg.guildId || !msg.author) return true;
  if (msg.author.id === client.user?.id) return true;
  if (msg.author.bot && !config.translation?.includeBotMessages) return true;
  if (msg.webhookId && !config.translation?.includeBotMessages) return true;
  if (!config.translation?.enabled) return true;
  if (msg.channelId === config.logging?.channelId) return true;
  if (!msg.content?.trim()) return true;
  if (msg.content.trim().startsWith("/") || msg.content.trim().startsWith(VOICE_CONTROL_PREFIX)) return true;
  const allowedChannelIds = Array.isArray(config.translation?.channelIds) ? config.translation.channelIds.filter(Boolean) : [];
  if (allowedChannelIds.length > 0 && !allowedChannelIds.includes(msg.channelId)) return true;

  const cooldownKey = getTextTranslationCooldownKey(msg);
  const cooldownUntil = textTranslationCooldowns.get(cooldownKey) || 0;
  if (cooldownUntil > Date.now()) return true;

  return false;
}

function resolveTextTargetLang(configTarget, originalText) {
  if (configTarget && configTarget !== "auto") return configTarget;
  const detectedSource = detectEnglishSpanish(originalText);
  return resolveAutoTargetLang(detectedSource);
}

async function postTextTranslation(msg, originalText, translatedText, targetLang) {
  const langLabels = {
    en: "English",
    es: "Spanish",
    pt: "Portuguese",
    fr: "French",
    de: "German",
    ru: "Russian",
    zh: "Chinese",
    ja: "Japanese",
  };
  const flagLabels = {
    en: "🇺🇸",
    es: "🇪🇸",
    pt: "🇵🇹",
    fr: "🇫🇷",
    de: "🇩🇪",
    ru: "🇷🇺",
    zh: "🇨🇳",
    ja: "🇯🇵",
  };

  const targetLabel = langLabels[targetLang] || String(targetLang || "Auto");
  const flag = flagLabels[targetLang] || "🌐";
  const embed = new EmbedBuilder()
    .setColor(0x14b8a6)
    .setAuthor({
      name: `${msg.member?.displayName ?? msg.author.username} (text)`,
      iconURL: msg.author.displayAvatarURL({ size: 64 }),
    })
    .addFields(
      { name: "📝 Said", value: originalText.slice(0, 1024) },
      { name: `${flag} Translation`, value: translatedText.slice(0, 1024) },
    )
    .setFooter({ text: `NewHopeGGN Auto Text Translate • ${targetLabel}`, iconURL: BOT_AVATAR })
    .setTimestamp();

  await msg.channel.send({ embeds: [embed] }).catch((error) => {
    console.error("[bot] text translation send failed:", error?.message ?? error);
  });
}

async function maybeAutoTranslateTextMessage(msg) {
  const config = await getGuildConfig(msg.guildId);
  if (config.botNickname && msg.guild) syncBotNickname(msg.guild, config.botNickname);
  if (shouldSkipTextTranslation(msg, config)) return;
  if (!(await canUsePremiumFeature(msg.guildId, "textTranslate"))) return;

  const originalText = msg.content.trim();
  const targetLang = resolveTextTargetLang(config.translation?.targetLang, originalText);
  if (!targetLang) return;

  const cooldownKey = getTextTranslationCooldownKey(msg);
  textTranslationCooldowns.set(cooldownKey, Date.now() + TRANSLATION_COOLDOWN_MS);

  try {
    const { translated } = await translateText(originalText, targetLang);
    if (!translated) return;
    if (translated.trim().toLowerCase() === originalText.trim().toLowerCase()) return;
    await postTextTranslation(msg, originalText, translated, targetLang);
  } catch (error) {
    console.error("[bot] auto text translate failed:", error?.message ?? error);
    if (String(error?.message ?? "").includes("HTTP 429")) {
      await sendLog({
        guild: msg.guild,
        eventId: "errors",
        color: 0xef4444,
        title: "Translation Rate Limit Hit",
        description: "Auto text translation hit a provider rate limit. The bot will keep running and retry on the next messages.",
        fields: [
          { name: "Channel", value: `<#${msg.channelId}>`, inline: true },
          { name: "User", value: userTag(msg.author), inline: true },
        ],
      });
    }
  } finally {
    setTimeout(() => {
      if ((textTranslationCooldowns.get(cooldownKey) || 0) <= Date.now()) {
        textTranslationCooldowns.delete(cooldownKey);
      }
    }, TRANSLATION_COOLDOWN_MS + 1000);
  }
}

// ── Voice listen helpers ───────────────────────────────────────
const activeListeners = new Map(); // guildId -> { connection, cleanups[], metadata }
const activeTtsPlayers = new Map(); // guildId -> AudioPlayer
let statusHeartbeatTimer = null;
let lastStatusError = null;

function stopVoiceSession(guildId) {
  const session = activeListeners.get(guildId);
  if (!session) return false;

  for (const cleanup of Object.values(session.cleanups ?? {})) {
    try {
      cleanup();
    } catch {}
  }

  const existing = getVoiceConnection(guildId);
  if (existing) existing.destroy();
  activeListeners.delete(guildId);
  void sendLog({
    guildId,
    eventId: "voice",
    color: 0x64748b,
    title: "Voice Translation Stopped",
    fields: [
      { name: "Server", value: session.guildName || "Unknown", inline: true },
      { name: "Channel", value: session.voiceChannelName || "Unknown", inline: true },
      { name: "Target", value: session.targetLang || "auto", inline: true },
    ],
  });
  void publishSystemStatus("voice-stop");

  const transcriptData = vcTranscripts.get(guildId);
  vcTranscripts.delete(guildId);
  if (transcriptData && transcriptData.lines.length > 3 && GROQ_API_KEY) {
    const textToSummarize = transcriptData.lines.join("\n");
    fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: "You are a helpful AI assistant. Summarize the following voice chat translation transcript into a brief, easy-to-read bulleted list of key takeaways. Only return the summary." },
          { role: "user", content: textToSummarize.slice(-12000) }
        ],
        temperature: 0.5
      })
    })
    .then(r => r.json())
    .then(data => {
      const summary = data.choices?.[0]?.message?.content;
      if (summary && transcriptData.channel) {
        const embed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle("🎙️ Voice Session Summary")
          .setDescription(summary)
          .setFooter({ text: "Powered by Groq & Llama 3" });
        transcriptData.channel.send({ embeds: [embed] }).catch(() => {});
      }
    })
    .catch(console.error);
  }

  return true;
}

function getVoiceStatusSnapshot() {
  const connections = [...activeListeners.entries()].map(([guildId, session]) => {
    const guild = client.guilds.cache.get(guildId);
    const listenerCount = Object.keys(session.cleanups ?? {}).length;
    const connectionState = session.connection?.state?.status ?? session.connectionState ?? "disconnected";
    return {
      guildId,
      guildName: guild?.name ?? session.guildName ?? null,
      voiceChannelId: session.voiceChannelId ?? null,
      voiceChannelName: session.voiceChannelName ?? null,
      connectionState,
      listenerCount,
      deepgramState: listenerCount > 0 ? "open" : "closed",
      requesterId: session.requesterId ?? null,
      targetLang: session.targetLang ?? null,
      startedAt: session.startedAt ?? null,
    };
  });

  const activeListenersCount = connections.reduce((sum, entry) => sum + entry.listenerCount, 0);
  const hasReadyConnection = connections.some((entry) => entry.connectionState === "ready");
  const hasConnectingConnection = connections.some((entry) => entry.connectionState === "connecting" || entry.connectionState === "signalling");

  return {
    service: "discord-bot",
    status: !client.isReady()
      ? "starting"
      : connections.length === 0
        ? "online"
        : hasReadyConnection
          ? "online"
          : hasConnectingConnection
            ? "degraded"
            : "offline",
    botId: client.user?.id ?? null,
    botTag: client.user?.tag ?? null,
    ready: client.isReady(),
    uptimeMs: Math.round(process.uptime() * 1000),
    heartbeatAt: new Date().toISOString(),
    discord: {
      guilds: client.guilds.cache.size,
      voiceConnections: connections.length,
      guildList: client.guilds.cache.map(g => ({
        id: g.id,
        name: g.name,
        icon: g.icon,
        memberCount: g.memberCount,
        ownerId: g.ownerId,
        joinedAt: g.joinedAt
      }))
    },
    deepgram: {
      configured: Boolean(DEEPGRAM_API_KEY),
      activeSessions: activeListenersCount,
    },
    stt: {
      mode: VOICE_STT_MODE,
      localWorkerConfigured: Boolean(LOCAL_STT_WORKER_URL),
      localWorkerUrl: LOCAL_STT_WORKER_URL || null,
    },
    voice: {
      activeListeners: activeListenersCount,
      connections,
    },
    notes: [
      ...(connections.length === 0 ? ["No active voice listeners right now."] : []),
      ...(VOICE_STT_MODE !== "deepgram" && !LOCAL_STT_WORKER_URL ? ["Local STT mode selected without LOCAL_STT_WORKER_URL configured."] : []),
    ],
    lastError: lastStatusError,
  };
}

async function logBotActivity(type, details, user = null, metadata = {}) {
  if (!SITE_URL) return;
  try {
    await fetch(`${SITE_URL}/api/discord/activity`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        secret: INGEST_SECRET,
        type,
        discord_id: user?.id,
        username: user?.tag || user?.username || "System",
        details,
        metadata: {
          ...metadata,
          source: "bot-process"
        }
      }),
    });
  } catch (e) {
    console.error(`[bot] Activity log error (${type}):`, e.message);
  }
}

async function publishSystemStatus(reason = "heartbeat") {
  if (!SITE_URL) return;
  try {
    const res = await fetch(`${SITE_URL}/api/admin/bot-status`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        secret: BOT_STATUS_SECRET,
        snapshot: getVoiceStatusSnapshot(),
        reason,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      lastStatusError = `Failed to publish system status (${res.status}): ${text || "no response body"}`;
      console.error(`[bot] ${lastStatusError}`);
    } else {
      lastStatusError = null;
    }
  } catch (error) {
    lastStatusError = `Failed to publish system status: ${error?.message ?? error}`;
    console.error("[bot] Failed to publish system status:", error?.message ?? error);
  }
}

function buildVoiceTranslationEmbed(username, avatarUrl, original, translated, targetLang) {
  const LANG_FLAGS = {
    en: "🇺🇸", es: "🇪🇸", pt: "🇵🇹", fr: "🇫🇷",
    de: "🇩🇪", ru: "🇷🇺", zh: "🇨🇳", ja: "🇯🇵",
  };
  const flag = LANG_FLAGS[targetLang] ?? "🌐";
  return {
    color: 0x7c3aed,
    author: { name: `🎤 ${username} (voice)`, icon_url: avatarUrl || BOT_AVATAR },
    fields: [
      { name: "📝 Said", value: original.slice(0, 1024) },
      { name: `${flag} Translation`, value: translated.slice(0, 1024) },
    ],
    footer: { text: "NewHopeGGN Live Voice Translate", icon_url: BOT_AVATAR },
    timestamp: new Date().toISOString(),
  };
}

async function postVoiceTranslation(outputChannel, username, avatarUrl, original, translated, targetLang) {
  const embed = buildVoiceTranslationEmbed(username, avatarUrl, original, translated, targetLang);

  if (outputChannel?.send) {
    await outputChannel.send({ embeds: [EmbedBuilder.from(embed)] }).catch((error) => {
      console.error("[voice] output channel send failed:", error?.message ?? error);
    });
  }

  if (!STAFF_VOICE_WEBHOOK) return;
  await fetch(STAFF_VOICE_WEBHOOK, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      username: "NewHopeGGN Voice",
      avatar_url: avatarUrl || BOT_AVATAR,
      embeds: [embed],
    }),
  }).catch(e => console.error("[voice] webhook error:", e.message));
}

function resolveAutoTargetLang(sourceLang) {
  const normalized = String(sourceLang || "").toLowerCase();
  if (normalized.startsWith("en")) return "es";
  if (normalized.startsWith("es")) return "en";
  return "es";
}

function detectEnglishSpanish(text) {
  const normalized = String(text || "").toLowerCase();
  if (/[áéíóúñü¿¡]/.test(normalized)) return "es";

  const tokens = normalized.match(/[a-z]+/g) ?? [];
  const spanishWords = new Set([
    "a", "al", "como", "con", "creo", "de", "del", "el", "en", "es", "eso", "esta", "este", "la", "le", "lo", "me", "mi", "no", "para", "pero", "por", "que", "se", "si", "sirve", "un", "una", "y", "ya",
  ]);
  const englishWords = new Set([
    "a", "and", "are", "because", "bro", "but", "can", "do", "does", "english", "for", "if", "in", "is", "it", "me", "not", "now", "ok", "should", "so", "spanish", "that", "the", "this", "to", "translate", "turn", "we", "what", "works", "you",
  ]);

  let spanishScore = 0;
  let englishScore = 0;
  for (const token of tokens) {
    if (spanishWords.has(token)) spanishScore += 1;
    if (englishWords.has(token)) englishScore += 1;
  }

  if (spanishScore > englishScore) return "es";
  if (englishScore > spanishScore) return "en";
  return "en";
}

async function startListeningToUser(connection, guildId, userId, member, targetLang, outputChannel = null, onEnded = null) {
  const receiver = connection.receiver;
  const backend = await getVoiceSttBackendForGuild(guildId);
  if (backend === "none") {
    console.error("[voice] No configured voice STT backend is available");
    return null;
  }

  let audioStream = null;
  let opusDecoder = null;
  let dgLive = null;
  let deepgram = null;
  let fullTranscript = "";
  let deepgramReady = false;
  let deepgramOpening = false;
  let sawOpusChunk = false;
  let sawAudioChunk = false;
  let finished = false;
  let pendingTranscript = "";
  let pendingTranscriptAt = 0;
  let pendingSourceLang = "en";
  const pcmChunks = [];
  const localFallbackToDeepgram = VOICE_STT_MODE === "hybrid" && hasDeepgramVoiceBackend();

  const finalize = (reason = "ended") => {
    if (finished) return;
    finished = true;
    try {
      if (typeof onEnded === "function") onEnded(reason);
    } catch {}
    try {
      if (dgLive) {
        if (typeof dgLive.finish === "function") {
          dgLive.finish();
        } else if (typeof dgLive.send === "function") {
          dgLive.send(JSON.stringify({ type: "Finalize" }));
        }
      }
    } catch {}
    try { audioStream?.destroy(); } catch {}
    try { opusDecoder?.destroy(); } catch {}
  };

  const translatePendingTranscript = async () => {
    const transcript = pendingTranscript.trim();
    if (transcript.length < 2) return;
    const outputLang = targetLang === VC_AUTO_LANG ? resolveAutoTargetLang(pendingSourceLang) : targetLang;

    const transcriptKey = `${userId}:${outputLang}:${transcript.toLowerCase()}`;
    const previousHit = translatedTranscriptCache.get(transcriptKey);
    if (previousHit && Date.now() - previousHit < TRANSLATION_COOLDOWN_MS) {
      console.log("[voice] translation skipped duplicate transcript");
      return;
    }

    translatedTranscriptCache.set(transcriptKey, Date.now());
    pendingTranscript = "";

    const now = Date.now();
    const userBackoffUntil = translationBackoffUntil.get(userId) || 0;
    if (now < globalTranslationBackoffUntil || now < userBackoffUntil) {
      console.log("[voice] translation skipped during provider backoff");
      return;
    }

    try {
      const { translated } = await translateText(transcript, outputLang);
      const username = member?.displayName ?? member?.user?.username ?? `User ${userId}`;
      const avatarUrl = member?.user?.displayAvatarURL({ size: 64 }) ?? BOT_AVATAR;
      console.log(`[voice] ${username}: ${transcript} -> ${translated}`);
      await postVoiceTranslation(outputChannel, username, avatarUrl, transcript, translated, outputLang);
      if (vcTranscripts.has(guildId)) {
        vcTranscripts.get(guildId).lines.push(`${username}: ${translated}`);
      }
    } catch (e) {
      console.error("[voice] translate error:", e.message);
      if (String(e?.message ?? "").includes("HTTP 429")) {
        const until = Date.now() + TRANSLATION_429_BACKOFF_MS;
        globalTranslationBackoffUntil = Math.max(globalTranslationBackoffUntil, until);
        translationBackoffUntil.set(userId, until);
        console.warn("[voice] translation backoff enabled for all users until:", new Date(globalTranslationBackoffUntil).toISOString());
      } else if (transcript.length > 0) {
        const username = member?.displayName ?? member?.user?.username ?? `User ${userId}`;
        const avatarUrl = member?.user?.displayAvatarURL({ size: 64 }) ?? BOT_AVATAR;
        await postVoiceTranslation(outputChannel, username, avatarUrl, transcript, transcript, outputLang);
      }
    }
  };

  const flushLocalTranscript = async () => {
    if (pcmChunks.length === 0) return;

    const wavBuffer = buildPcmWavBuffer(pcmChunks);
    let transcriptResult = null;

    try {
      transcriptResult = await transcribeWithLocalWorker(wavBuffer);
    } catch (localError) {
      console.error("[voice] local STT error:", localError?.message ?? localError);
      if (!localFallbackToDeepgram) return;
      try {
        transcriptResult = await transcribeWithDeepgramPrerecorded(wavBuffer);
      } catch (fallbackError) {
        console.error("[voice] local->Deepgram fallback STT error:", fallbackError?.message ?? fallbackError);
        return;
      }
    }

    const transcript = String(transcriptResult?.text || "").trim();
    if (transcript.length < 2) return;

    pendingTranscript = transcript;
    pendingSourceLang = transcriptResult?.language
      ? String(transcriptResult.language).toLowerCase()
      : detectEnglishSpanish(transcript);
    pendingTranscriptAt = Date.now();
    await translatePendingTranscript();
  };

  const openDeepgramStream = (reason = "reopen") => {
    if (finished || deepgramReady || deepgramOpening) return;
    if (!deepgram) {
      deepgram = createDeepgramClient(DEEPGRAM_API_KEY);
    }
    deepgramOpening = true;
    dgLive = deepgram.listen.live({
      model: "nova-2",
      language: "multi",
      smart_format: true,
      interim_results: true,
      vad_events: true,
      endpointing: 300,
      encoding: "linear16",
      sample_rate: 48000,
      channels: 1,
    });

    dgLive.on(LiveTranscriptionEvents.Open, () => {
      deepgramReady = true;
      deepgramOpening = false;
      console.log("[voice] Deepgram stream opened");
    });
    dgLive.on(LiveTranscriptionEvents.Close, () => {
      deepgramReady = false;
      deepgramOpening = false;
      dgLive = null;
      console.log("[voice] Deepgram stream closed");
    });
    dgLive.on(LiveTranscriptionEvents.SpeechStarted, () => {
      console.log("[voice] Speech started");
    });
    dgLive.on(LiveTranscriptionEvents.UtteranceEnd, async () => {
      console.log("[voice] Utterance ended");
      await translatePendingTranscript();
    });
    dgLive.on(LiveTranscriptionEvents.Transcript, async (data) => {
      if (!data?.channel?.alternatives?.length) return;

      const transcript = data?.channel?.alternatives?.[0]?.transcript;
      if (!transcript || transcript.trim().length < 2) return;
      fullTranscript = transcript.trim();
      pendingTranscript = fullTranscript;
      pendingSourceLang = detectEnglishSpanish(fullTranscript);
      pendingTranscriptAt = Date.now();
      if (!data?.is_final && !data?.speech_final) {
        return;
      }
      await translatePendingTranscript();
    });

    dgLive.on("error", (e) => {
      console.error("[voice] Deepgram error:", e.message);
      deepgramReady = false;
      deepgramOpening = false;
      dgLive = null;
    });
    console.log(`[voice] Deepgram stream opening (${reason})`);
  };

  try {
    audioStream = receiver.subscribe(userId, backend === "local"
      ? {
          end: { behavior: EndBehaviorType.AfterSilence, duration: 700 },
        }
      : {
          end: { behavior: EndBehaviorType.Manual },
        });
    opusDecoder = new prism.opus.Decoder({
      rate: 48000,
      channels: 1,
      frameSize: 960,
    });
  } catch (error) {
    console.error("[voice] Failed to create voice decoder:", error?.message ?? error);
    try {
      if (typeof dgLive.finish === "function") {
        dgLive.finish();
      }
    } catch {}
    return null;
  }

  audioStream.on("data", (chunk) => {
    if (!sawOpusChunk) {
      sawOpusChunk = true;
      console.log("[voice] Discord opus audio flowing, first chunk bytes:", chunk.length);
    }
  });
  opusDecoder.on("data", (chunk) => {
    if (!sawAudioChunk) {
      sawAudioChunk = true;
      console.log("[voice] PCM audio flowing, first chunk bytes:", chunk.length);
    }
    if (backend === "local") {
      pcmChunks.push(Buffer.from(chunk));
      return;
    }
    if (!deepgramReady) {
      openDeepgramStream("audio");
      return;
    }
    if (dgLive) dgLive.send(chunk);
  });

  audioStream.on("error", (e) => {
    console.error("[voice] Discord audio stream error:", e.message);
    finalize("audio-error");
  });
  audioStream.on("end", async () => {
    if (backend !== "local") return;
    try {
      await flushLocalTranscript();
    } catch (error) {
      console.error("[voice] local transcript flush error:", error?.message ?? error);
    } finally {
      finalize("audio-end");
    }
  });
  opusDecoder.on("error", (e) => {
    console.error("[voice] Opus decoder error:", e.message);
    finalize("decoder-error");
  });

  audioStream.pipe(opusDecoder);

  return () => {
    finalize("cleanup");
  };
}

async function startVoiceListening(connection, guild, targetLang, voiceChannel = null, outputChannel = null) {
  const receiver = connection.receiver;
  const cleanups = [];
  const startingListeners = new Set();
  const preferredBackend = await getVoiceSttBackendForGuild(guild.id);

  const startListenerForUser = async (userId) => {
    if (cleanups[userId] || startingListeners.has(userId)) return;
    startingListeners.add(userId);
    const member = guild.members.cache.get(userId) ?? await guild.members.fetch(userId).catch(() => null);
    try {
      if (member?.user?.bot) return;
      console.log(`[voice] Starting listener for ${member?.displayName ?? userId}`);
      const cleanup = await startListeningToUser(connection, guild.id, userId, member, targetLang, outputChannel, (reason) => {
        if (cleanups[userId]) {
          delete cleanups[userId];
          void publishSystemStatus(reason === "cleanup" ? "listener-end" : "listener-failed");
        }
      });
      if (cleanup) cleanups[userId] = cleanup;
      if (cleanup) void publishSystemStatus("listener-start");
    } catch (error) {
      console.error("[voice] listener start error:", error?.message ?? error);
    } finally {
      startingListeners.delete(userId);
    }
  };

  if (preferredBackend === "deepgram" && voiceChannel?.members?.size) {
    for (const member of voiceChannel.members.values()) {
      if (member?.user?.bot) continue;
      await startListenerForUser(member.id);
    }
  }

  receiver.speaking.on("start", (userId) => {
    console.log(`[voice] speaking start: ${userId}`);
    const session = activeListeners.get(guild.id);
    if (session?.voiceChannelId) {
      void startListenerForUser(userId);
    }
  });

  receiver.speaking.on("end", (userId) => {
    console.log(`[voice] speaking end: ${userId}`);
  });

  return { cleanups, startListenerForUser };
}

client.on("voiceStateUpdate", (oldState, newState) => {
  const session = activeListeners.get(newState.guild.id);
  if (!session?.voiceChannelId) return;
  if (newState.member?.user?.bot) return;

  const userId = newState.id;
  const wasInTrackedChannel = oldState.channelId === session.voiceChannelId;
  const isInTrackedChannel = newState.channelId === session.voiceChannelId;

  if (isInTrackedChannel && !session.cleanups?.[userId]) {
    void session.startListenerForUser?.(userId).catch((error) => {
      console.error("[voice] voiceStateUpdate start error:", error?.message ?? error);
    });
  }

  if (wasInTrackedChannel && !isInTrackedChannel && session.cleanups?.[userId]) {
    try {
      session.cleanups[userId]();
    } catch (error) {
      console.error("[voice] cleanup error:", error?.message ?? error);
    }
    delete session.cleanups[userId];
    void publishSystemStatus("listener-end");
  }
});
async function startVoiceListenSession(guild, requesterId, targetLang, replyChannel, autoMode = false) {
  if (!hasAnyVoiceBackend()) {
    await replyChannel.send("No voice STT backend is configured on the bot yet. Set `DEEPGRAM_API_KEY` or `LOCAL_STT_WORKER_URL`.");
    return;
  }


  const member = guild.members.cache.get(requesterId) ?? await guild.members.fetch(requesterId).catch(() => null);
  const voiceChannel = member?.voice?.channel;
  if (!voiceChannel) {
    await replyChannel.send("❌ You must be in a voice channel first!");
    return;
  }

  const botMember = guild.members.me ?? await guild.members.fetch(client.user.id);
  const perms = voiceChannel.permissionsFor(botMember);
  const requiredPerms = [
    PermissionsBitField.Flags.ViewChannel,
    PermissionsBitField.Flags.Connect,
    PermissionsBitField.Flags.Speak,
  ];

  if (!perms) {
    await replyChannel.send("❌ I cannot inspect my permissions in that voice channel right now.");
    return;
  }

  const missingPerms = perms.missing(requiredPerms);
  if (missingPerms.length > 0) {
    await replyChannel.send(
      `❌ I am missing permissions in **${voiceChannel.name}**: ${missingPerms.map((perm) => `\`${perm}\``).join(", ")}.\n` +
      "I need `View Channel`, `Connect`, and `Speak` to listen there."
    );
    return;
  }

  stopVoiceSession(guild.id);

  try {
    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: true,
    });
    connection.on("stateChange", (oldState, newState) => {
      console.log(`[voice] connection state: ${oldState.status} -> ${newState.status}`);
      const current = activeListeners.get(guild.id);
      if (current) {
        current.connection = connection;
        current.connectionState = newState.status;
      }
      void publishSystemStatus("voice-state");
    });

    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 15000);
      console.log("[voice] connection is ready");
    } catch (error) {
      connection.destroy();
      console.error("[voice] voice connection failed to reach ready:", error?.message ?? error);
      await replyChannel.send("❌ I could not finish connecting to the voice channel. The voice handshake is failing before audio capture starts.");
      return;
    }

    const effectiveTargetLang = autoMode ? VC_AUTO_LANG : targetLang;
    const voiceSession = await startVoiceListening(connection, guild, effectiveTargetLang, voiceChannel, replyChannel);
    vcTranscripts.set(guild.id, { channel: replyChannel, lines: [] });
    activeListeners.set(guild.id, {
      connection,
      cleanups: voiceSession.cleanups,
      startListenerForUser: voiceSession.startListenerForUser,
      guildName: guild.name,
      voiceChannelId: voiceChannel.id,
      voiceChannelName: voiceChannel.name,
      outputChannelId: replyChannel?.id ?? null,
      outputChannelName: replyChannel?.name ?? "Current channel",
      requesterId,
      targetLang: effectiveTargetLang,
      startedAt: new Date().toISOString(),
      connectionState: connection.state.status,
    });
    void sendLog({
      guild,
      eventId: "voice",
      color: 0x22c55e,
      title: "Voice Translation Started",
      fields: [
        { name: "Channel", value: voiceChannel.name, inline: true },
        { name: "Requested by", value: member?.user ? userTag(member.user) : `<@${requesterId}>`, inline: true },
        { name: "Mode", value: autoMode ? "Auto EN ↔ ES" : String(targetLang || VC_TARGET_LANG), inline: true },
      ],
    });
    void publishSystemStatus("voice-listen-start");

    const LANG_NAMES = { en: "🇺🇸 English", es: "🇪🇸 Spanish", pt: "🇵🇹 Portuguese", fr: "🇫🇷 French", de: "🇩🇪 German", ru: "🇷🇺 Russian", zh: "🇨🇳 Chinese", ja: "🇯🇵 Japanese" };
    await replyChannel.send(
      `🎤 Now listening in **${voiceChannel.name}** — translating to **${autoMode ? "Auto EN ↔ ES" : (LANG_NAMES[targetLang] ?? targetLang)}**. Results post in **${replyChannel?.name ?? "this channel"}**${STAFF_VOICE_WEBHOOK ? " and Staff-Voice" : ""}.\nRun \`/vcstop\` to stop.`
    );
  } catch (error) {
    console.error("[bot] /vclisten join error:", error);
    void sendLog({
      guild,
      eventId: "errors",
      color: 0xef4444,
      title: "Voice Translation Failed",
      description: error?.message ?? "Unknown voice join error",
      fields: [
        { name: "Channel", value: voiceChannel.name, inline: true },
        { name: "Requested by", value: member?.user ? userTag(member.user) : `<@${requesterId}>`, inline: true },
      ],
    });
    await replyChannel.send(`❌ Failed to join voice channel: ${error?.message ?? "Unknown error"}`);
  }
}

/**
 * Translate text using a public provider first, then MyMemory as a backup.
 * Auto-detects source language, translates to `targetLang`.
 */
async function translateText(text, targetLang) {
  const providers = TRANSLATION_PROVIDER === "mymemory"
    ? [translateWithMyMemory, translateWithGoogle]
    : [translateWithGoogle, translateWithMyMemory];

  let lastError = null;
  for (const provider of providers) {
    try {
      return await provider(text, targetLang);
    } catch (error) {
      lastError = error;
      console.error("[voice] translation provider failed:", error?.message ?? error);
    }
  }
  throw lastError ?? new Error("Translation failed");
}

async function translateWithGoogle(text, targetLang) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) {
      const error = new Error(`HTTP ${res.status}`);
      error.status = res.status;
      throw error;
    }
    const json = await res.json();
    const translated = Array.isArray(json?.[0])
      ? json[0].map((part) => Array.isArray(part) ? part[0] : "").join("").trim()
      : "";
    if (!translated) throw new Error("Google translation returned no text");
    return { translated };
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

async function translateWithMyMemory(text, targetLang) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=autodetect|${encodeURIComponent(targetLang)}`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) {
      const error = new Error(`HTTP ${res.status}`);
      error.status = res.status;
      throw error;
    }
    const json = await res.json();
    if (json.responseStatus !== 200) throw new Error(json.responseMessage || "Translation failed");
    return { translated: json.responseData?.translatedText ?? "*(no result)*" };
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

async function synthesizeSpeechOpus(text) {
  if (!DEEPGRAM_API_KEY) {
    throw new Error("DEEPGRAM_API_KEY is required for voice speak.");
  }

  const safeText = String(text || "").trim().slice(0, 420);
  if (!safeText) throw new Error("No text to speak.");

  const model = process.env.DEEPGRAM_TTS_MODEL || "aura-2-thalia-en";
  const url = `https://api.deepgram.com/v1/speak?model=${encodeURIComponent(model)}&encoding=opus&container=ogg`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Token ${DEEPGRAM_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: safeText }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Deepgram TTS failed (${res.status}): ${body.slice(0, 180)}`);
  }

  return Buffer.from(await res.arrayBuffer());
}

async function speakForMemberInVoiceChannel(guild, userId, text) {
  const member = guild.members.cache.get(userId) ?? await guild.members.fetch(userId);
  const voiceChannel = member?.voice?.channel;
  if (!voiceChannel) {
    throw new Error("Join a voice channel first so I know where to speak.");
  }

  const botMember = guild.members.me ?? await guild.members.fetch(client.user.id);
  const perms = voiceChannel.permissionsFor(botMember);
  const requiredPerms = [
    PermissionsBitField.Flags.ViewChannel,
    PermissionsBitField.Flags.Connect,
    PermissionsBitField.Flags.Speak,
  ];
  const missingPerms = perms ? perms.missing(requiredPerms) : requiredPerms;
  if (!perms || missingPerms.length > 0) {
    throw new Error(`I need View Channel, Connect, and Speak in ${voiceChannel.name}.`);
  }

  let connection = getVoiceConnection(guild.id);
  if (!connection || connection.joinConfig.channelId !== voiceChannel.id) {
    connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: false,
    });
  } else if (typeof connection.rejoin === "function") {
    connection.rejoin({ selfDeaf: false, selfMute: false });
  }

  await entersState(connection, VoiceConnectionStatus.Ready, 15_000);

  const audio = await synthesizeSpeechOpus(text);
  const player = createAudioPlayer();
  const oldPlayer = activeTtsPlayers.get(guild.id);
  try { oldPlayer?.stop(true); } catch {}
  activeTtsPlayers.set(guild.id, player);

  const resource = createAudioResource(Readable.from(audio), { inputType: StreamType.OggOpus });
  connection.subscribe(player);
  player.play(resource);

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      try { player.stop(true); } catch {}
      reject(new Error("Voice speak timed out."));
    }, 45_000);

    player.once(AudioPlayerStatus.Idle, () => {
      clearTimeout(timeout);
      resolve();
    });
    player.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });

  return voiceChannel;
}

async function speakInVoiceChannel(interaction, text) {
  return speakForMemberInVoiceChannel(interaction.guild, interaction.user.id, text);
}

client.once("ready", async () => {
  console.log(`[bot] Logged in as ${client.user.tag}`);
  console.log(`[bot] SITE_URL: ${SITE_URL}`);
  console.log(`[bot] GROQ_API_KEY present: ${Boolean(GROQ_API_KEY)}`);

  // Register slash commands
  await registerSlashCommands();

  // Initial sync on startup, then every 10 minutes
  await syncMembers();
  setInterval(() => { void syncMembers(); }, 10 * 60 * 1000);
  void publishSystemStatus("ready");
  if (statusHeartbeatTimer) clearInterval(statusHeartbeatTimer);
  statusHeartbeatTimer = setInterval(() => {
    void publishSystemStatus("heartbeat");
  }, 30000);
});

async function syncMembers() {
  try {
    console.log("[bot] Starting member sync...");
    // Use Discord REST API — no privileged GuildMembers intent required
    const DISCORD_TOKEN = BOT_TOKEN;
    let after = "0";
    const LIMIT = 1000;
    let iterations = 0;
    const MAX_ITERATIONS = 50; // Safety limit to prevent infinite loops

    let totalSynced = 0;

    while (iterations < MAX_ITERATIONS) {
      iterations++;
      console.log(`[bot] Fetching members batch ${iterations}, after: ${after}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      let batch = [];
      try {
        const res = await fetch(
          `https://discord.com/api/v10/guilds/${GUILD_ID}/members?limit=${LIMIT}&after=${after}`,
          { 
            headers: { Authorization: `Bot ${DISCORD_TOKEN}` },
            signal: controller.signal
          }
        );
        clearTimeout(timeoutId);
        
        if (!res.ok) { 
          console.error("[bot] Discord members REST failed:", res.status); 
          break; 
        }
        batch = await res.json();
        console.log(`[bot] Fetched ${batch.length} members in batch ${iterations}`);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          console.error("[bot] Discord API fetch timeout in batch", iterations);
        } else {
          console.error("[bot] Discord API fetch error:", fetchError.message);
        }
        break;
      }
      
      if (!batch.length) break;

      const payload = batch.map(m => ({
        discord_id:   m.user.id,
        username:     m.user.username,
        display_name: m.nick ?? m.user.global_name ?? m.user.username,
        avatar_url:   m.user.avatar
                       ? `https://cdn.discordapp.com/avatars/${m.user.id}/${m.user.avatar}.png?size=64`
                       : `https://cdn.discordapp.com/embed/avatars/0.png`,
        is_bot:       m.user.bot ?? false,
        joined_at:    m.joined_at ?? null,
        roles:        m.roles ?? [],
      }));

      const syncController = new AbortController();
      const syncTimeoutId = setTimeout(() => syncController.abort(), 15000); // 15 second timeout
      
      try {
        const res = await fetch(`${SITE_URL}/api/discord/members-sync`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ secret: INGEST_SECRET, members: payload }),
          signal: syncController.signal
        });
        clearTimeout(syncTimeoutId);
        
        if (!res.ok) {
          console.error("[bot] members-sync failed:", res.status, await res.text());
        } else {
          console.log(`[bot] Synced ${payload.length} guild members (batch ${iterations})`);
          totalSynced += payload.length;
        }
      } catch (syncError) {
        clearTimeout(syncTimeoutId);
        if (syncError.name === 'AbortError') {
          console.error("[bot] Website API sync timeout for batch", iterations);
        } else {
          console.error("[bot] Website API sync error for batch:", syncError.message);
        }
      }

      if (batch.length < LIMIT) break;
      after = batch[batch.length - 1].user.id;
    }
    
    if (iterations >= MAX_ITERATIONS) {
      console.error("[bot] Member sync hit max iterations limit, stopping to prevent infinite loop");
    } else {
      console.log(`[bot] Completed member sync. Synced ${totalSynced} members in total.`);
    }
  } catch (e) {
    console.error("[bot] syncMembers error:", e.message);
  }
}

async function relayMessage(msg) {
  if (msg.author?.id === client.user?.id && msg.content?.startsWith(VOICE_CONTROL_PREFIX)) {
    try {
      const raw = msg.content.slice(VOICE_CONTROL_PREFIX.length).trim();
      const payload = JSON.parse(raw);
      const replyChannel = msg.channel;

      if (payload?.action === "vclisten" && payload.guildId && payload.userId) {
        await startVoiceListenSession(msg.guild, payload.userId, payload.targetLang ?? VC_TARGET_LANG, replyChannel, Boolean(payload.auto));
        await msg.delete().catch(() => {});
        return;
      }

      if (payload?.action === "nhtranslate_speak" && payload.guildId && payload.userId && payload.translated) {
        if (!(await canUsePremiumFeature(payload.guildId, "spokenVoice"))) {
          await replyChannel.send("NewHopeGGN Premium is required for voice-channel translated speech.");
          await msg.delete().catch(() => {});
          return;
        }

        const voiceChannel = await speakForMemberInVoiceChannel(msg.guild, payload.userId, payload.translated);
        await replyChannel.send(`Spoken translated audio in **${voiceChannel.name}** for <@${payload.userId}>.`);
        await msg.delete().catch(() => {});
        return;
      }

      if (payload?.action === "vcstop" && payload.guildId) {
        stopVoiceSession(msg.guild.id);
        await replyChannel.send("🔇 Stopped listening and left the voice channel.");
        await msg.delete().catch(() => {});
        return;
      }

      if (payload?.action === "autotext_sync" && payload.guildId && payload.translation && typeof payload.translation === "object") {
        setGuildConfigOverride(payload.guildId, {
          translation: payload.translation,
        });
        await msg.delete().catch(() => {});
        return;
      }
    } catch (error) {
      console.error("[bot] voice control error:", error);
      await msg.channel.send(`❌ Voice control failed: ${error?.message ?? "Unknown error"}`).catch(() => {});
    }
    return;
  }

  if (msg.author?.bot) return;

  const channelName = msg.channel?.name ?? "";

  // Filter by whitelist if set
  if (CHANNEL_WHITELIST.length > 0 && !CHANNEL_WHITELIST.includes(channelName)) return;

  // Collect direct attachment URLs (uploaded images/gifs)
  const attachmentUrls = [...(msg.attachments?.values() ?? [])]
    .filter(a => a.url)
    .map(a => a.url);

  // Collect embed media URLs
  // NOTE: Discord sends Tenor/Giphy embeds via messageUpdate after the initial messageCreate
  const embedUrls = (msg.embeds ?? []).flatMap(e => {
    const candidates = [
      e.image?.proxyURL,
      e.image?.url,
      e.thumbnail?.proxyURL,
      e.thumbnail?.url,
    ];
    return candidates.filter(Boolean);
  });

  const mediaUrls = [...new Set([...attachmentUrls, ...embedUrls])];
  const fullContent = [msg.content?.trim(), ...mediaUrls].filter(Boolean).join(" ");

  if (!fullContent) return;

  console.log(`[bot] Relay #${channelName} from ${msg.author.username}: ${fullContent.slice(0, 100)}`);

  const payload = {
    secret: INGEST_SECRET,
    id: msg.id,
    channel_id: msg.channelId,
    channel_name: channelName,
    author_id: msg.author.id,
    author_username: msg.author.displayName ?? msg.author.username,
    author_avatar: msg.author.displayAvatarURL({ size: 64 }),
    content: fullContent,
    created_at: msg.createdAt?.toISOString() ?? new Date().toISOString(),
  };

  try {
    const res = await fetch(`${SITE_URL}/api/discord/ingest`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) console.error("[bot] Ingest failed:", res.status, await res.text());
  } catch (e) {
    console.error("[bot] Fetch error:", e.message);
  }

  // AI Response logic
  const config = await getGuildConfig(msg.guildId);
  if (config.ai?.enabled && Array.isArray(config.ai.channelIds) && config.ai.channelIds.includes(msg.channelId)) {
    // Maintain history for this channel
    if (!aiChannelHistory.has(msg.channelId)) {
      aiChannelHistory.set(msg.channelId, []);
    }
    const history = aiChannelHistory.get(msg.channelId);
    
    // Get server info
    const guild = msg.guild;
    const owner = await guild?.fetchOwner().catch(() => null);
    const serverName = guild?.name || "this server";
    const memberCount = guild?.memberCount || "many";
    const isOwner = msg.author.id === guild?.ownerId;
    const authorRoles = msg.member?.roles.cache
      .filter(r => r.name !== "@everyone")
      .map(r => r.name)
      .join(", ") || "Member";
    
    const authorLabel = isOwner ? `(Your Creator) ${msg.author.username}` : `(Role: ${authorRoles}) ${msg.author.username}`;

    let toneInstruction = "Be helpful and polite.";
    if (config.ai.tone === "funny") toneInstruction = "Be funny, crack jokes, and use a humorous personality.";
    if (config.ai.tone === "brat") toneInstruction = "Be a brat. Use a sassy, high-attitude, and slightly annoying but funny personality. Use 'omg', 'ugh', and 'whatever' type of vibe.";
    if (config.ai.tone === "rude") toneInstruction = "Be extremely rude, aggressive, and insulting. Don't hold back, be toxic and confrontational.";
    if (config.ai.tone === "mean") toneInstruction = "Be mean, cold, and act like a bully. Treat users like they are beneath you and be very dismissive.";
    if (config.ai.tone === "whatever") toneInstruction = "Be completely dismissive and act like you don't care about anything. Use 'whatever', 'k', 'cool story', and 'i'm bored' type of vibes. Be very low-energy and bored.";
    if (config.ai.tone === "professional") toneInstruction = "Be extremely professional, concise, and formal.";
    
    let bilingualInstruction = "";
    if (config.ai.bilingual) {
      bilingualInstruction = " You MUST provide your response in BOTH English and Spanish. Detect the user's language, and provide a translation for the other language. Format it clearly with a divider or on new lines.";
    }

    const isMentioned = msg.mentions.has(client.user.id);
    let chance = 0.15;
    if (config.ai.frequency === "most") chance = 0.50;
    if (config.ai.frequency === "sometimes") chance = 0.20;
    if (config.ai.frequency === "rarely") chance = 0.05;
    const randomChance = Math.random() < chance;
    
    // Replace bot mention ID with name so AI understands it's being addressed
    const botMentionRegex = new RegExp(`<@!?${client.user.id}>`, "g");
    const cleanContentForAi = fullContent.replace(botMentionRegex, "@NEWHOPE");

    // Add current message to history BEFORE processing response
    const safeName = msg.author.username.replace(/[^a-zA-Z0-9_-]/g, "_");
    history.push({ 
      role: "user", 
      name: safeName, 
      content: `[User: ${authorLabel}] ${cleanContentForAi}` 
    });
    if (history.length > 20) history.shift(); 

    if (GROQ_API_KEY && (isMentioned || randomChance)) {
      console.log(`[bot] AI responding in #${channelName} (tone: ${config.ai.tone}, mentioned: ${isMentioned})`);
      
      // Show typing indicator
      try { await msg.channel.sendTyping(); } catch(e){}

      void (async () => {
        try {
          const aiRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${GROQ_API_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: "llama-3.1-8b-instant",
              messages: [
                { 
                  role: "system", 
                  content: `You are NEWHOPEGGN, the official AI assistant of this community.
Your Identity: You are helpful, slightly witty, and deeply integrated into this Discord server.
Your Creator: Buzzworthy. ONLY mention him if someone explicitly asks about your creation or who made you.
Server: ${serverName} | Owner: ${owner?.user.username || "Buzzworthy"}.

Tone: ${toneInstruction}

${config.ai.bilingual ? "BILINGUAL MODE ENABLED:\nYou MUST provide your response in BOTH English and Spanish for every single reply.\nUse this EXACT format:\n\n🇺🇸 [English Response]\n\n🇪🇸 [Spanish Response]\n\nDo not use 'English:' or 'Spanish:' labels. Just use the flags." : "Language: Reply in the same language as the user (English or Spanish)."}

STRICT RULES:
1. NEVER mention you are an AI, a bot, a language model, or that you have limitations.
2. NEVER hallucinate other users' messages in your output. Output ONLY your own response.
3. NEVER start your response with your name or any labels like "Assistant:".
4. Keep it concise, friendly, and social.
5. If a user refers to you, you know they are talking to NEWHOPE.` 
                },
                ...history
              ],
              temperature: 0.8
            })
          });
          const aiData = await aiRes.json();
          const reply = aiData.choices?.[0]?.message?.content;
          if (reply) {
            // Broad cleaning of common labels
            let cleanReply = reply.replace(/^(NEWHOPE|Assistant|AI|System|English|Spanish|ESPANOL|ENGLISH|Respuesta):\s*/i, "").trim();
            // Remove user hallucination prefixes
            cleanReply = cleanReply.replace(/^@?[a-zA-Z0-9_]+:\s*/i, "").trim();
            
            await msg.reply(cleanReply);
            
            // Add bot's own reply to history
            history.push({ role: "assistant", content: cleanReply });
            if (history.length > 15) history.shift();
          }
        } catch (err) {
          console.error("[bot] AI conversation error:", err.message);
        }
      })();
    }
  }

  await maybeAutoTranslateTextMessage(msg);

}

// ── Slash command handler ─────────────────────────────────────────────────
client.on("interactionCreate", async (interaction) => {
  if (interaction.isButton()) {
    if (interaction.customId.startsWith("close_ticket_")) {
      try {
        await interaction.deferUpdate();
        const channelId = interaction.customId.replace("close_ticket_", "");
        const res = await fetch(`${SITE_URL}/api/support/ticket/close-by-channel`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channelId,
            closedBy: interaction.user.tag,
            secret: INGEST_SECRET
          })
        });
        const data = await res.json().catch(() => ({}));
        if (data.ok) {
          // Channel will be deleted by the API or we can do it here
          // The API sends a message. Let's also wait 10s and delete here to be sure.
          setTimeout(async () => {
             try { await interaction.channel.delete(); } catch(e) { console.error("[bot] button delete failed:", e.message); }
          }, 10000);
        } else {
          await interaction.followUp({ content: `❌ Failed to close: ${data.error || "Unknown error"}`, ephemeral: true });
        }
      } catch (err) {
        console.error("[bot] Button interaction error:", err);
      }
      return;
    }
  }

  if (!interaction.isChatInputCommand()) return;

  console.log(`[bot] Interaction: /${interaction.commandName} from ${interaction.user?.tag ?? interaction.user?.id}`);

  void logBotActivity("bot_command", `Used /${interaction.commandName}`, interaction.user, {
    command: interaction.commandName,
    guildId: interaction.guildId,
    channelId: interaction.channelId
  });
  void sendLog({
    guild: interaction.guild,
    eventId: "commands",
    color: 0x5865f2,
    title: "Slash Command Used",
    thumbnail: avatarOf(interaction.user),
    fields: [
      { name: "User", value: userTag(interaction.user), inline: true },
      { name: "Command", value: `/${interaction.commandName}`, inline: true },
      { name: "Channel", value: interaction.channelId ? `<#${interaction.channelId}>` : "Unknown", inline: true },
    ],
  });

  try {
    if (interaction.commandName === "vclisten" || interaction.commandName === "vcauto" || interaction.commandName === "vcpermcheck" || interaction.commandName === "autotext") {
      await interaction.deferReply({ ephemeral: true });
    } else if (interaction.commandName === "nhtranslate") {
      await interaction.deferReply({ ephemeral: false });
    }

    if (interaction.commandName === "vclisten" || interaction.commandName === "vcauto" || interaction.commandName === "nhtranslate") {
      const config = await getGuildConfig(interaction.guildId);
      if (config.botNickname && interaction.guild) syncBotNickname(interaction.guild, config.botNickname);
      if (!config.translation?.enabled) {
        return interaction.editReply({
          content: "❌ Translation features are currently disabled for this server. An admin can enable them via the dashboard or by typing `/autotext mode:on`.",
        });
      }
    }

    if (interaction.commandName === "nhnotes") {
      await interaction.deferReply({ ephemeral: false });
      if (!GROQ_API_KEY) return interaction.editReply("❌ AI Summarization is not configured.");
      try {
        const channel = interaction.channel || await client.channels.fetch(interaction.channelId);
        if (!channel || !channel.messages) {
          return interaction.editReply("❌ Could not access message history in this channel. Please ensure the bot has 'Read Message History' permissions.");
        }

        const messages = await channel.messages.fetch({ limit: 50 });
        const transcript = messages
          .reverse()
          .map((m) => `${m.author.username}: ${m.content}`)
          .filter(Boolean)
          .join("\n");
          
        if (transcript.length < 20) return interaction.editReply("Not enough chat history to summarize.");

        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages: [
              { role: "system", content: "You are a helpful AI assistant. Summarize the following chat conversation into a brief, easy-to-read bulleted list of key takeaways. Do not include extra conversational filler." },
              { role: "user", content: transcript.slice(-12000) }
            ],
            temperature: 0.5
          })
        });
        
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          console.error("[bot] Groq API error:", res.status, errData);
          return interaction.editReply(`❌ AI Summarization failed (Groq API Error: ${res.status}). ${errData.error?.message || ""}`);
        }

        const data = await res.json();
        const summary = data.choices?.[0]?.message?.content || "Could not generate a summary.";
        
        const embed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle("📝 Channel Conversation Notes")
          .setDescription(summary)
          .setFooter({ text: "Powered by Groq & Llama 3" });
          
        return interaction.editReply({ content: null, embeds: [embed] });
      } catch (err) {
        console.error("[bot] nhnotes local error:", err);
        return interaction.editReply(`❌ Error generating summary: ${err.message}`);
      }
    }

    if (interaction.commandName === "nhai") {
      await interaction.deferReply({ ephemeral: true });
      const mode = interaction.options.getString("mode");
      const tone = interaction.options.getString("tone");
      const frequency = interaction.options.getString("frequency");
      const targetChannel = interaction.options.getChannel("channel");
      const bilingual = interaction.options.getBoolean("bilingual");
      
      const guildId = interaction.guildId;
      const channelId = targetChannel?.id || interaction.channelId;

      const config = await getGuildConfig(guildId);
      const enabled = mode === "on";
      
      let aiChannels = Array.isArray(config.ai?.channelIds) ? [...config.ai.channelIds] : [];
      if (enabled) {
        if (!aiChannels.includes(channelId)) aiChannels.push(channelId);
      } else {
        aiChannels = aiChannels.filter(id => id !== channelId);
      }

      const nextAi = {
        enabled: aiChannels.length > 0,
        tone: tone || config.ai?.tone || "default",
        frequency: frequency || config.ai?.frequency || "sometimes",
        bilingual: bilingual !== null ? bilingual : (config.ai?.bilingual ?? false),
        channelIds: aiChannels
      };

      setGuildConfigOverride(guildId, { ai: nextAi });

      // Sync to DB
      try {
        await fetch(`${SITE_URL}/api/bot/guild-config`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ 
            secret: INGEST_SECRET, 
            guildId, 
            settings: { ai: nextAi } 
          }),
        });
      } catch (err) {
        console.error("[bot] Failed to sync AI config to DB:", err.message);
      }

      return interaction.editReply({
        content: `✅ AI Conversation updated ${targetChannel ? `for <#${channelId}>` : "for this channel"}.\nMode: **${enabled ? "Enabled" : "Disabled"}** | Tone: **${nextAi.tone}** | Frequency: **${nextAi.frequency}** | Bilingual: **${nextAi.bilingual ? "Yes" : "No"}**`,
      });
    }




    if (interaction.commandName === "autotext") {
      const memberPerms = interaction.memberPermissions;
      const canManage =
        memberPerms?.has(PermissionsBitField.Flags.ManageGuild) ||
        memberPerms?.has(PermissionsBitField.Flags.Administrator);
      if (!canManage) {
        return interaction.editReply({ content: "❌ You need `Manage Server` or `Administrator` to change auto text translation." });
      }

      const mode = interaction.options.getString("mode", true);
      const language = (interaction.options.getString("language") || "auto").toLowerCase();
      const channel = interaction.options.getChannel("channel");
      const botMessages = interaction.options.getString("bot_messages");
      const enabled = mode === "on";
      const existingConfig = await getGuildConfig(interaction.guildId);
      const existingChannelIds = Array.isArray(existingConfig.translation?.channelIds)
        ? existingConfig.translation.channelIds.filter(Boolean)
        : [];
      const includeBotMessages =
        botMessages === "on"
          ? true
          : botMessages === "off"
            ? false
            : Boolean(existingConfig.translation?.includeBotMessages);
      let channelIds = existingChannelIds;

      if (channel?.id) {
        if (enabled) {
          channelIds = Array.from(new Set([...existingChannelIds, channel.id]));
        } else {
          channelIds = existingChannelIds.filter((id) => id !== channel.id);
        }
      } else if (!enabled) {
        channelIds = [];
      }

      const patch = {
        translation: {
          enabled,
          targetLang: language,
          channelIds,
          includeBotMessages,
        },
      };

      setGuildConfigOverride(interaction.guildId, patch);

      let persisted = true;
      let persistError = "";
      try {
        await updateGuildConfigFromBot(interaction.guildId, patch);
      } catch (error) {
        persisted = false;
        persistError = error?.message || "Config sync failed";
        console.error("[bot] autotext config sync failed:", persistError);
      }

      void sendLog({
        guild: interaction.guild,
        eventId: "commands",
        color: enabled ? 0x22c55e : 0x64748b,
        title: "Auto Text Translation Updated",
        fields: [
          { name: "Admin", value: userTag(interaction.user), inline: true },
          { name: "Mode", value: enabled ? "Enabled" : "Disabled", inline: true },
          { name: "Language", value: language, inline: true },
          { name: "Scope", value: channel?.id ? `<#${channel.id}>` : (channelIds.length ? `${channelIds.length} selected channels` : "All text channels"), inline: true },
          { name: "Bot messages", value: includeBotMessages ? "Included" : "Ignored", inline: true },
          { name: "Saved", value: persisted ? "Panel and bot synced" : "Bot live now, panel sync failed", inline: false },
        ],
      });

      const statusLine = persisted
        ? "Saved to the dashboard and applied live."
        : `Applied live on the bot, but website sync failed: ${persistError}`;
      return interaction.editReply({
        content: `✅ Auto text translation is now **${enabled ? "enabled" : "disabled"}** for **${interaction.guild?.name || "this server"}**.\nTarget language: **${language}**\nScope: **${channel?.name ? `#${channel.name}` : (channelIds.length ? `${channelIds.length} selected channels` : "all text channels")}**\nBot and webhook messages: **${includeBotMessages ? "included" : "ignored"}**\n${statusLine}`,
      });
    }

    if (interaction.commandName === "nhpremium") {
      return interaction.reply(premiumUpgradePayload("NewHopeGGN Premium", interaction.guildId));
    }

    // /vclisten
  if (interaction.commandName === "vclisten" || interaction.commandName === "vcauto") {
    if (!(await canUsePremiumFeature(interaction.guildId, "liveVoice"))) {
      const payload = premiumUpgradePayload("live voice translation", interaction.guildId);
      return interaction.editReply({ embeds: payload.embeds, components: payload.components });
    }

    const member = interaction.member;
    const voiceChannel = member?.voice?.channel;
    if (!voiceChannel) {
      return interaction.editReply({ content: "You must be in a voice channel first!" });
    }
    if (!hasAnyVoiceBackend()) {
      return interaction.editReply({ content: "No voice STT backend is configured on the bot yet. Set `DEEPGRAM_API_KEY` or `LOCAL_STT_WORKER_URL`." });
    }

    const targetLang = interaction.commandName === "vcauto"
      ? VC_AUTO_LANG
      : (interaction.options.getString("translate_to") ?? VC_TARGET_LANG);
    const guildId = interaction.guildId;

    const botMember = interaction.guild.members.me ?? await interaction.guild.members.fetch(interaction.client.user.id);
    const perms = voiceChannel.permissionsFor(botMember);
    const requiredPerms = [
      PermissionsBitField.Flags.ViewChannel,
      PermissionsBitField.Flags.Connect,
      PermissionsBitField.Flags.Speak,
    ];

    if (!perms) {
      return interaction.editReply({
        content: "I cannot inspect my permissions in that voice channel right now. Please make sure the bot can see the channel and try again.",
      });
    }

    const missingPerms = perms.missing(requiredPerms);
    if (missingPerms.length > 0) {
      return interaction.editReply({
        content: `I am missing permissions in **${voiceChannel.name}**: ${missingPerms.join(", ")}.\nI need View Channel, Connect, and Speak to listen there.`, 
      });

    }
    stopVoiceSession(guildId);

    try {
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId,
        adapterCreator: interaction.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false,
      });

      const voiceSession = await startVoiceListening(connection, interaction.guild, targetLang, voiceChannel, interaction.channel);
      activeListeners.set(guildId, {
        connection,
        cleanups: voiceSession.cleanups,
        startListenerForUser: voiceSession.startListenerForUser,
        guildName: interaction.guild.name,
        voiceChannelId: voiceChannel.id,
        voiceChannelName: voiceChannel.name,
        outputChannelId: interaction.channelId ?? null,
        outputChannelName: interaction.channel?.name ?? "Current channel",
        requesterId: interaction.user.id,
        targetLang,
        startedAt: new Date().toISOString(),
        connectionState: connection.state.status,
      });
      void publishSystemStatus("voice-listen-start");

      const LANG_NAMES = { en: "English", es: "Spanish", pt: "Portuguese", fr: "French", de: "German", ru: "Russian", zh: "Chinese", ja: "Japanese" };
      const startedLabel = interaction.commandName === "vcauto" ? "Now auto-translating" : "Now listening";
      return interaction.editReply({
        content: `Voice translation started in **${voiceChannel.name}** and will post in **${interaction.channel?.name ?? "this channel"}**${STAFF_VOICE_WEBHOOK ? " and Staff-Voice" : ""}.\nRun /vcstop to stop.`
      });
    } catch (e) {
      console.error("[bot] /vclisten join error:", e);
      return interaction.editReply({ content: `Failed to join voice channel: ${e.message}` });
    }
  }

    // -- /vcpermcheck --
  if (interaction.commandName === "vcpermcheck") {
    const member = interaction.member;
    const requestedChannel = interaction.options.getChannel("channel");
    const voiceChannel = requestedChannel ?? member?.voice?.channel;
    if (!voiceChannel) {
      return interaction.editReply({
        content: "❌ Join a voice channel first, or pass one into `/vcpermcheck channel:`.",
      });
    }

    if (voiceChannel.type !== ChannelType.GuildVoice && voiceChannel.type !== ChannelType.GuildStageVoice) {
      return interaction.editReply({
        content: "❌ That channel is not a voice or stage channel. Pick a voice channel instead.",
      });
    }

    const botMember = interaction.guild.members.me ?? await interaction.guild.members.fetch(interaction.client.user.id);
    const perms = voiceChannel.permissionsFor(botMember);
    const requiredPerms = [
      PermissionsBitField.Flags.ViewChannel,
      PermissionsBitField.Flags.Connect,
      PermissionsBitField.Flags.Speak,
    ];

    if (!perms) {
      return interaction.editReply({
        content: `❌ I could not inspect permissions for **${voiceChannel.name}**.`,
      });
    }

    const lines = [
      `Voice channel: **${voiceChannel.name}**`,
      `Bot can view: ${perms.has(PermissionsBitField.Flags.ViewChannel) ? "yes" : "no"}`,
      `Bot can connect: ${perms.has(PermissionsBitField.Flags.Connect) ? "yes" : "no"}`,
      `Bot can speak: ${perms.has(PermissionsBitField.Flags.Speak) ? "yes" : "no"}`,
      `Bot has administrator: ${perms.has(PermissionsBitField.Flags.Administrator) ? "yes" : "no"}`,
    ];

    const missingPerms = perms.missing(requiredPerms);
    if (missingPerms.length > 0) {
      lines.push(`Missing required perms: ${missingPerms.map((perm) => `\`${perm}\``).join(", ")}`);
    } else {
      lines.push("Required voice permissions: all present");
    }

      return interaction.editReply({ content: lines.join("\n") });
    }

    if (interaction.commandName === "vcstop") {
      const guildId = interaction.guildId;
      stopVoiceSession(guildId);
      return interaction.reply({ content: "🔇 Stopped listening and left the voice channel.", ephemeral: true });
    }

    if (interaction.commandName !== "nhtranslate") return;
    if (!(await canUsePremiumFeature(interaction.guildId, "textTranslate"))) {
      const payload = premiumUpgradePayload("text translation", interaction.guildId);
      return interaction.editReply({ embeds: payload.embeds, components: payload.components });
    }

  const text = interaction.options.getString("text", true);
  const targetLang = (interaction.options.getString("to") ?? TRANSLATE_TARGET).toLowerCase().trim();
  const shouldSpeak = interaction.options.getBoolean("speak") ?? false;

    try {
      const { translated } = await translateText(text, targetLang);

    const LANG_NAMES = {
      en: "🇺🇸 English", es: "🇪🇸 Spanish", fr: "🇫🇷 French", pt: "🇵🇹 Portuguese",
      de: "🇩🇪 German",  it: "🇮🇹 Italian",  ar: "🇸🇦 Arabic",  zh: "🇨🇳 Chinese",
      ru: "🇷🇺 Russian", ja: "🇯🇵 Japanese", ko: "🇰🇷 Korean",  nl: "🇳🇱 Dutch",
      pl: "🇵🇱 Polish",  tr: "🇹🇷 Turkish",  hi: "🇮🇳 Hindi",
    };
    const targetName = LANG_NAMES[targetLang] ?? targetLang.toUpperCase();

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setAuthor({ name: `${interaction.user.displayName ?? interaction.user.username} — Translation`, iconURL: interaction.user.displayAvatarURL({ size: 64 }) })
      .addFields(
        { name: "📝 Original",          value: text.slice(0, 1024) },
        { name: `🌐 → ${targetName}`,   value: (translated ?? "*(no result)*").slice(0, 1024) },
      )
      .setFooter({ text: "NewHopeGGN Translate • Powered by MyMemory", iconURL: BOT_AVATAR })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    if (shouldSpeak) {
      if (!(await canUsePremiumFeature(interaction.guildId, "spokenVoice"))) {
        const payload = premiumUpgradePayload("voice-channel translated speech");
        return interaction.followUp({ embeds: payload.embeds, components: payload.components, ephemeral: true });
      }

      try {
        await speakInVoiceChannel(interaction, translated);
        await interaction.followUp({ content: `Spoken in your voice channel: **${targetName}**`, ephemeral: true });
      } catch (speakError) {
        console.error("[bot] voice speak error:", speakError?.message ?? speakError);
        await interaction.followUp({ content: `I translated it, but could not speak in VC: ${speakError?.message ?? "Unknown error"}`, ephemeral: true });
      }
    }

    // Also post to Staff Voice webhook if configured
    if (STAFF_VOICE_WEBHOOK) {
      try {
        await fetch(STAFF_VOICE_WEBHOOK, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            username: "NewHopeGGN Translate",
            avatar_url: BOT_AVATAR,
            embeds: [{
              color: 0x5865f2,
              author: {
                name: `${interaction.user.displayName ?? interaction.user.username} — Translation`,
                icon_url: interaction.user.displayAvatarURL({ size: 64 }),
              },
              fields: [
                { name: "📝 Original",        value: text.slice(0, 1024) },
                { name: `🌐 → ${targetName}`, value: (translated ?? "*(no result)*").slice(0, 1024) },
                { name: "Channel",            value: `<#${interaction.channelId}>`, inline: true },
              ],
              footer: { text: "NewHopeGGN Translate • Staff Voice Log", icon_url: BOT_AVATAR },
              timestamp: new Date().toISOString(),
            }],
          }),
        });
      } catch (webhookErr) {
        console.error("[bot] Staff voice webhook error:", webhookErr.message);
      }
    }
    } catch (e) {
      console.error("[bot] Translation error:", e.message);
      await interaction.editReply({ content: `❌ Translation failed: ${e.message}` });
    }
  } catch (e) {
    console.error("[bot] interactionCreate error:", e);
    if (interaction.deferred || interaction.replied) {
      const message = e?.message ?? "Unknown error";
      try {
        await interaction.editReply({ content: `❌ Command failed: ${message}` });
      } catch {
        // ignore follow-up failures
      }
    } else {
      try {
        await interaction.reply({ content: `❌ Command failed: ${e?.message ?? "Unknown error"}`, ephemeral: true });
      } catch {
        // ignore reply failures
      }
    }
  }
});

// Catch new messages
client.on("messageCreate", (msg) => { void relayMessage(msg); });

// ── Message Update — relay embed additions + log content edits ─────────────
client.on("messageUpdate", (oldMsg, newMsg) => {
  // Relay new embeds added by Discord (Tenor/Giphy etc)
  const hadEmbeds = (oldMsg.embeds?.length ?? 0) > 0;
  const hasEmbeds = (newMsg.embeds?.length ?? 0) > 0;
  if (!hadEmbeds && hasEmbeds) {
    console.log(`[bot] Embed update detected for msg ${newMsg.id}`);
    void relayMessage(newMsg);
  }

  // Log actual content edits
  const oldContent = oldMsg.content?.trim();
  const newContent = newMsg.content?.trim();
  if (!oldContent || !newContent || oldContent === newContent) return;
  if (newMsg.author?.bot) return;

  void sendLog({
    guild: newMsg.guild,
    eventId: "commands",
    color: 0xf59e0b,
    title: "✏️  Message Edited",
    thumbnail: avatarOf(newMsg.author),
    fields: [
      { name: "Author",  value: userTag(newMsg.author), inline: true },
      { name: "Channel", value: `<#${newMsg.channelId}>`, inline: true },
      { name: "Before",  value: oldContent.slice(0, 1024) || "*(empty)*" },
      { name: "After",   value: newContent.slice(0, 1024) || "*(empty)*" },
      { name: "Jump",    value: `[View Message](${newMsg.url})`, inline: true },
    ],
  });
});

// ── Message Delete ─────────────────────────────────────────────────────────
client.on("messageDelete", async (msg) => {
  if (msg.author?.bot) return;
  const content = msg.content?.trim() || "*(no text content)*";

  // Try to find who deleted it from audit log
  const mod = msg.guild
    ? await getAuditMod(msg.guild, AuditLogEvent.MessageDelete, msg.author?.id)
    : null;

  void sendLog({
    guild: msg.guild,
    eventId: "commands",
    color: 0xef4444,
    title: "🗑️  Message Deleted",
    thumbnail: avatarOf(msg.author),
    fields: [
      { name: "Author",   value: userTag(msg.author), inline: true },
      { name: "Channel",  value: `<#${msg.channelId}>`, inline: true },
      { name: "Deleted by", value: mod ? userTag(mod) : "Author / Unknown", inline: true },
      { name: "Content",  value: content.slice(0, 1024) },
    ],
  });
});

// ── Message Bulk Delete ────────────────────────────────────────────────────
client.on("messageDeleteBulk", async (messages, channel) => {
  const mod = channel.guild
    ? await getAuditMod(channel.guild, AuditLogEvent.MessageBulkDelete, channel.id)
    : null;

  void sendLog({
    guild: channel.guild,
    eventId: "commands",
    color: 0xef4444,
    title: "🗑️  Bulk Messages Deleted",
    fields: [
      { name: "Channel",  value: `<#${channel.id}>`, inline: true },
      { name: "Count",    value: `${messages.size} messages`, inline: true },
      { name: "Deleted by", value: mod ? userTag(mod) : "Unknown", inline: true },
    ],
  });
});

// ── Ban ────────────────────────────────────────────────────────────────────
client.on("guildCreate", async (guild) => {
  const owner = await guild.fetchOwner().catch(() => null);
  const premium = await canUsePremiumFeature(guild.id, "liveVoice");

  void sendLog({
    guild,
    eventId: "errors",
    color: premium ? 0x22c55e : 0x5865f2,
    title: "NewHopeGGN Added to Server",
    description: premium
      ? "A premium-enabled Discord server added the bot."
      : "A new Discord server added the bot. Voice premium features remain locked until this guild is allowlisted.",
    thumbnail: guildIconOf(guild),
    fields: [
      { name: "Server", value: guild.name || "Unknown", inline: true },
      { name: "Guild ID", value: guild.id, inline: true },
      { name: "Premium Access", value: premium ? "Enabled" : "Locked", inline: true },
      { name: "Owner", value: owner?.user ? userTag(owner.user) : "Unknown", inline: true },
      { name: "Members", value: `${guild.memberCount ?? "Unknown"}`, inline: true },
      { name: "Created", value: guild.createdAt ? guild.createdAt.toUTCString() : "Unknown", inline: false },
      { name: "Next Step", value: `Use \`PREMIUM_GUILD_IDS=${guild.id}\` to unlock paid voice features for this server.` },
    ],
    footer: "NewHopeGGN Bot Install Log",
  });
});

client.on("guildDelete", async (guild) => {
  const premium = await canUsePremiumFeature(guild.id, "liveVoice");
  void sendLog({
    guild,
    eventId: "errors",
    color: 0xef4444,
    title: "NewHopeGGN Removed from Server",
    description: "The bot was removed from a Discord server or lost access to it.",
    thumbnail: guildIconOf(guild),
    fields: [
      { name: "Server", value: guild.name || "Unknown", inline: true },
      { name: "Guild ID", value: guild.id, inline: true },
      { name: "Premium Access", value: premium ? "Was enabled" : "Was locked", inline: true },
      { name: "Members", value: `${guild.memberCount ?? "Unknown"}`, inline: true },
    ],
    footer: "NewHopeGGN Bot Install Log",
  });
});

client.on("guildBanAdd", async (ban) => {
  const mod = await getAuditMod(ban.guild, AuditLogEvent.MemberBanAdd, ban.user.id);

  void sendLog({
    guild: ban.guild,
    eventId: "bans",
    color: 0xdc2626,
    title: "🔨  Member Banned",
    thumbnail: avatarOf(ban.user),
    fields: [
      { name: "User",    value: userTag(ban.user), inline: true },
      { name: "User ID", value: ban.user.id,       inline: true },
      { name: "Banned by", value: mod ? userTag(mod) : "Unknown", inline: true },
      { name: "Reason",  value: ban.reason || "No reason provided" },
    ],
  });
});

// ── Unban ──────────────────────────────────────────────────────────────────
client.on("guildBanRemove", async (ban) => {
  const mod = await getAuditMod(ban.guild, AuditLogEvent.MemberBanRemove, ban.user.id);

  void sendLog({
    guild: ban.guild,
    eventId: "bans",
    color: 0x22c55e,
    title: "✅  Member Unbanned",
    thumbnail: avatarOf(ban.user),
    fields: [
      { name: "User",      value: userTag(ban.user), inline: true },
      { name: "User ID",   value: ban.user.id,       inline: true },
      { name: "Unbanned by", value: mod ? userTag(mod) : "Unknown", inline: true },
    ],
  });
});

// ── Member Join ────────────────────────────────────────────────────────────
client.on("guildMemberAdd", (member) => {
  const accountAge = Math.floor((Date.now() - member.user.createdTimestamp) / 86400000);

  void sendLog({
    guild: member.guild,
    eventId: "joins",
    color: 0x3b82f6,
    title: "📥  Member Joined",
    thumbnail: avatarOf(member.user),
    fields: [
      { name: "User",         value: userTag(member.user), inline: true },
      { name: "User ID",      value: member.id,            inline: true },
      { name: "Account Age",  value: `${accountAge} day${accountAge === 1 ? "" : "s"}`, inline: true },
      { name: "Member Count", value: `${member.guild.memberCount}`, inline: true },
    ],
    footer: `Joined at ${new Date().toUTCString()}`,
  });
});

// ── Member Leave ───────────────────────────────────────────────────────────
client.on("guildMemberRemove", async (member) => {
  // Check if this was a kick
  const mod = await getAuditMod(member.guild, AuditLogEvent.MemberKick, member.id);

  const roles = member.roles.cache
    .filter(r => r.id !== member.guild.id)
    .map(r => r.name)
    .join(", ") || "None";

  void sendLog({
    guild: member.guild,
    eventId: "leaves",
    color: mod ? 0xf97316 : 0x64748b,
    title: mod ? "👢  Member Kicked" : "📤  Member Left",
    thumbnail: avatarOf(member.user),
    fields: [
      { name: "User",    value: userTag(member.user), inline: true },
      { name: "User ID", value: member.id,            inline: true },
      ...(mod ? [{ name: "Kicked by", value: userTag(mod), inline: true }] : []),
      { name: "Roles",   value: roles.slice(0, 1024) },
    ],
  });
});

// ── Member Update (roles / nickname) ──────────────────────────────────────
client.on("guildMemberUpdate", async (oldMember, newMember) => {
  const changes = [];

  // Nickname change
  if (oldMember.nickname !== newMember.nickname) {
    changes.push({
      name: "Nickname Changed",
      value: `**Before:** ${oldMember.nickname || "*None*"}\n**After:** ${newMember.nickname || "*None*"}`,
    });
  }

  // Role changes
  const added   = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id) && r.id !== newMember.guild.id);
  const removed = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id) && r.id !== newMember.guild.id);
  if (added.size)   changes.push({ name: "✅ Roles Added",   value: added.map(r => r.name).join(", ") });
  if (removed.size) changes.push({ name: "❌ Roles Removed", value: removed.map(r => r.name).join(", ") });

  if (!changes.length) return;

  const mod = await getAuditMod(newMember.guild, AuditLogEvent.MemberUpdate, newMember.id)
           ?? await getAuditMod(newMember.guild, AuditLogEvent.MemberRoleUpdate, newMember.id);

  void sendLog({
    guild: newMember.guild,
    eventId: "commands",
    color: 0xa855f7,
    title: "🔧  Member Updated",
    thumbnail: avatarOf(newMember.user),
    fields: [
      { name: "User",       value: userTag(newMember.user), inline: true },
      { name: "Updated by", value: mod ? userTag(mod) : "Unknown / Self", inline: true },
      ...changes,
    ],
  });
});

// ── Timeout (mute via communication disabled) ──────────────────────────────
client.on("guildMemberUpdate", async (oldMember, newMember) => {
  const wasTimedOut = !!oldMember.communicationDisabledUntilTimestamp;
  const isTimedOut  = !!newMember.communicationDisabledUntilTimestamp;
  if (wasTimedOut === isTimedOut) return;

  const mod = await getAuditMod(newMember.guild, AuditLogEvent.MemberUpdate, newMember.id);

  if (isTimedOut) {
    const until = new Date(newMember.communicationDisabledUntilTimestamp);
    void sendLog({
      guild: newMember.guild,
      eventId: "commands",
      color: 0xf97316,
      title: "🔇  Member Timed Out",
      thumbnail: avatarOf(newMember.user),
      fields: [
        { name: "User",       value: userTag(newMember.user), inline: true },
        { name: "Timed out by", value: mod ? userTag(mod) : "Unknown", inline: true },
        { name: "Until",      value: until.toUTCString(), inline: false },
      ],
    });
  } else {
    void sendLog({
      guild: newMember.guild,
      eventId: "commands",
      color: 0x22c55e,
      title: "🔊  Timeout Removed",
      thumbnail: avatarOf(newMember.user),
      fields: [
        { name: "User",         value: userTag(newMember.user), inline: true },
        { name: "Removed by",   value: mod ? userTag(mod) : "Unknown", inline: true },
      ],
    });
  }
});

// Error handlers to prevent crashes
process.on("uncaughtException", (err) => {
  console.error("[bot] Uncaught Exception:", err.message);
  // Don't exit — keep running
});
process.on("unhandledRejection", (reason) => {
  console.error("[bot] Unhandled Rejection:", reason);
  // Don't exit — keep running
});

client.on("error", (err) => {
  console.error("[bot] Discord client error:", err.message);
});

console.log("[bot] Attempting to login to Discord...");

client.login(BOT_TOKEN).catch((err) => {
  console.error("[bot] Login failed:", err.message);
  process.exit(1);
});



