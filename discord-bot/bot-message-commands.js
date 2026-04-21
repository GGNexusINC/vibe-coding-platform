require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error("[bot] BOT_TOKEN is required");
  process.exit(1);
}

console.log("[bot] BOT_TOKEN present: true");

// Client with voice intents for voice commands
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

client.once("ready", () => {
  console.log(`[bot] Logged in as ${client.user.tag}`);
  console.log("[bot] Bot is ready - using message commands (!vclisten, !vcstop, !ping)");
});

client.on("messageCreate", async (message) => {
  // Ignore bot messages
  if (message.author.bot) return;
  
  console.log(`[bot] Received message: ${message.content} from ${message.author.tag}`);
  
  // Ping command
  if (message.content.toLowerCase() === "!ping") {
    await message.reply("🏓 Pong! Bot is working with message commands!");
  }
  
  // Voice listen command
  if (message.content.toLowerCase().startsWith("!vclisten")) {
    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) {
      return message.reply("❌ You must be in a voice channel to use this command.");
    }
    
    // Extract language from message (optional)
    const parts = message.content.split(" ");
    const language = parts[1] || "english";
    
    await message.reply(`🎤 Voice listening started in **${voiceChannel.name}**! Target language: **${language}**\n\n*Note: This is a test version - full voice translation coming soon!*`);
  }
  
  // Voice stop command
  if (message.content.toLowerCase() === "!vcstop") {
    await message.reply("🔇 Voice listening stopped! *(Test version - full functionality coming soon)*");
  }
  
  // Help command
  if (message.content.toLowerCase() === "!help") {
    const helpMessage = `
**🎤 NEWHOPEGGN Voice Commands:**
• \`!ping\` - Test if bot is responding
• \`!vclisten [language]\` - Start voice listening in your voice channel
• \`!vcstop\` - Stop voice listening
• \`!help\` - Show this help message

**Example:** \`!vclisten spanish\`

*Make sure you're in a voice channel when using !vclisten*
    `;
    await message.reply(helpMessage);
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
