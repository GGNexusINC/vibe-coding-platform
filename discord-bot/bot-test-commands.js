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

// Client with voice intents for /vclisten
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

// Simple test commands
const pingCommand = {
  name: "ping",
  description: "Test if bot is responding",
};

const vcListenCommand = {
  name: "vclisten",
  description: "Start voice listening (test version)",
};

const vcStopCommand = {
  name: "vcstop", 
  description: "Stop voice listening (test version)",
};

client.once("ready", async () => {
  console.log(`[bot] Logged in as ${client.user.tag}`);
  console.log("[bot] Bot is ready - registering test commands...");

  // Register test commands
  const rest = new REST({ version: "10" }).setToken(BOT_TOKEN);
  try {
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, GUILD_ID),
      { body: [pingCommand, vcListenCommand, vcStopCommand] },
    );
    console.log("[bot] Test commands registered successfully!");
  } catch (e) {
    console.error("[bot] Failed to register commands:", e.message);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  
  console.log(`[bot] Received command: ${interaction.commandName} from ${interaction.user.tag}`);
  
  if (interaction.commandName === "ping") {
    await interaction.reply("🏓 Pong! Bot is working with permissions!");
  }
  
  if (interaction.commandName === "vclisten") {
    const voiceChannel = interaction.member?.voice?.channel;
    if (!voiceChannel) {
      return interaction.reply({ content: "❌ You must be in a voice channel to use this command.", ephemeral: true });
    }
    
    await interaction.reply({ 
      content: `🎤 Test: Voice listening would start in **${voiceChannel.name}**! Permissions are working!`, 
      ephemeral: true 
    });
  }
  
  if (interaction.commandName === "vcstop") {
    await interaction.reply({ 
      content: "🔇 Test: Voice listening would stop! Permissions are working!", 
      ephemeral: true 
    });
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
