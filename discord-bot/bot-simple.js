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

// Simple slash commands
const pingCommand = {
  name: "ping",
  description: "Test bot responsiveness",
};

const vcListenCommand = {
  name: "vclisten",
  description: "Start listening to voice channel for live translation",
  options: [
    {
      name: "language",
      description: "Target language for translation",
      type: 3, // STRING
      required: true,
      choices: [
        { name: "English", value: "en" },
        { name: "Spanish", value: "es" },
        { name: "Portuguese", value: "pt" },
        { name: "French", value: "fr" },
        { name: "German", value: "de" },
        { name: "Russian", value: "ru" },
        { name: "Chinese", value: "zh" },
        { name: "Japanese", value: "ja" },
      ],
    },
  ],
};

const vcStopCommand = {
  name: "vcstop",
  description: "Stop voice listening and leave voice channel",
};

client.once("ready", async () => {
  console.log(`[bot] Logged in as ${client.user.tag}`);

  // Register slash commands
  const rest = new REST({ version: "10" }).setToken(BOT_TOKEN);
  try {
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, GUILD_ID),
      { body: [pingCommand, vcListenCommand, vcStopCommand] },
    );
    console.log("[bot] Slash commands registered.");
  } catch (e) {
    console.error("[bot] Failed to register slash commands:", e.message);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  
  if (interaction.commandName === "ping") {
    await interaction.reply("🏓 Pong! Bot is responsive.");
  }
  
  if (interaction.commandName === "vclisten") {
    const voiceChannel = interaction.member?.voice?.channel;
    if (!voiceChannel) {
      return interaction.reply({ content: "❌ You must be in a voice channel to use this command.", ephemeral: true });
    }
    
    const targetLang = interaction.options.getString("language");
    await interaction.reply({ 
      content: `🎤 Voice listening feature is not yet implemented in this simple version. Would translate to **${targetLang}** in **${voiceChannel.name}**.`, 
      ephemeral: true 
    });
  }
  
  if (interaction.commandName === "vcstop") {
    await interaction.reply({ 
      content: "🔇 Voice stop feature is not yet implemented in this simple version.", 
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
