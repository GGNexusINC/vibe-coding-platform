import { NextResponse } from "next/server";

const PERM_VIEW_CHANNEL = BigInt("1024");
const PERM_CONNECT = BigInt("1048576");
const PERM_SPEAK = BigInt("2097152");
const PERM_ADMIN = BigInt("8");

type DiscordRole = { id: string; permissions: string };
type DiscordMember = { roles?: string[]; user?: { id: string } };
type DiscordGuildMember = { roles?: string[] };
type DiscordChannel = {
  id: string;
  type?: number;
  permission_overwrites?: Array<{ id: string; type: number; allow: string; deny: string }>;
  name?: string;
};
type SlashOption = { name: string; value?: string };
type InteractionBody = {
  type: number;
  token?: string;
  application_id?: string;
  guild_id?: string;
  channel_id?: string;
  user?: { id: string };
  member?: DiscordMember;
  data?: {
    name?: string;
    options?: SlashOption[];
    resolved?: { channels?: Record<string, DiscordChannel> };
    custom_id?: string;
  };
};

async function verifyDiscordSignature(
  publicKey: string,
  signature: string,
  timestamp: string,
  body: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const keyData = hexToUint8Array(publicKey);
    const sigData = hexToUint8Array(signature);
    const message = encoder.encode(timestamp + body);

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "Ed25519" },
      false,
      ["verify"]
    );

    return await crypto.subtle.verify("Ed25519", cryptoKey, sigData, message);
  } catch (error) {
    console.error("[discord-interactions] signature verification error:", error);
    return false;
  }
}

function hexToUint8Array(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes.buffer as ArrayBuffer;
}

function parsePerms(value: string | undefined): bigint {
  if (!value) return BigInt(0);
  try {
    return BigInt(value);
  } catch {
    return BigInt(0);
  }
}

function applyOverwrite(base: bigint, overwrite?: { allow: string; deny: string }): bigint {
  if (!overwrite) return base;
  const allow = parsePerms(overwrite.allow);
  const deny = parsePerms(overwrite.deny);
  return (base & ~deny) | allow;
}

function hasPerm(perms: bigint, flag: bigint): boolean {
  return (perms & PERM_ADMIN) === PERM_ADMIN || (perms & flag) === flag;
}

async function discordApi<T>(path: string, botToken: string): Promise<T> {
  const res = await fetch(`https://discord.com/api/v10${path}`, {
    headers: { Authorization: `Bot ${botToken}` },
  });
  if (!res.ok) {
    throw new Error(`Discord API ${path} failed with ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function sendBotControlMessage(channelId: string, botToken: string, payload: Record<string, unknown>) {
  const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${botToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content: `[NH-CONTROL] ${JSON.stringify(payload)}`,
    }),
  });

  if (!res.ok) {
    throw new Error(`Control message failed with ${res.status}`);
  }
}

async function buildVcPermCheckMessage(body: InteractionBody) {
  const botToken = process.env.DISCORD_BOT_TOKEN || process.env.BOT_TOKEN;
  const guildId = body.guild_id;
  if (!guildId) {
    return "ERROR: missing guild context for vcpermcheck.";
  }
  if (!botToken) {
    return "ERROR: bot token is not configured.";
  }

  const optionChannelId = body.data?.options?.find((opt) => opt.name === "channel")?.value;
  const fallbackChannelId = body.channel_id;
  const channelId = optionChannelId || fallbackChannelId;
  if (!channelId) {
    return "ERROR: no voice channel was provided. Use `/vcpermcheck channel:` to inspect a specific voice channel.";
  }

  const botUser = await discordApi<{ id: string }>(`/users/@me`, botToken);
  const [member, roles, channel] = await Promise.all([
    discordApi<DiscordGuildMember>(`/guilds/${guildId}/members/${botUser.id}`, botToken),
    discordApi<DiscordRole[]>(`/guilds/${guildId}/roles`, botToken),
    body.data?.resolved?.channels?.[channelId] ?? discordApi<DiscordChannel>(`/channels/${channelId}`, botToken),
  ]);

  if (channel.type !== 2 && channel.type !== 13) {
    return `ERROR: **${channel.name ?? "That channel"}** is not a voice or stage channel.`;
  }

  const memberRoles = new Set(member.roles ?? []);
  let perms = BigInt(0);
  const everyoneRole = roles.find((role) => role.id === guildId);
  perms |= parsePerms(everyoneRole?.permissions);

  for (const role of roles) {
    if (memberRoles.has(role.id)) perms |= parsePerms(role.permissions);
  }

  const overwrites = channel.permission_overwrites ?? [];
  const everyoneOverwrite = overwrites.find((ow) => ow.id === guildId && ow.type === 0);
  perms = applyOverwrite(perms, everyoneOverwrite);

  for (const overwrite of overwrites) {
    if (overwrite.type !== 0) continue;
    if (!memberRoles.has(overwrite.id)) continue;
    perms = applyOverwrite(perms, overwrite);
  }

  const memberOverwrite = overwrites.find((ow) => ow.id === botUser.id && ow.type === 1);
  perms = applyOverwrite(perms, memberOverwrite);

  const missing: string[] = [];
  if (!hasPerm(perms, PERM_VIEW_CHANNEL)) missing.push("View Channel");
  if (!hasPerm(perms, PERM_CONNECT)) missing.push("Connect");
  if (!hasPerm(perms, PERM_SPEAK)) missing.push("Speak");

  const lines = [
    `Voice channel: **${channel.name ?? "Unknown"}**`,
    `Bot can view: ${hasPerm(perms, PERM_VIEW_CHANNEL) ? "yes" : "no"}`,
    `Bot can connect: ${hasPerm(perms, PERM_CONNECT) ? "yes" : "no"}`,
    `Bot can speak: ${hasPerm(perms, PERM_SPEAK) ? "yes" : "no"}`,
    `Bot has administrator: ${hasPerm(perms, PERM_ADMIN) ? "yes" : "no"}`,
    missing.length ? `Missing required perms: ${missing.join(", ")}` : "Required voice permissions: all present",
  ];

  return lines.join("\n");
}

export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  const signature = req.headers.get("x-signature-ed25519") || "";
  const timestamp = req.headers.get("x-signature-timestamp") || "";
  const rawBody = await req.text();
  const publicKey = process.env.DISCORD_PUBLIC_KEY || "";

  if (!publicKey || !signature || !timestamp) {
    console.error("[discord-interactions] missing public key or signature headers");
    return new Response("Invalid signature", { status: 401 });
  }

  const isValid = await verifyDiscordSignature(publicKey, signature, timestamp, rawBody);
  if (!isValid) {
    console.error("[discord-interactions] rejected invalid signature");
    return new Response("Invalid signature", { status: 401 });
  }

  let body: InteractionBody;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (body.type === 1) {
    return NextResponse.json({ type: 1 });
  }

  if (body.type === 2) {
    const commandName = body.data?.name || "";

    if (commandName === "vcpermcheck") {
      try {
        const content = await buildVcPermCheckMessage(body);
        return NextResponse.json({ type: 4, data: { content, flags: 64 } });
      } catch (error) {
        console.error("[discord-interactions] vcpermcheck error:", error);
        return NextResponse.json({
          type: 4,
          data: {
            content: `ERROR: vcpermcheck failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            flags: 64,
          },
        });
      }
    }

    if (commandName === "vclisten") {
      const botToken = process.env.DISCORD_BOT_TOKEN || process.env.BOT_TOKEN;
      const guildId = body.guild_id;
      const channelId = body.channel_id;
      const userId = body.member?.user?.id || body.user?.id;
      const targetLang = body.data?.options?.find((opt) => opt.name === "translate_to")?.value || "en";

      if (!botToken || !guildId || !channelId || !userId) {
        return NextResponse.json({
          type: 4,
          data: {
            content: "ERROR: unable to queue vclisten. Missing bot token, guild, channel, or user context.",
            flags: 64,
          },
        });
      }

      try {
        await sendBotControlMessage(channelId, botToken, {
          action: "vclisten",
          guildId,
          userId,
          replyChannelId: channelId,
          targetLang,
        });

        return NextResponse.json({
          type: 4,
          data: {
            content: "Queued voice listener startup. The bot is joining your voice channel now.",
            flags: 64,
          },
        });
      } catch (error) {
        console.error("[discord-interactions] vclisten queue error:", error);
        return NextResponse.json({
          type: 4,
          data: {
            content: `ERROR: failed to queue vclisten: ${error instanceof Error ? error.message : "Unknown error"}`,
            flags: 64,
          },
        });
      }
    }

    if (commandName === "vcauto") {
      const botToken = process.env.DISCORD_BOT_TOKEN || process.env.BOT_TOKEN;
      const guildId = body.guild_id;
      const channelId = body.channel_id;
      const userId = body.member?.user?.id || body.user?.id;

      if (!botToken || !guildId || !channelId || !userId) {
        return NextResponse.json({
          type: 4,
          data: {
            content: "ERROR: unable to queue vcauto. Missing bot token, guild, channel, or user context.",
            flags: 64,
          },
        });
      }

      try {
        await sendBotControlMessage(channelId, botToken, {
          action: "vclisten",
          guildId,
          userId,
          replyChannelId: channelId,
          targetLang: "auto",
          auto: true,
        });

        return NextResponse.json({
          type: 4,
          data: {
            content: "Queued auto voice translation startup. The bot is joining your voice channel now.",
            flags: 64,
          },
        });
      } catch (error) {
        console.error("[discord-interactions] vcauto queue error:", error);
        return NextResponse.json({
          type: 4,
          data: {
            content: `ERROR: failed to queue vcauto: ${error instanceof Error ? error.message : "Unknown error"}`,
            flags: 64,
          },
        });
      }
    }

    if (commandName === "vcstop") {
      const botToken = process.env.DISCORD_BOT_TOKEN || process.env.BOT_TOKEN;
      const guildId = body.guild_id;
      const channelId = body.channel_id;

      if (!botToken || !guildId || !channelId) {
        return NextResponse.json({
          type: 4,
          data: {
            content: "ERROR: unable to queue vcstop. Missing bot token, guild, or channel context.",
            flags: 64,
          },
        });
      }

      try {
        await sendBotControlMessage(channelId, botToken, {
          action: "vcstop",
          guildId,
          replyChannelId: channelId,
        });

        return NextResponse.json({
          type: 4,
          data: {
            content: "Queued voice listener stop request.",
            flags: 64,
          },
        });
      } catch (error) {
        console.error("[discord-interactions] vcstop queue error:", error);
        return NextResponse.json({
          type: 4,
          data: {
            content: `ERROR: failed to queue vcstop: ${error instanceof Error ? error.message : "Unknown error"}`,
            flags: 64,
          },
        });
      }
    }

    return NextResponse.json({
      type: 4,
      data: {
        content: "ERROR: this slash command is not wired through the web interactions endpoint yet.",
        flags: 64,
      },
    });
  }

  if (body.type !== 3) {
    return NextResponse.json({ type: 1 });
  }

  const customId = body.data?.custom_id || "";
  if (!customId.startsWith("close_ticket_")) {
    return NextResponse.json({ type: 1 });
  }

  const channelId = customId.replace("close_ticket_", "");
  const botToken = process.env.DISCORD_BOT_TOKEN || process.env.BOT_TOKEN;

  if (!botToken) {
    return NextResponse.json({
      type: 4,
      data: { content: "ERROR: bot token not configured", flags: 64 },
    });
  }

  (async () => {
    try {
      await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bot ${botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: "Ticket closed by staff. This channel will be deleted in 5 seconds.",
        }),
      });

      await new Promise((resolve) => setTimeout(resolve, 5000));

      await fetch(`https://discord.com/api/v10/channels/${channelId}`, {
        method: "DELETE",
        headers: { Authorization: `Bot ${botToken}` },
      });
    } catch (error) {
      console.error("[discord-interactions] Error closing:", error);
    }
  })();

  return NextResponse.json({
    type: 4,
    data: {
      content: "Closing ticket... Channel will be deleted in 5 seconds.",
      flags: 64,
    },
  });
}
