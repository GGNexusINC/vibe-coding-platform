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
    GatewayIntentBits.GuildVoiceStates,
  ],
});

// Very simple slash commands - no complex options
const vcListenCommand = {
  name: "vclisten",
  description: "Start voice listening (simple version)",
};

const vcStopCommand = {
  name: "vcstop", 
  description: "Stop voice listening (simple version)",
};

client.once("ready", async () => {
  console.log(`[bot] Logged in as ${client.user.tag}`);

  // Register simple slash commands
  const rest = new REST({ version: "10" }).setToken(BOT_TOKEN);
  try {
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, GUILD_ID),
      { body: [vcListenCommand, vcStopCommand] },
    );
    console.log("[bot] Voice commands registered.");
  } catch (e) {
    console.error("[bot] Failed to register voice commands:", e.message);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  
  if (interaction.commandName === "vclisten") {
    const voiceChannel = interaction.member?.voice?.channel;
    if (!voiceChannel) {
      return interaction.reply({ content: "❌ You must be in a voice channel to use this command.", ephemeral: true });
    }
    
    await interaction.reply({ 
      content: `🎤 Voice listening started in **${voiceChannel.name}**! (Simple version - full translation coming soon)`, 
      ephemeral: true 
    });
  }
  
  if (interaction.commandName === "vcstop") {
    await interaction.reply({ 
      content: "🔇 Voice listening stopped! (Simple version - full functionality coming soon)", 
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
