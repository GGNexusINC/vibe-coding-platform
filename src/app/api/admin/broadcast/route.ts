import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { logActivity } from "@/lib/activity-log";
import { env } from "@/lib/env";
import type { DiscordWebhookPayload } from "@/lib/discord";

const allowedTargets = ["ban-page", "general-chat"];

function parseDiscordColor(input: string) {
  const raw = input.trim().replace("#", "");
  if (!raw) return null;
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return null;
  return Number.parseInt(raw, 16);
}

export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const target = String(body?.target ?? "").trim();
  const audienceLabel = String(body?.audienceLabel ?? "").trim();
  const title = String(body?.title ?? "").trim();
  const message = String(body?.message ?? "").trim();
  const color = String(body?.color ?? "").trim();
  const imageUrl = String(body?.imageUrl ?? "").trim();
  const imageDataUrl = String(body?.imageDataUrl ?? "").trim();

  if (!allowedTargets.includes(target)) {
    return NextResponse.json(
      { ok: false, error: "Choose a valid destination." },
      { status: 400 },
    );
  }

  if (!title || !message) {
    return NextResponse.json(
      { ok: false, error: "Title and message are required." },
      { status: 400 },
    );
  }

  if (
    title.length > 80 ||
    message.length > 1500 ||
    audienceLabel.length > 80 ||
    color.length > 7 ||
    imageUrl.length > 500
  ) {
    return NextResponse.json(
      { ok: false, error: "Message is too long." },
      { status: 400 },
    );
  }

  const embedColor = parseDiscordColor(color);
  if (color && embedColor === null) {
    return NextResponse.json(
      { ok: false, error: "Use a valid hex color like #22c55e." },
      { status: 400 },
    );
  }

  if (imageUrl) {
    try {
      const parsed = new URL(imageUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new Error("invalid");
      }
    } catch {
      return NextResponse.json(
        { ok: false, error: "Use a valid image URL." },
        { status: 400 },
      );
    }
  }

  try {
    await logActivity({
      type: "admin_broadcast",
      username: "Admin",
      details: `Broadcast sent for ${target}: ${title}${audienceLabel ? ` (${audienceLabel})` : ""}`,
    });

    const webhookUrl = env.discordWebhookUrlForPage(target);
    if (!webhookUrl) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Discord webhook URL is not configured on the server. Set DISCORD_WEBHOOK_URL (or DISCORD_WEBHOOK_URL_BAN_PAGE / DISCORD_WEBHOOK_URL_GENERAL_CHAT).",
        },
        { status: 500 },
      );
    }

    const embedImageUrl = imageUrl || (imageDataUrl ? "attachment://broadcast.png" : undefined);

    const payload: DiscordWebhookPayload = {
      username: "NewHopeGGN Admin",
      content:
        `Admin Site Broadcast\n` +
        `Target route: ${target}\n` +
        `Audience label: ${audienceLabel || "Default"}\n` +
        `Title: ${title}\n\n` +
        `${message}`,
      embeds: [
        {
          title,
          description: message,
          color: embedColor ?? undefined,
          image: embedImageUrl ? { url: embedImageUrl } : undefined,
          fields: [
            { name: "Target", value: target, inline: true },
            { name: "Label", value: audienceLabel || "Default", inline: true },
          ],
        },
      ],
    };

    if (imageDataUrl && imageDataUrl.startsWith("data:")) {
      const [meta, b64] = imageDataUrl.split(",");
      const mimeMatch = meta.match(/data:([^;]+);/);
      const mime = mimeMatch?.[1] ?? "image/png";
      const ext = mime.split("/")[1] ?? "png";
      const buffer = Buffer.from(b64, "base64");

      const form = new FormData();
      form.append("payload_json", JSON.stringify(payload));
      form.append(
        "files[0]",
        new Blob([buffer], { type: mime }),
        `broadcast.${ext}`,
      );

      const res = await fetch(webhookUrl, { method: "POST", body: form });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Discord webhook failed: ${res.status} ${txt}`);
      }
    } else {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Discord webhook failed: ${res.status} ${txt}`);
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json(
      { ok: false, error: `Failed to send Discord message: ${msg}` },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
