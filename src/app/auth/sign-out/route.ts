import { NextResponse } from "next/server";
import { clearSession, getSession } from "@/lib/session";
import { getRecentActivities, logActivity } from "@/lib/activity-log";
import {
  clientAuditDiscordFields,
  inspectRequest,
  requestInfoDiscordFields,
  requestInfoMetadata,
} from "@/lib/request-inspector";
import { getDynamicWebhookUrl } from "@/lib/webhooks";
import { brandDiscordWebhookPayload } from "@/lib/discord";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;
  const now = new Date().toISOString();
  const user = await getSession();
  const requestInfo = inspectRequest(req);
  const latestClientAudit = user?.discord_id
    ? (await getRecentActivities(80)).find(
        (entry) => entry.type === "device_audit" && entry.discordId === user.discord_id,
      )?.metadata
    : undefined;

  await clearSession();

  if (user?.discord_id) {
    try {
      await logActivity({
        type: "logout",
        username: user.username,
        discordId: user.discord_id,
        avatarUrl: user.avatar_url ?? undefined,
        globalName: user.global_name,
        discriminator: user.discriminator,
        profile: user.discord_profile,
        details: "User signed out from dashboard.",
        metadata: requestInfoMetadata(requestInfo, {
          pageUrl: "/auth/sign-out",
          origin,
        }),
      });

      const webhookUrl = await getDynamicWebhookUrl("login-audits");
      if (webhookUrl) {
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(brandDiscordWebhookPayload({
            username: "NewHopeGGN Logs",
            embeds: [{
              title: "🚪 Member Signed Out",
              color: 0xf59e0b,
              description: `Session ended <t:${Math.floor(Date.now() / 1000)}:R>.`,
              fields: [
                { name: "Member", value: `<@${user.discord_id}> (${user.username})`, inline: true },
                { name: "Discord ID", value: `\`${user.discord_id}\``, inline: true },
                { name: "Route", value: "`/auth/sign-out`", inline: true },
                { name: "Origin", value: `\`${origin}\``, inline: true },
                ...clientAuditDiscordFields(latestClientAudit),
                ...requestInfoDiscordFields(requestInfo),
              ],
              thumbnail: user.avatar_url ? { url: user.avatar_url } : undefined,
              footer: { text: "NewHopeGGN Logout Audit" },
              timestamp: now,
            }],
          })),
        }).catch(e => console.error("Logout webhook POST failed", e));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown error";
      console.error("Logout webhook failed", msg);
    }
  }

  return NextResponse.redirect(`${origin}/`, { status: 303 });
}

