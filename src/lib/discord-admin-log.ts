import { env } from "@/lib/env";

export async function sendDiscordAdminLog(opts: {
  title: string;
  description: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
}) {
  const token = env.discordBotToken();
  const channelId = env.discordLogChannelId();
  if (!token || !channelId) return false;

  const payload = {
    embeds: [
      {
        title: opts.title,
        description: opts.description,
        color: opts.color ?? 0x22d3ee,
        fields: opts.fields ?? [],
        timestamp: new Date().toISOString(),
        footer: { text: "NewHopeGGN Admin Control" },
      },
    ],
  };

  const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bot ${token}`,
    },
    body: JSON.stringify(payload),
  });

  return res.ok;
}
