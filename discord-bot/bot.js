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

require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");

// ── Config ────────────────────────────────────────────────────────────────────
const BOT_TOKEN    = process.env.BOT_TOKEN;
const SITE_URL     = process.env.SITE_URL     || "https://newhopeggn.netlify.app";
const INGEST_SECRET = process.env.INGEST_SECRET || "newhopeggn-bot-secret";

if (!BOT_TOKEN) { console.error("[bot] ERROR: BOT_TOKEN not set in .env"); process.exit(1); }

// Channels to relay (by name). Leave empty [] to relay ALL channels.
const CHANNEL_WHITELIST = [
  "general-chat",
  "announcements",
  "memes",
  "fotos-photos",
  "videos",
  "guias-guides",
  "sugerencias-suggestions",
];
// ─────────────────────────────────────────────────────────────────────────────

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once("clientReady", () => {
  console.log(`[bot] Logged in as ${client.user.tag}`);
  console.log(`[bot] Relaying to: ${SITE_URL}/api/discord/ingest`);
});

client.on("messageCreate", async (msg) => {
  // Skip bots and empty messages
  if (msg.author.bot) return;
  if (!msg.content?.trim()) return;

  const channelName = msg.channel.name ?? "";

  // Filter by whitelist if set
  if (CHANNEL_WHITELIST.length > 0 && !CHANNEL_WHITELIST.includes(channelName)) return;

  const payload = {
    secret: INGEST_SECRET,
    id: msg.id,
    channel_id: msg.channelId,
    channel_name: channelName,
    author_id: msg.author.id,
    author_username: msg.author.displayName ?? msg.author.username,
    author_avatar: msg.author.displayAvatarURL({ size: 64 }),
    content: msg.content,
    created_at: msg.createdAt.toISOString(),
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
});

client.login(BOT_TOKEN);
