/**
 * NewHopeGGN Discord Bot
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
 *   BOT_TOKEN, SITE_URL, INGEST_SECRET, GUILD_ID, LOG_CHANNEL_ID
 */

process.stderr.write("[bot] Starting...\n");

require("dotenv").config();
try {
  require("@snazzah/davey");
  console.log("[bot] DAVE support library loaded");
} catch (error) {
  console.log("[bot] DAVE support library not loaded:", error.message);
}
const { Client, GatewayIntentBits, ChannelType, PermissionsBitField, EmbedBuilder, AuditLogEvent, REST, Routes, SlashCommandBuilder } = require("discord.js");
const { joinVoiceChannel, getVoiceConnection, EndBehaviorType, VoiceConnectionStatus, entersState } = require("@discordjs/voice");
const { createClient: createDeepgramClient, LiveTranscriptionEvents } = require("@deepgram/sdk");
const prism = require("prism-media");
const sodium = require("libsodium-wrappers");
// libsodium-wrappers initializes lazily when needed

// ── Config ────────────────────────────────────────────────────────────────────
const BOT_TOKEN      = process.env.BOT_TOKEN;
const SITE_URL       = process.env.SITE_URL       || "https://newhopeggn.vercel.app";
const INGEST_SECRET  = process.env.INGEST_SECRET || process.env.DISCORD_INGEST_SECRET || "newhopeggn-bot-secret";
const GUILD_ID       = process.env.GUILD_ID       || "1419522458075005023";
const LOG_CHANNEL_ID       = process.env.LOG_CHANNEL_ID || "";
const TRANSLATE_TARGET     = process.env.TRANSLATE_TARGET_LANG || "en";
const STAFF_VOICE_WEBHOOK  = process.env.STAFF_VOICE_WEBHOOK || "https://discord.com/api/webhooks/1495921032996065371/26WHqlDgpGOu4-Vau922YxmCWLmbo1VSdF_6E8I-CTQi87vtLIfcekLk0TnHh4pOCyeC";
const DEEPGRAM_API_KEY     = process.env.DEEPGRAM_API_KEY || "";
const VC_TARGET_LANG       = process.env.VC_TARGET_LANG || "en";
const VOICE_CONTROL_PREFIX = "[NH-CONTROL]";
const TRANSLATION_PROVIDER = (process.env.TRANSLATION_PROVIDER || "google").toLowerCase();
const VC_AUTO_LANG = "auto";
const TRANSLATION_COOLDOWN_MS = 3500;
const TRANSLATION_429_BACKOFF_MS = 15_000;
const translatedTranscriptCache = new Map();
const translationBackoffUntil = new Map();
let globalTranslationBackoffUntil = 0;

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
function getLogChannel() {
  if (!LOG_CHANNEL_ID) return null;
  return client.channels.cache.get(LOG_CHANNEL_ID) ?? null;
}

/**
 * Send a rich embed to the log channel.
 * @param {object} opts - { color, title, description, fields, thumbnail, footer }
 */
async function sendLog(opts) {
  const ch = getLogChannel();
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
  .setDescription("Quick-start live voice translation to English")
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

const translateCommand = new SlashCommandBuilder()
  .setName("nhtranslate")
  .setDescription("Translate text to another language (auto-detects source)")
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
  .toJSON();

async function registerSlashCommands() {
  try {
    const rest = new REST({ version: "10" }).setToken(BOT_TOKEN);
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, GUILD_ID),
      { body: [translateCommand, vcListenCommand, vcAutoCommand, vcStopCommand, vcPermCheckCommand] },
    );
    console.log("[bot] Slash commands registered.");
  } catch (e) {
    console.error("[bot] Failed to register slash commands:", e.message);
  }
}

// ── Voice listen helpers ───────────────────────────────────────
const activeListeners = new Map(); // guildId -> { connection, cleanups[], metadata }
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
  void publishSystemStatus("voice-stop");
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
    },
    deepgram: {
      configured: Boolean(DEEPGRAM_API_KEY),
      activeSessions: activeListenersCount,
    },
    voice: {
      activeListeners: activeListenersCount,
      connections,
    },
    notes: connections.length === 0 ? ["No active voice listeners right now."] : [],
    lastError: lastStatusError,
  };
}

async function publishSystemStatus(reason = "heartbeat") {
  if (!SITE_URL) return;
  try {
    const res = await fetch(`${SITE_URL}/api/admin/bot-status`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        secret: INGEST_SECRET,
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

async function postToStaffVoice(username, avatarUrl, original, translated, targetLang) {
  if (!STAFF_VOICE_WEBHOOK) return;
  const LANG_FLAGS = {
    en: "🇺🇸", es: "🇪🇸", pt: "🇵🇹", fr: "🇫🇷",
    de: "🇩🇪", ru: "🇷🇺", zh: "🇨🇳", ja: "🇯🇵",
  };
  const flag = LANG_FLAGS[targetLang] ?? "🌐";
  await fetch(STAFF_VOICE_WEBHOOK, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      username: "NewHopeGGN Voice",
      avatar_url: avatarUrl || BOT_AVATAR,
      embeds: [{
        color: 0x7c3aed,
        author: { name: `🎤 ${username} (voice)`, icon_url: avatarUrl || BOT_AVATAR },
        fields: [
          { name: "📝 Said",                   value: original.slice(0, 1024) },
          { name: `${flag} Translation`,      value: translated.slice(0, 1024) },
        ],
        footer: { text: "NewHopeGGN Live Voice Translate", icon_url: BOT_AVATAR },
        timestamp: new Date().toISOString(),
      }],
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

async function startListeningToUser(connection, userId, member, targetLang, onEnded = null) {
  if (!DEEPGRAM_API_KEY) {
    console.error("[voice] DEEPGRAM_API_KEY not set");
    return null;
  }

  const receiver = connection.receiver;
  const deepgram = createDeepgramClient(DEEPGRAM_API_KEY);

  let audioStream = null;
  let opusDecoder = null;
  let dgLive = null;
  let fullTranscript = "";
  let deepgramReady = false;
  let deepgramOpening = false;
  let sawOpusChunk = false;
  let sawAudioChunk = false;
  let finished = false;
  let pendingTranscript = "";
  let pendingTranscriptAt = 0;
  let pendingSourceLang = "en";

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
      await postToStaffVoice(username, avatarUrl, transcript, translated, outputLang);
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
        await postToStaffVoice(username, avatarUrl, transcript, transcript, outputLang);
      }
    }
  };

  const openDeepgramStream = (reason = "reopen") => {
    if (finished || deepgramReady || deepgramOpening) return;
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
    audioStream = receiver.subscribe(userId, {
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
  opusDecoder.on("error", (e) => {
    console.error("[voice] Opus decoder error:", e.message);
    finalize("decoder-error");
  });

  audioStream.pipe(opusDecoder);

  return () => {
    finalize("cleanup");
  };
}

async function startVoiceListening(connection, guild, targetLang, voiceChannel = null) {
  const receiver = connection.receiver;
  const cleanups = [];
  const startingListeners = new Set();

  const startListenerForUser = async (userId) => {
    if (cleanups[userId] || startingListeners.has(userId)) return;
    startingListeners.add(userId);
    const member = guild.members.cache.get(userId) ?? await guild.members.fetch(userId).catch(() => null);
    try {
      if (member?.user?.bot) return;
      console.log(`[voice] Starting listener for ${member?.displayName ?? userId}`);
      const cleanup = await startListeningToUser(connection, userId, member, targetLang, (reason) => {
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

  if (voiceChannel?.members?.size) {
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
  if (!DEEPGRAM_API_KEY) {
    await replyChannel.send("❌ `DEEPGRAM_API_KEY` is not set on the bot. Add it to Fly.io secrets.");
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
    const voiceSession = await startVoiceListening(connection, guild, effectiveTargetLang, voiceChannel);
    activeListeners.set(guild.id, {
      connection,
      cleanups: voiceSession.cleanups,
      startListenerForUser: voiceSession.startListenerForUser,
      guildName: guild.name,
      voiceChannelId: voiceChannel.id,
      voiceChannelName: voiceChannel.name,
      requesterId,
      targetLang: effectiveTargetLang,
      startedAt: new Date().toISOString(),
      connectionState: connection.state.status,
    });
    void publishSystemStatus("voice-listen-start");

    const LANG_NAMES = { en: "🇺🇸 English", es: "🇪🇸 Spanish", pt: "🇵🇹 Portuguese", fr: "🇫🇷 French", de: "🇩🇪 German", ru: "🇷🇺 Russian", zh: "🇨🇳 Chinese", ja: "🇯🇵 Japanese" };
    await replyChannel.send(
      `🎤 Now listening in **${voiceChannel.name}** — translating to **${autoMode ? "Auto EN ↔ ES" : (LANG_NAMES[targetLang] ?? targetLang)}**. Results post to Staff-Voice.\nRun \`/vcstop\` to stop.`
    );
  } catch (error) {
    console.error("[bot] /vclisten join error:", error);
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

client.once("ready", async () => {
  console.log(`[bot] Logged in as ${client.user.tag}`);
  console.log(`[bot] Relaying to: ${SITE_URL}/api/discord/ingest`);

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

      if (payload?.action === "vcstop" && payload.guildId) {
        stopVoiceSession(msg.guild.id);
        await replyChannel.send("🔇 Stopped listening and left the voice channel.");
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
}

// ── Slash command handler ─────────────────────────────────────────────────
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  console.log(`[bot] Interaction: /${interaction.commandName} from ${interaction.user?.tag ?? interaction.user?.id}`);

  try {
    if (interaction.commandName === "vclisten" || interaction.commandName === "vcauto" || interaction.commandName === "vcpermcheck") {
      await interaction.deferReply({ ephemeral: true });
    } else if (interaction.commandName === "nhtranslate") {
      await interaction.deferReply({ ephemeral: false });
    }

    // ── /vclisten ──
  if (interaction.commandName === "vclisten" || interaction.commandName === "vcauto") {
    const member = interaction.member;
    const voiceChannel = member?.voice?.channel;
    if (!voiceChannel) {
      return interaction.editReply({ content: "❌ You must be in a voice channel first!" });
    }
    if (!DEEPGRAM_API_KEY) {
      return interaction.editReply({ content: "❌ `DEEPGRAM_API_KEY` is not set on the bot. Add it to Fly.io secrets." });
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
        content: "? I cannot inspect my permissions in that voice channel right now. Please make sure the bot can see the channel and try again.",
      });
    }

    const missingPerms = perms.missing(requiredPerms);
    if (missingPerms.length > 0) {
      return interaction.editReply({
        content: `? I am missing permissions in **${voiceChannel.name}**: ${missingPerms.map((perm) => `\`${perm}\``).join(", ")}.
I need \`View Channel\`, \`Connect\`, and \`Speak\` to listen there.`,
      });
    }
    stopVoiceSession(guildId);

    try {
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId,
        adapterCreator: interaction.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: true,
      });

      const voiceSession = await startVoiceListening(connection, interaction.guild, targetLang, voiceChannel);
      activeListeners.set(guildId, {
        connection,
        cleanups: voiceSession.cleanups,
        startListenerForUser: voiceSession.startListenerForUser,
        guildName: interaction.guild.name,
        voiceChannelId: voiceChannel.id,
        voiceChannelName: voiceChannel.name,
        requesterId: interaction.user.id,
        targetLang,
        startedAt: new Date().toISOString(),
        connectionState: connection.state.status,
      });
      void publishSystemStatus("voice-listen-start");

      const LANG_NAMES = { en: "🇺🇸 English", es: "🇪🇸 Spanish", pt: "🇵🇹 Portuguese", fr: "🇫🇷 French", de: "🇩🇪 German", ru: "🇷🇺 Russian", zh: "🇨🇳 Chinese", ja: "🇯🇵 Japanese" };
      const startedLabel = interaction.commandName === "vcauto" ? "Now auto-translating" : "Now listening";
      return interaction.editReply({
        content: `🎤 ${startedLabel} in **${voiceChannel.name}** — translating to **${targetLang === VC_AUTO_LANG ? "Auto EN ↔ ES" : (LANG_NAMES[targetLang] ?? targetLang)}**. Results post to Staff-Voice.\nRun \`/vcstop\` to stop.`
      });
      } catch (e) {
        console.error("[bot] /vclisten join error:", e);
        return interaction.editReply({ content: `❌ Failed to join voice channel: ${e.message}` });
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

  const text = interaction.options.getString("text", true);
  const targetLang = (interaction.options.getString("to") ?? TRANSLATE_TARGET).toLowerCase().trim();

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
client.on("guildBanAdd", async (ban) => {
  const mod = await getAuditMod(ban.guild, AuditLogEvent.MemberBanAdd, ban.user.id);

  void sendLog({
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

