/**
 * Minimal Discord Bot for testing login issues
 */

process.stderr.write("[bot] Starting minimal bot...\n");

require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");

const BOT_TOKEN = process.env.BOT_TOKEN;

process.stderr.write(`[bot] BOT_TOKEN present: ${!!BOT_TOKEN}\n`);

if (!BOT_TOKEN) {
  process.stderr.write("[bot] FATAL: BOT_TOKEN not set\n");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

client.once("ready", () => {
  console.log(`[bot] Logged in as ${client.user.tag}`);
  console.log("[bot] Minimal bot is ready!");
});

client.on("error", (err) => {
  console.error("[bot] Discord client error:", err.message);
});

console.log("[bot] Attempting to login...");
client.login(BOT_TOKEN).catch((err) => {
  console.error("[bot] Login failed:", err.message);
  process.exit(1);
});
