import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { logActivity } from "@/lib/activity-log";
import { sendDiscordWebhook } from "@/lib/discord";
import { env } from "@/lib/env";
import { getSession } from "@/lib/session";
import { inspectRequest, requestInfoMetadata } from "@/lib/request-inspector";

const STAFF_WEBHOOK =
  env.discordWebhookUrlForPage("staff-audits") || env.discordWebhookUrlForPage("staff-page");

function text(value: unknown, fallback = "Unknown", max = 700) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.length > max ? `${trimmed.slice(0, max - 3)}...` : trimmed;
}

function num(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function boolLabel(value: unknown) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return "Unknown";
}

export async function POST(req: Request) {
  const [userSession, adminSession] = await Promise.all([getSession(), getAdminSession()]);
  const activeSession = adminSession?.discord_id ? adminSession : userSession;

  if (!activeSession?.discord_id) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const requestInfo = inspectRequest(req);
  const isAdmin = Boolean(adminSession?.discord_id);
  const username = activeSession.username ?? "Unknown";
  const discordId = activeSession.discord_id;
  const screen = typeof body?.screen === "object" && body.screen ? body.screen : {};
  const viewport = typeof body?.viewport === "object" && body.viewport ? body.viewport : {};
  const connection = typeof body?.connection === "object" && body.connection ? body.connection : {};
  const gpu = text(body?.gpu, "Unavailable");
  const gpuVendor = text(body?.gpuVendor, "Unknown");
  const pageUrl = text(body?.pageUrl, "/", 240);

  const metadata: Record<string, unknown> = requestInfoMetadata(requestInfo, {
    isAdmin,
    pageUrl,
    href: text(body?.href, "Unknown", 500),
    referrer: text(body?.referrer, "Unknown", 500),
    gpu,
    gpuVendor,
    browserGpu: gpu,
    browserGpuVendor: gpuVendor,
    platform: text(body?.platform, requestInfo.platform),
    mobile: boolLabel(body?.mobile),
    language: text(body?.language, requestInfo.language),
    languages: Array.isArray(body?.languages) ? body.languages.join(", ") : requestInfo.languages,
    timezone: text(body?.timezone, "Unknown"),
    hardwareConcurrency: num(body?.hardwareConcurrency),
    deviceMemory: num(body?.deviceMemory),
    maxTouchPoints: num(body?.maxTouchPoints),
    screenWidth: num(screen.width),
    screenHeight: num(screen.height),
    screenAvailWidth: num(screen.availWidth),
    screenAvailHeight: num(screen.availHeight),
    colorDepth: num(screen.colorDepth),
    pixelDepth: num(screen.pixelDepth),
    devicePixelRatio: num(screen.devicePixelRatio),
    viewportWidth: num(viewport.width),
    viewportHeight: num(viewport.height),
    connectionType: text(connection.type || connection.connectionType, "Unknown"),
    effectiveType: text(connection.effectiveType, "Unknown"),
    downlink: num(connection.downlink),
    rtt: num(connection.rtt),
    saveData: Boolean(connection.saveData),
    userAgent: text(body?.userAgent, requestInfo.userAgent, 1000),
    userAgentBrands: Array.isArray(body?.userAgentBrands)
      ? body.userAgentBrands
          .map((brand: { brand?: string; version?: string }) => `${brand.brand ?? "Unknown"} ${brand.version ?? ""}`.trim())
          .join(", ")
      : "Unknown",
  });

  await logActivity({
    type: "device_audit",
    username,
    discordId,
    avatarUrl: "avatar_url" in activeSession ? (activeSession.avatar_url ?? undefined) : undefined,
    globalName: "global_name" in activeSession ? activeSession.global_name : undefined,
    discriminator: "discriminator" in activeSession ? activeSession.discriminator : undefined,
    profile: "discord_profile" in activeSession ? activeSession.discord_profile : undefined,
    details: `Client hardware audit captured. GPU: ${gpu}`,
    metadata,
  });

  await Promise.resolve(
    sendDiscordWebhook(
      {
        username: "NewHopeGGN Security",
        embeds: [{
          title: "Client Device Audit Captured",
          color: 0x38bdf8,
          description: `${isAdmin ? "Admin" : "Member"} browser hardware details were captured after sign-in.`,
          fields: [
            { name: "User", value: `<@${discordId}> (${username})`, inline: true },
            { name: "Role", value: isAdmin ? "Admin" : "Member", inline: true },
            { name: "Page", value: `\`${pageUrl}\``, inline: true },
            { name: "GPU", value: gpu, inline: false },
            { name: "GPU Vendor", value: gpuVendor, inline: true },
            { name: "CPU Cores", value: String(metadata.hardwareConcurrency ?? "Unknown"), inline: true },
            { name: "Device Memory", value: metadata.deviceMemory ? `${metadata.deviceMemory} GB` : "Unknown", inline: true },
            {
              name: "Screen",
              value: `${metadata.screenWidth ?? "?"}x${metadata.screenHeight ?? "?"} @ ${metadata.devicePixelRatio ?? "?"} DPR`,
              inline: true,
            },
            { name: "Timezone", value: String(metadata.timezone ?? "Unknown"), inline: true },
            { name: "Connection", value: `${metadata.effectiveType ?? "Unknown"} / ${metadata.downlink ?? "?"} Mbps`, inline: true },
          ],
          footer: { text: "NewHopeGGN Client Hardware Audit" },
          timestamp: new Date().toISOString(),
        }],
      },
      { webhookUrl: STAFF_WEBHOOK },
    ),
  ).catch(() => {});

  return NextResponse.json({ ok: true });
}
