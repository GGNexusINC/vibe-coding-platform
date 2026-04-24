// Discord Bot API helper for creating tickets
import { env } from "./env";
import { brandDiscordWebhookPayload, NEWHOPE_LOGO_URL } from "./discord";

const BOT_TOKEN = env.discordBotToken();
const GUILD_ID = env.discordGuildId();

// Admin IDs who can see ticket channels
const ADMIN_IDS = [
  "940804710267486249",   // Kilo
  "1310794181190352997",  // Buzzworthy
  "145278391166173185",   // Hope
];

// Also allow the bot itself if needed
const BOT_ID = "1494210689806368798"; // NEWHOPEGGN bot

type TicketChannel = {
  id: string;
  name: string;
  guild_id: string;
};

/**
 * Create a private ticket channel in Discord
 */
export async function createTicketChannel(
  username: string,
  subject: string
): Promise<TicketChannel | null> {
  if (!BOT_TOKEN) {
    console.error("[discord-bot] No bot token configured");
    return null;
  }

  // Clean channel name: website-ticket-001 format
  const cleanName = username.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 15);
  const ticketNum = Math.floor(Math.random() * 900 + 100); // 100-999
  const channelName = `website-ticket-${ticketNum}`;
  
  try {
    // 1. Create the channel
    const createRes = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/channels`, {
      method: "POST",
      headers: {
        "Authorization": `Bot ${BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: channelName.slice(0, 100),
        type: 0, // Text channel
        topic: `Support ticket from ${username}: ${subject.slice(0, 100)}`,
        parent_id: env.discordTicketsCategory() || undefined,
        permission_overwrites: [
          // Deny @everyone - type 0 = role, 1024 = VIEW_CHANNEL
          { id: GUILD_ID, type: 0, deny: 1024, allow: 0 },
          // Allow bot - type 1 = user
          { id: BOT_ID, type: 1, allow: 1024, deny: 0 },
          // Allow Kilo
          { id: "940804710267486249", type: 1, allow: 1024, deny: 0 },
          // Allow Buzzworthy  
          { id: "1310794181190352997", type: 1, allow: 1024, deny: 0 },
          // Allow Hope
          { id: "145278391166173185", type: 1, allow: 1024, deny: 0 },
        ],
      }),
    });

    if (!createRes.ok) {
      const error = await createRes.text();
      console.error("[discord-bot] Failed to create channel:", createRes.status, error);
      return null;
    }

    const channel: TicketChannel = await createRes.json();
    console.log("[discord-bot] Created ticket channel:", channel.id, channel.name);
    
    return channel;
  } catch (e) {
    console.error("[discord-bot] Error creating ticket channel:", e);
    return null;
  }
}

/**
 * Send initial ticket message to the channel
 */
export async function sendTicketMessage(
  channelId: string,
  user: {
    username: string;
    discord_id?: string;
    avatar_url?: string;
  },
  subject: string,
  message: string,
  itemImageUrl?: string | null
): Promise<boolean> {
  if (!BOT_TOKEN) return false;

  try {
    const embed = {
      title: "🎫 New Support Ticket",
      color: 0x22d3ee, // Cyan
      thumbnail: { url: NEWHOPE_LOGO_URL },
      image: itemImageUrl ? { url: itemImageUrl } : undefined,
      fields: [
        { name: "User", value: `<@${user.discord_id || "unknown"}> (${user.username})`, inline: true },
        { name: "Subject", value: subject, inline: true },
        { name: "Message", value: message.slice(0, 1024) },
      ],
      timestamp: new Date().toISOString(),
      footer: { text: "Ticket System • Reply here to respond" },
    };

    // Mention all admin users directly by ID
    const adminMentions = [
      "<@940804710267486249>",   // Kilo
      "<@1310794181190352997>",  // Buzzworthy
      "<@145278391166173185>",   // Hope
    ].join(" ");

    // Add close button for admins
    const components = [{
      type: 1, // ActionRow
      components: [{
        type: 2, // Button
        style: 4, // Danger (red)
        label: "Close Ticket",
        emoji: { name: "🔒" },
        custom_id: `close_ticket_${channelId}`,
      }]
    }];

    const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bot ${BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: `🎫 **New Support Ticket**\n${adminMentions}`,
        embeds: [embed],
        components,
      }),
    });

    if (!res.ok) {
      console.error("[discord-bot] Failed to send ticket message:", res.status);
      return false;
    }

    console.log("[discord-bot] Sent ticket message to channel:", channelId);
    return true;
  } catch (e) {
    console.error("[discord-bot] Error sending ticket message:", e);
    return false;
  }
}

export async function sendTicketPresenceStatus(
  channelId: string,
  input: {
    state: "active" | "closed";
    side: "user" | "staff";
    username: string;
    ticketId: string;
    messageId?: string | null;
  },
): Promise<string | null> {
  if (!BOT_TOKEN) return null;

  const isActive = input.state === "active";
  const sideLabel = input.side === "staff" ? "Staff console" : "User support page";
  const statusLabel = isActive ? "ONLINE - live window open" : "OFFLINE - window closed or hidden";

  try {
    const embed = {
      title: isActive ? "Live Support Signal Online" : "Live Support Signal Offline",
      color: isActive ? 0x22c55e : 0xf59e0b,
      thumbnail: { url: NEWHOPE_LOGO_URL },
      fields: [
        { name: "Window", value: sideLabel, inline: true },
        { name: "Status", value: statusLabel, inline: true },
        { name: "Viewer", value: input.username || "Guest", inline: true },
        { name: "Ticket", value: input.ticketId, inline: false },
      ],
      timestamp: new Date().toISOString(),
      footer: { text: "NewHopeGGN Live Ticket Presence", icon_url: NEWHOPE_LOGO_URL },
    };

    const payload = {
      content: isActive
        ? `LIVE WINDOW ONLINE: ${sideLabel} is active.`
        : `LIVE WINDOW OFFLINE: ${sideLabel} closed or left the page.`,
      embeds: [embed],
    };
    const endpoint = input.messageId
      ? `https://discord.com/api/v10/channels/${channelId}/messages/${input.messageId}`
      : `https://discord.com/api/v10/channels/${channelId}/messages`;
    let res = await fetch(endpoint, {
      method: input.messageId ? "PATCH" : "POST",
      headers: {
        "Authorization": `Bot ${BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok && input.messageId && (res.status === 404 || res.status === 403)) {
      res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bot ${BOT_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    }

    if (!res.ok) {
      console.error("[discord-bot] Failed to send ticket presence:", res.status);
      return null;
    }

    const message = await res.json().catch(() => ({}));
    return typeof message?.id === "string" ? message.id : input.messageId ?? null;
  } catch (e) {
    console.error("[discord-bot] Error sending ticket presence:", e);
    return null;
  }
}

/**
 * Send message to logs webhook as backup
 */
export async function sendTicketToWebhook(
  webhookUrl: string,
  user: {
    username: string;
    discord_id?: string;
    avatar_url?: string;
  },
  subject: string,
  message: string,
  channelId?: string,
  itemImageUrl?: string | null
): Promise<boolean> {
  try {
    const embed = {
      title: "🎫 Support Ticket Submitted",
      color: 0x22d3ee,
      thumbnail: { url: NEWHOPE_LOGO_URL },
      image: itemImageUrl ? { url: itemImageUrl } : undefined,
      fields: [
        { name: "User", value: user.username, inline: true },
        { name: "Subject", value: subject, inline: true },
        { name: "Message", value: message.slice(0, 1024) },
      ],
      timestamp: new Date().toISOString(),
      footer: { text: "NewHopeGGN Ticket Log", icon_url: NEWHOPE_LOGO_URL },
    };

    if (channelId) {
      embed.fields.push({
        name: "Ticket Channel",
        value: `<#${channelId}>`,
        inline: false,
      });
    }

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(brandDiscordWebhookPayload({
        username: "NewHopeGGN Tickets",
        embeds: [embed],
      })),
    });

    return res.ok;
  } catch (e) {
    console.error("[discord-bot] Webhook send failed:", e);
    return false;
  }
}
