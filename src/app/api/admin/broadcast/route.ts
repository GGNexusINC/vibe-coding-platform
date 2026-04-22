import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { logActivity } from "@/lib/activity-log";
import { env } from "@/lib/env";
import { createClient } from "@supabase/supabase-js";
import type { DiscordWebhookPayload } from "@/lib/discord";
import { ansiBlock, holographic, neon, goldGradient, ansi, decorations } from "@/lib/discord-formatting";

export const dynamic = "force-dynamic";

const allowedTargets = ["ban-page", "general-chat", "staff-page", "wipe"];

export type CustomWebhook = { id: string; label: string; url: string };

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}

async function getCustomWebhooks(): Promise<CustomWebhook[]> {
  try {
    const sb = getSupabase();
    const { data } = await sb.from("site_settings").select("value").eq("key", "custom_webhooks").single();
    return (data?.value as CustomWebhook[]) ?? [];
  } catch { return []; }
}

async function saveCustomWebhooks(hooks: CustomWebhook[]) {
  const sb = getSupabase();
  await sb.from("site_settings").upsert({ key: "custom_webhooks", value: hooks }, { onConflict: "key" });
}

function parseDiscordColor(input: string) {
  const raw = input.trim().replace("#", "");
  if (!raw) return null;
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return null;
  return Number.parseInt(raw, 16);
}

// Apply formatting style to message
function applyFormatting(text: string, style: string): string {
  switch (style) {
    case "holographic":
      return ansiBlock(`${decorations.sparkles} ${holographic(text)} ${decorations.sparkles}`);
    case "neon":
      return ansiBlock(`${decorations.fire} ${neon(text)} ${decorations.fire}`);
    case "gold":
      return ansiBlock(`${decorations.crown} ${goldGradient(text)} ${decorations.crown}`);
    case "ansi":
      return ansiBlock(text);
    default:
      return text;
  }
}

// GET — return custom webhooks list
export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  const hooks = await getCustomWebhooks();
  return NextResponse.json({ ok: true, hooks });
}

// DELETE — remove a custom webhook by id
export async function DELETE(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  const { id } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
  const hooks = await getCustomWebhooks();
  await saveCustomWebhooks(hooks.filter(h => h.id !== id));
  return NextResponse.json({ ok: true });
}

// PUT — add a new custom webhook
export async function PUT(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  const { label, url } = await req.json().catch(() => ({}));
  if (!label || !url) return NextResponse.json({ ok: false, error: "Label and URL required" }, { status: 400 });
  try { new URL(url); } catch { return NextResponse.json({ ok: false, error: "Invalid URL" }, { status: 400 }); }
  const hooks = await getCustomWebhooks();
  hooks.push({ id: crypto.randomUUID(), label: String(label).slice(0, 60), url: String(url).slice(0, 500) });
  await saveCustomWebhooks(hooks);
  return NextResponse.json({ ok: true, hooks });
}

// POST — send broadcast message
export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

  const contentType = req.headers.get("content-type") ?? "";
  let target = "", audienceLabel = "", title = "", message = "", color = "", imageUrl = "", formatStyle = "normal";
  let imageFile: File | null = null;

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    if (!form) return NextResponse.json({ ok: false, error: "Invalid form data." }, { status: 400 });
    target = String(form.get("target") ?? "").trim();
    audienceLabel = String(form.get("audienceLabel") ?? "").trim();
    title = String(form.get("title") ?? "").trim();
    message = String(form.get("message") ?? "");
    color = String(form.get("color") ?? "").trim();
    imageUrl = String(form.get("imageUrl") ?? "").trim();
    formatStyle = String(form.get("formatStyle") ?? "").trim() as "normal" | "holographic" | "neon" | "gold" | "ansi";
    const f = form.get("imageFile");
    if (f && typeof f !== "string") imageFile = f as File;
  } else {
    const body = await req.json().catch(() => ({}));
    target = String(body?.target ?? "").trim();
    audienceLabel = String(body?.audienceLabel ?? "").trim();
    title = String(body?.title ?? "").trim();
    message = String(body?.message ?? "");
    color = String(body?.color ?? "").trim();
    imageUrl = String(body?.imageUrl ?? "").trim();
    formatStyle = (body?.formatStyle ?? "") as "normal" | "holographic" | "neon" | "gold" | "ansi";
  }

  // Look up custom webhook URL if target is not a built-in
  let customWebhookUrl: string | undefined;
  if (!allowedTargets.includes(target)) {
    const customHooks = await getCustomWebhooks();
    const found = customHooks.find((h: CustomWebhook) => h.id === target);
    if (!found) {
      return NextResponse.json({ ok: false, error: "Choose a valid destination." }, { status: 400 });
    }
    customWebhookUrl = found.url;
  }

  if (!title || !message.trim()) {
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

    const webhookUrl = customWebhookUrl || env.discordWebhookUrlForPage(target);
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

    const customHooksForLabel = await getCustomWebhooks();
    const targetLabel: Record<string, string> = {
      "general-chat": "💬 General Chat",
      "ban-page": "🔨 Ban Page",
      "staff-page": "🛡️ Staff Page",
      "wipe": "😺 Wipe Channel",
      ...Object.fromEntries(customHooksForLabel.map(h => [h.id, `🔗 ${h.label}`])),
    };

    // Apply formatting style to message
    const formattedMessage = formatStyle !== "normal" 
      ? applyFormatting(message.trimEnd(), formatStyle)
      : message.trimEnd();

    // If using ANSI formatting, we need to add it as content instead of embed description
    const useAnsi = formatStyle !== "normal";

    const payload: DiscordWebhookPayload = {
      username: "NewHopeGGN",
      avatar_url: "https://cdn.discordapp.com/icons/1419522458075005023/a_placeholder.png",
      content: useAnsi ? `${decorations.sparkles} **${title}** ${decorations.sparkles}\n${formattedMessage}` : undefined,
      embeds: useAnsi ? [] : [
        {
          author: {
            name: audienceLabel ? `📣 Admin Broadcast · ${audienceLabel}` : "📣 Admin Broadcast",
          },
          title,
          description: formattedMessage,
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
