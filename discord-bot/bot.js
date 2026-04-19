/**
 * NewHopeGGN Discord Message Relay Bot
 * 
 * Setup:
 *   1. cd discord-bot
 *   2. npm install discord.js
 *   3. Set BOT_TOKEN and SITE_URL below (or use environment variables)
 *   4. node bot.js
 *
 * Requires bot permissions: Read Messages, Read Message History, View Channels
 */

// Immediate startup log
process.stderr.write("[bot] Starting...\n");

require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");

// ── Config ────────────────────────────────────────────────────────────────────
const BOT_TOKEN     = process.env.BOT_TOKEN;
const SITE_URL      = process.env.SITE_URL      || "https://newhopeggn.vercel.app";
const INGEST_SECRET = process.env.INGEST_SECRET || "newhopeggn-bot-secret";
const GUILD_ID      = process.env.GUILD_ID      || "1419522458075005023";

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
  ],
});

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

// Catch embed updates — Discord adds Tenor/Giphy embeds AFTER messageCreate via messageUpdate
client.on("messageUpdate", (oldMsg, newMsg) => {
  // Only relay if embeds were added (old had none, new has some)
  const hadEmbeds = (oldMsg.embeds?.length ?? 0) > 0;
  const hasEmbeds = (newMsg.embeds?.length ?? 0) > 0;
  if (!hadEmbeds && hasEmbeds) {
    console.log(`[bot] Embed update detected for msg ${newMsg.id}`);
    void relayMessage(newMsg);
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
