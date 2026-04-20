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
const { Client, GatewayIntentBits, EmbedBuilder, AuditLogEvent } = require("discord.js");

// ── Config ────────────────────────────────────────────────────────────────────
const BOT_TOKEN      = process.env.BOT_TOKEN;
const SITE_URL       = process.env.SITE_URL       || "https://newhopeggn.vercel.app";
const INGEST_SECRET  = process.env.INGEST_SECRET  || "newhopeggn-bot-secret";
const GUILD_ID       = process.env.GUILD_ID       || "1419522458075005023";
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID || "";

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

client.once("clientReady", async () => {
  console.log(`[bot] Logged in as ${client.user.tag}`);
  console.log(`[bot] Relaying to: ${SITE_URL}/api/discord/ingest`);

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
