const premiumCommand = new SlashCommandBuilder()
  .setName("nhpremium")
  .setDescription("Open the NewHope Translate premium panel and pricing")
  .toJSON();

const translateCommand = new SlashCommandBuilder()
  .setName("nhtranslate")
  .setDescription("Translate text and optionally speak it in voice chat")
  .addStringOption(opt =>
    opt.setName("text")
       .setDescription("The text you want to translate")
       .setRequired(true)
       .setMaxLength(500)
  )
  .addStringOption(opt =>
    opt.setName("to")
       .setDescription("Translate to which language? (default: English)")
       .setRequired(false)
       .addChoices(
         { name: "🇺🇸 English",    value: "en" },
         { name: "🇪🇸 Spanish",    value: "es" },
         { name: "🇵🇹 Portuguese", value: "pt" },
         { name: "🇫🇷 French",     value: "fr" },
         { name: "🇩🇪 German",     value: "de" },
         { name: "🇮🇹 Italian",    value: "it" },
         { name: "🇳🇱 Dutch",      value: "nl" },
         { name: "🇷🇺 Russian",    value: "ru" },
         { name: "🇨🇳 Chinese",    value: "zh" },
         { name: "🇯🇵 Japanese",   value: "ja" },
         { name: "🇰🇷 Korean",     value: "ko" },
         { name: "🇸🇦 Arabic",     value: "ar" },
         { name: "🇹🇷 Turkish",    value: "tr" },
         { name: "🇵🇱 Polish",     value: "pl" },
         { name: "🇮🇳 Hindi",      value: "hi" },
       )
  )
  .addBooleanOption(opt =>
    opt.setName("speak")
       .setDescription("Premium: speak the translated result in your current voice channel")
       .setRequired(false)
  )
  .toJSON();

async function registerSlashCommands() {
  try {
    const rest = new REST({ version: "10" }).setToken(BOT_TOKEN);
    const commandList = [translateCommand, premiumCommand, vcListenCommand, vcAutoCommand, vcStopCommand, vcPermCheckCommand];

    console.log("[bot] Registering global slash commands...");
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commandList },
    );

    // Clear guild-specific commands to avoid duplicates in the main guild.
    // If we leave them in both, the guild sees duplicates.
    console.log(`[bot] Clearing guild slash commands for ${GUILD_ID}...`);
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, GUILD_ID),
      { body: [] },
    );

    console.log("[bot] Slash commands synchronized.");
  } catch (e) {
    console.error("[bot] Failed to register slash commands:", e.message);
  }
}
