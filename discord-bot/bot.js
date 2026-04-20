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
const { Client, GatewayIntentBits, EmbedBuilder, AuditLogEvent, REST, Routes, SlashCommandBuilder } = require("discord.js");
const { joinVoiceChannel, getVoiceConnection, EndBehaviorType } = require("@discordjs/voice");
const { createClient: createDeepgramClient } = require("@deepgram/sdk");
const { pipeline } = require("stream");

// ── Config ────────────────────────────────────────────────────────────────────
const BOT_TOKEN      = process.env.BOT_TOKEN;
const SITE_URL       = process.env.SITE_URL       || "https://newhopeggn.vercel.app";
const INGEST_SECRET  = process.env.INGEST_SECRET  || "newhopeggn-bot-secret";
const GUILD_ID       = process.env.GUILD_ID       || "1419522458075005023";
const LOG_CHANNEL_ID       = process.env.LOG_CHANNEL_ID || "";
const TRANSLATE_TARGET     = process.env.TRANSLATE_TARGET_LANG || "en";
const STAFF_VOICE_WEBHOOK  = process.env.STAFF_VOICE_WEBHOOK || "https://discord.com/api/webhooks/1495921032996065371/26WHqlDgpGOu4-Vau922YxmCWLmbo1VSdF_6E8I-CTQi87vtLIfcekLk0TnHh4pOCyeC";
const DEEPGRAM_API_KEY     = process.env.DEEPGRAM_API_KEY || "";
const VC_TARGET_LANG       = process.env.VC_TARGET_LANG || "en";

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

const vcStopCommand = new SlashCommandBuilder()
  .setName("vcstop")
  .setDescription("Stop the bot from listening and leave the voice channel")
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
      { body: [translateCommand, vcListenCommand, vcStopCommand] },
    );
    console.log("[bot] Slash commands registered.");
  } catch (e) {
    console.error("[bot] Failed to register slash commands:", e.message);
  }
}

// ── Voice listen helpers ───────────────────────────────────────
const activeListeners = new Map(); // guildId -> { connection, cleanups[] }

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

async function startListeningToUser(connection, userId, member, targetLang) {
  if (!DEEPGRAM_API_KEY) {
    console.error("[voice] DEEPGRAM_API_KEY not set");
    return null;
  }

  const receiver = connection.receiver;
  const deepgram = createDeepgramClient(DEEPGRAM_API_KEY);

  const audioStream = receiver.subscribe(userId, {
    end: { behavior: EndBehaviorType.AfterSilence, duration: 1000 },
  });

  let fullTranscript = "";

  const dgLive = deepgram.listen.live({
    model: "nova-2",
    language: "multi",
    smart_format: true,
    interim_results: false,
    utterance_end_ms: 1200,
  });

  dgLive.on("Results", async (data) => {
    const transcript = data?.channel?.alternatives?.[0]?.transcript;
    if (!transcript || transcript.trim().length < 2) return;
    fullTranscript = transcript.trim();

    try {
      const { translated } = await translateText(fullTranscript, targetLang);
      const username = member?.displayName ?? member?.user?.username ?? `User ${userId}`;
      const avatarUrl = member?.user?.displayAvatarURL({ size: 64 }) ?? BOT_AVATAR;
      console.log(`[voice] ${username}: ${fullTranscript} -> ${translated}`);
      await postToStaffVoice(username, avatarUrl, fullTranscript, translated, targetLang);
    } catch (e) {
      console.error("[voice] translate error:", e.message);
    }
  });

  dgLive.on("error", (e) => console.error("[voice] Deepgram error:", e.message));

  audioStream.on("data", (chunk) => {
    if (dgLive.getReadyState() === 1) dgLive.send(chunk);
  });

  audioStream.on("end", () => {
    try { dgLive.finish(); } catch {}
  });

  return () => {
    try { audioStream.destroy(); } catch {}
    try { dgLive.finish(); } catch {}
  };
}

async function startVoiceListening(connection, guild, targetLang) {
  const receiver = connection.receiver;
  const cleanups = [];

  receiver.speaking.on("start", async (userId) => {
    if (cleanups[userId]) return; // already listening to this user
    const member = guild.members.cache.get(userId) ?? await guild.members.fetch(userId).catch(() => null);
    if (member?.user?.bot) return;
    const cleanup = await startListeningToUser(connection, userId, member, targetLang);
    if (cleanup) cleanups[userId] = cleanup;
  });

  receiver.speaking.on("end", (userId) => {
    if (cleanups[userId]) {
      cleanups[userId]();
      delete cleanups[userId];
    }
  });

  return cleanups;
}

/**
 * Translate text using the free MyMemory API (no key required).
 * Auto-detects source language, translates to `targetLang`.
 */
async function translateText(text, targetLang) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=autodetect|${encodeURIComponent(targetLang)}`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.responseStatus !== 200) throw new Error(json.responseMessage || "Translation failed");
    return { translated: json.responseData?.translatedText ?? "*(no result)*" };
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

client.once("clientReady", async () => {
  console.log(`[bot] Logged in as ${client.user.tag}`);
  console.log(`[bot] Relaying to: ${SITE_URL}/api/discord/ingest`);

  // Register slash commands
  await registerSlashCommands();

  // Initial sync on startup, then every 10 minutes
  await syncMembers();
  setInterval(() => { void syncMembers(); }, 10 * 60 * 1000);
});

async function syncMembers() {
  try {
    // Use Discord REST API — no privileged GuildMembers intent required
    const DISCORD_TOKEN = BOT_TOKEN;
    let allMembers = [];
    let after = "0";
    const LIMIT = 1000;

    while (true) {
      const res = await fetch(
        `https://discord.com/api/v10/guilds/${GUILD_ID}/members?limit=${LIMIT}&after=${after}`,
        { headers: { Authorization: `Bot ${DISCORD_TOKEN}` } }
      );
      if (!res.ok) { console.error("[bot] Discord members REST failed:", res.status); break; }
      const batch = await res.json();
      if (!batch.length) break;
      allMembers = allMembers.concat(batch);
      if (batch.length < LIMIT) break;
      after = batch[batch.length - 1].user.id;
    }

    const payload = allMembers.map(m => ({
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

    const res = await fetch(`${SITE_URL}/api/discord/members-sync`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ secret: INGEST_SECRET, members: payload }),
    });
    if (!res.ok) {
      console.error("[bot] members-sync failed:", res.status, await res.text());
    } else {
      console.log(`[bot] Synced ${payload.length} guild members`);
    }
  } catch (e) {
    console.error("[bot] syncMembers error:", e.message);
  }
}

async function relayMessage(msg) {
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

  // ── /vclisten ──
  if (interaction.commandName === "vclisten") {
    const member = interaction.member;
    const voiceChannel = member?.voice?.channel;
    if (!voiceChannel) {
      return interaction.reply({ content: "❌ You must be in a voice channel first!", ephemeral: true });
    }
    if (!DEEPGRAM_API_KEY) {
      return interaction.reply({ content: "❌ `DEEPGRAM_API_KEY` is not set on the bot. Add it to Fly.io secrets.", ephemeral: true });
    }

    const targetLang = interaction.options.getString("translate_to") ?? VC_TARGET_LANG;
    const guildId = interaction.guildId;

    // Disconnect existing if any
    const existing = getVoiceConnection(guildId);
    if (existing) existing.destroy();
    if (activeListeners.has(guildId)) activeListeners.delete(guildId);

    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId,
      adapterCreator: interaction.guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: true,
    });

    const cleanups = await startVoiceListening(connection, interaction.guild, targetLang);
    activeListeners.set(guildId, { connection, cleanups });

    const LANG_NAMES = { en: "🇺🇸 English", es: "🇪🇸 Spanish", pt: "🇵🇹 Portuguese", fr: "🇫🇷 French", de: "🇩🇪 German", ru: "🇷🇺 Russian", zh: "🇨🇳 Chinese", ja: "🇯🇵 Japanese" };
    return interaction.reply({
      content: `🎤 Now listening in **${voiceChannel.name}** — translating to **${LANG_NAMES[targetLang] ?? targetLang}**. Results post to Staff-Voice.\nRun \`/vcstop\` to stop.`,
      ephemeral: true,
    });
  }

  // ── /vcstop ──
  if (interaction.commandName === "vcstop") {
    const guildId = interaction.guildId;
    const existing = getVoiceConnection(guildId);
    if (existing) existing.destroy();
    activeListeners.delete(guildId);
    return interaction.reply({ content: "🔇 Stopped listening and left the voice channel.", ephemeral: true });
  }

  if (interaction.commandName !== "nhtranslate") return;

  await interaction.deferReply({ ephemeral: false });

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

client.login(BOT_TOKEN).catch((err) => {
  console.error("[bot] Login failed:", err.message);
  process.exit(1);
});
