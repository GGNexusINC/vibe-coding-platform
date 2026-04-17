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

client.once("clientReady", () => {
  console.log(`[bot] Logged in as ${client.user.tag}`);
  console.log(`[bot] Relaying to: ${SITE_URL}/api/discord/ingest`);
});

client.on("messageCreate", async (msg) => {
  // Skip bots
  if (msg.author.bot) return;

  const channelName = msg.channel.name ?? "";

  // Collect attachment URLs (images, gifs)
  const attachmentUrls = [...msg.attachments.values()]
    .filter(a => a.url)
    .map(a => a.url);

  // Debug: log full embed data so we can see what fields Discord provides
  if (msg.embeds.length > 0) {
    msg.embeds.forEach((e, i) => {
      console.log(`[bot] embed[${i}]:`, JSON.stringify({
        type: e.type,
        url: e.url,
        image: e.image,
        thumbnail: e.thumbnail,
        video: e.video,
        provider: e.provider?.name,
      }));
    });
  }

  // Collect embed image/gif URLs (Tenor, Giphy, etc)
  // Discord Tenor GIFs: thumbnail.proxyURL has the actual gif CDN URL
  const embedUrls = msg.embeds.flatMap(e => {
    const candidates = [
      e.image?.proxyURL,
      e.image?.url,
      e.thumbnail?.proxyURL,
      e.thumbnail?.url,
      e.video?.proxyURL,
      e.video?.url,
    ];
    return candidates.filter(Boolean);
  });

  // Build full content: text + any media URLs
  const mediaUrls = [...new Set([...attachmentUrls, ...embedUrls])];
  const fullContent = [msg.content?.trim(), ...mediaUrls].filter(Boolean).join(" ");

  // Skip if truly nothing
  if (!fullContent) return;

  console.log(`[bot] Message in #${channelName} from ${msg.author.username}: ${fullContent.slice(0, 80)}`);

  // Filter by whitelist if set
  if (CHANNEL_WHITELIST.length > 0 && !CHANNEL_WHITELIST.includes(channelName)) {
    console.log(`[bot] Skipped - #${channelName} not in whitelist`);
    return;
  }

  const payload = {
    secret: INGEST_SECRET,
    id: msg.id,
    channel_id: msg.channelId,
    channel_name: channelName,
    author_id: msg.author.id,
    author_username: msg.author.displayName ?? msg.author.username,
    author_avatar: msg.author.displayAvatarURL({ size: 64 }),
    content: fullContent,
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
