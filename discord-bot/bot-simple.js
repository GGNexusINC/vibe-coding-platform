require("dotenv").config();
const { Client, GatewayIntentBits, REST, Routes } = require("discord.js");

const BOT_TOKEN = process.env.BOT_TOKEN;
const GUILD_ID = process.env.GUILD_ID;

if (!BOT_TOKEN) {
  console.error("[bot] BOT_TOKEN is required");
  process.exit(1);
}

console.log("[bot] BOT_TOKEN present: true");
console.log("[bot] GUILD_ID:", GUILD_ID);

// Simple client with basic intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Simple slash command
const pingCommand = {
  name: "ping",
  description: "Test bot responsiveness",
};

client.once("ready", async () => {
  console.log(`[bot] Logged in as ${client.user.tag}`);

  // Register simple slash command
  const rest = new REST({ version: "10" }).setToken(BOT_TOKEN);
  try {
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, GUILD_ID),
      { body: [pingCommand] },
    );
    console.log("[bot] Simple slash command registered.");
  } catch (e) {
    console.error("[bot] Failed to register slash command:", e.message);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  
  if (interaction.commandName === "ping") {
    await interaction.reply("🏓 Pong! Bot is responsive.");
  }
});

client.on("error", (err) => {
  console.error("[bot] Discord client error:", err.message);
});

console.log("[bot] Attempting to login to Discord...");
client.login(BOT_TOKEN).catch((err) => {
  console.error("[bot] Login failed:", err.message);
  process.exit(1);
});
