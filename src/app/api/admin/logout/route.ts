import { NextResponse } from "next/server";
import { clearAdminSession, getAdminSession } from "@/lib/admin-auth";
import { getRecentActivities, logActivity } from "@/lib/activity-log";
import { sendDiscordWebhook } from "@/lib/discord";
import { env } from "@/lib/env";
import {
  clientAuditDiscordFields,
  inspectRequest,
  requestInfoDiscordFields,
  requestInfoMetadata,
} from "@/lib/request-inspector";

export async function POST(req: Request) {
  const session = await getAdminSession();
  const username = session?.username ?? "Unknown Admin";
  const discordId = session?.discord_id ?? null;
  const requestInfo = inspectRequest(req);
  const ts = Math.floor(Date.now() / 1000);
  const latestClientAudit = discordId
    ? (await getRecentActivities(80)).find(
        (entry) => entry.type === "device_audit" && entry.discordId === discordId,
      )?.metadata
    : undefined;

  await clearAdminSession();

  if (discordId) {
    await Promise.resolve(
      logActivity({
        type: "logout",
        username,
        discordId,
        details: "Admin signed out from the admin panel.",
        metadata: requestInfoMetadata(requestInfo, {
          isAdmin: true,
          pageUrl: "/api/admin/logout",
        }),
      }),
    ).catch(() => {});
  }

  await Promise.resolve(
    sendDiscordWebhook(
      {
        username: "NewHopeGGN Security",
        embeds: [{
          title: "Admin Logged Out",
          color: 0xf59e0b,
          description: `Admin session ended <t:${ts}:R>.`,
          fields: [
            { name: "Admin", value: discordId ? `<@${discordId}> (${username})` : username, inline: true },
            ...clientAuditDiscordFields(latestClientAudit),
            ...requestInfoDiscordFields(requestInfo),
          ],
          footer: { text: "NewHopeGGN Admin Panel" },
          timestamp: new Date().toISOString(),
        }],
      },
      { webhookUrl: env.discordWebhookUrlForPage("staff-page") },
    ),
  ).catch(() => {});

  return NextResponse.json({ ok: true });
}
