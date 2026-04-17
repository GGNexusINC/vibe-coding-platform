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

  const contentType = req.headers.get("content-type") ?? "";
  let target = "", audienceLabel = "", title = "", message = "", color = "", imageUrl = "";
  let imageFile: File | null = null;

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    if (!form) return NextResponse.json({ ok: false, error: "Invalid form data." }, { status: 400 });
    target = String(form.get("target") ?? "").trim();
    audienceLabel = String(form.get("audienceLabel") ?? "").trim();
    title = String(form.get("title") ?? "").trim();
    message = String(form.get("message") ?? "").trim();
    color = String(form.get("color") ?? "").trim();
    imageUrl = String(form.get("imageUrl") ?? "").trim();
    const f = form.get("imageFile");
    if (f && typeof f !== "string") imageFile = f as File;
  } else {
    const body = await req.json().catch(() => ({}));
    target = String(body?.target ?? "").trim();
    audienceLabel = String(body?.audienceLabel ?? "").trim();
    title = String(body?.title ?? "").trim();
    message = String(body?.message ?? "").trim();
    color = String(body?.color ?? "").trim();
    imageUrl = String(body?.imageUrl ?? "").trim();
  }

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

    const hasFile = imageFile && imageFile.size > 0;
    const ext = imageFile ? (imageFile.type.split("/")[1] ?? "png") : "png";
    const attachmentName = `broadcast.${ext}`;
    const embedImageUrl = imageUrl || (hasFile ? `attachment://${attachmentName}` : undefined);

    const targetLabel: Record<string, string> = {
      "general-chat": "💬 General Chat",
      "ban-page": "🔨 Ban Page",
    };

    const payload: DiscordWebhookPayload = {
      username: "NewHopeGGN",
      avatar_url: "https://cdn.discordapp.com/icons/1419522458075005023/a_placeholder.png",
      embeds: [
        {
          author: {
            name: audienceLabel ? `📣 Admin Broadcast · ${audienceLabel}` : "📣 Admin Broadcast",
          },
          title,
          description: message,
          color: embedColor ?? 0x22c55e,
          image: embedImageUrl ? { url: embedImageUrl } : undefined,
          fields: [
            { name: "Channel", value: targetLabel[target] ?? target, inline: true },
            ...(audienceLabel ? [{ name: "Audience", value: audienceLabel, inline: true }] : []),
          ],
          footer: { text: "NewHopeGGN Admin Panel" },
          timestamp: new Date().toISOString(),
        },
      ],
    };

    if (hasFile && imageFile) {
      const buffer = await imageFile.arrayBuffer();
      const discordForm = new FormData();
      discordForm.append("payload_json", JSON.stringify(payload));
      discordForm.append(
        "files[0]",
        new Blob([buffer], { type: imageFile.type }),
        attachmentName,
      );
      const res = await fetch(webhookUrl, { method: "POST", body: discordForm });
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
