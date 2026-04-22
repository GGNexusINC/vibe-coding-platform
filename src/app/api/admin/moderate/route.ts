import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { env, KNOWN_ADMINS } from "@/lib/env";
import { createClient } from "@supabase/supabase-js";
import { logActivity } from "@/lib/activity-log";
import {
  brandDiscordWebhookPayload,
  NEWHOPE_LOGO_URL,
  type DiscordWebhookPayload,
} from "@/lib/discord";

const DISCORD_API = "https://discord.com/api/v10";
const GUILD_ID = process.env.GUILD_ID || "1419522458075005023";
const BOT_TOKEN = process.env.BOT_TOKEN;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function officialAuthor(name: string) {
  return { name, icon_url: NEWHOPE_LOGO_URL };
}

function officialFooter(text = "NewHopeGGN Moderation System") {
  return { text, icon_url: NEWHOPE_LOGO_URL };
}

async function postModerationWebhook(
  payload: DiscordWebhookPayload,
  webhookUrl = env.discordWebhookUrlForPage("staff-page"),
) {
  if (!webhookUrl) return;
  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(
      brandDiscordWebhookPayload(payload, {
        username: "NewHopeGGN Moderation",
        footerText: "NewHopeGGN Moderation System",
      }),
    ),
  }).catch(() => {});
}

function moderationEmbed(input: {
  title: string;
  description: string;
  color: number;
  fields: Array<Record<string, unknown>>;
  author?: string;
  footer?: string;
}) {
  return {
    author: officialAuthor(input.author ?? "NewHopeGGN - Official Moderation"),
    title: input.title,
    description: input.description,
    color: input.color,
    fields: input.fields,
    thumbnail: { url: NEWHOPE_LOGO_URL },
    footer: officialFooter(input.footer),
    timestamp: new Date().toISOString(),
  };
}

function isOwnerSession(discordId?: string): boolean {
  if (!discordId) return false;
  return KNOWN_ADMINS.some((a) => a.discordId === discordId && a.role === "owner");
}

async function checkIfAdmin(discordId: string): Promise<boolean> {
  const sb = getSupabase();
  const { data } = await sb.from("admin_roster").select("status").eq("discord_id", discordId).single();
  if (data?.status === "approved") return true;
  return KNOWN_ADMINS.some((a) => a.discordId === discordId);
}

async function createPendingBan(
  sb: ReturnType<typeof getSupabase>,
  targetId: string,
  targetName: string | null,
  reason: string,
  proposerId: string,
  proposerName: string,
) {
  const { data, error } = await sb
    .from("pending_bans")
    .insert({
      target_discord_id: targetId,
      target_username: targetName,
      reason,
      proposed_by_discord_id: proposerId,
      proposed_by_username: proposerName,
      status: "pending",
      approvals: [
        {
          discord_id: proposerId,
          username: proposerName,
          approved_at: new Date().toISOString(),
          note: "Proposed ban",
        },
      ],
      required_approvals: 2,
    })
    .select()
    .single();
  return { data, error };
}

async function approvePendingBan(
  sb: ReturnType<typeof getSupabase>,
  pendingBanId: string,
  approverId: string,
  approverName: string,
  note?: string,
) {
  const { data: existing } = await sb.from("pending_bans").select("*").eq("id", pendingBanId).single();
  if (!existing) return { error: "Pending ban not found", executed: false };
  if (existing.status !== "pending") return { error: "Ban is no longer pending", executed: false };

  const approvals = [...(existing.approvals || [])];
  if (approvals.some((a: Record<string, unknown>) => a.discord_id === approverId)) {
    return { error: "You have already approved this ban", executed: false };
  }

  approvals.push({
    discord_id: approverId,
    username: approverName,
    approved_at: new Date().toISOString(),
    note: note || "Approved",
  });

  const hasEnoughApprovals = approvals.length >= (existing.required_approvals || 2);

  if (!hasEnoughApprovals) {
    await sb.from("pending_bans").update({ approvals }).eq("id", pendingBanId);
    return { executed: false, approvalsCount: approvals.length };
  }

  const res = await fetch(`${DISCORD_API}/guilds/${GUILD_ID}/bans/${existing.target_discord_id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bot ${BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      reason: `[Admin Panel] Multi-sig ban approved by ${approvals
        .map((a: Record<string, unknown>) => a.username)
        .join(", ")}. Reason: ${existing.reason}`,
      delete_message_seconds: 0,
    }),
  });

  if (!res.ok && res.status !== 204) {
    return { error: `Discord ban failed: ${await res.text()}`, executed: false };
  }

  await sb
    .from("pending_bans")
    .update({
      status: "executed",
      executed_at: new Date().toISOString(),
      executed_by_discord_id: approverId,
      executed_by_username: approverName,
      approvals,
    })
    .eq("id", pendingBanId);

  await sb.from("admin_actions").insert({
    actor_discord_id: approverId,
    actor_username: approverName,
    target_discord_id: existing.target_discord_id,
    action: "ban",
    reason: `[Multi-sig] ${existing.reason} | Approved by: ${approvals
      .map((a: Record<string, unknown>) => a.username)
      .join(", ")}`,
    created_at: new Date().toISOString(),
  });

  return {
    executed: true,
    targetId: existing.target_discord_id as string,
    targetName: existing.target_username as string | null,
    reason: existing.reason as string,
  };
}

export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });

  if (!BOT_TOKEN) {
    return NextResponse.json({ ok: false, error: "Bot token not configured on server." }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const action: "warn" | "ban" | "unban" = body?.action;
  const targetDiscordId: string = String(body?.targetDiscordId ?? "").trim();
  const reason: string = String(body?.reason ?? "No reason provided").trim().slice(0, 512);

  if (!["warn", "ban", "unban"].includes(action)) {
    return NextResponse.json({ ok: false, error: "Invalid action. Use warn, ban, or unban." }, { status: 400 });
  }
  if (!targetDiscordId || !/^\d{15,20}$/.test(targetDiscordId)) {
    return NextResponse.json({ ok: false, error: "Invalid Discord ID." }, { status: 400 });
  }

  const actorId = admin.discord_id ?? "unknown";
  const actorName = admin.username ?? "Admin";
  const isOwner = isOwnerSession(actorId);

  if (action === "ban" && !isOwner) {
    const targetIsAdmin = await checkIfAdmin(targetDiscordId);
    if (targetIsAdmin) {
      return NextResponse.json(
        { ok: false, error: "You cannot ban other admins. Only owners can ban admins." },
        { status: 403 },
      );
    }
  }

  if (action === "ban" && !isOwner) {
    const sb = getSupabase();
    const { data: targetMember } = await sb
      .from("guild_members")
      .select("username, display_name")
      .eq("discord_id", targetDiscordId)
      .single();
    const targetName = targetMember?.display_name || targetMember?.username || null;
    const { data: pendingBan, error } = await createPendingBan(
      sb,
      targetDiscordId,
      targetName,
      reason,
      actorId,
      actorName,
    );

    if (error) {
      return NextResponse.json({ ok: false, error: `Failed to create pending ban: ${error.message}` }, { status: 500 });
    }

    await postModerationWebhook({
      username: "NewHopeGGN Moderation",
      embeds: [
        moderationEmbed({
          author: "NewHopeGGN - Multi-Sig Ban Pending",
          title: "Ban Proposal Created",
          description: "A ban has been proposed and requires 1 more approval to execute.",
          color: 0xf59e0b,
          footer: "Visit Admin Panel - Mod Log to approve",
          fields: [
            { name: "Target", value: `<@${targetDiscordId}>${targetName ? ` (${targetName})` : ""}`, inline: true },
            { name: "Proposed By", value: actorName, inline: true },
            { name: "Reason", value: reason },
            { name: "Status", value: "Pending (1/2 approvals)", inline: true },
          ],
        }),
      ],
    });

    return NextResponse.json({
      ok: true,
      pending: true,
      message: "Ban proposal created. Requires 1 more admin approval to execute.",
      pendingBanId: pendingBan?.id,
    });
  }

  let discordResult = { ok: true, status: 0, body: "" };

  if (action === "ban") {
    const res = await fetch(`${DISCORD_API}/guilds/${GUILD_ID}/bans/${targetDiscordId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bot ${BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason: `[Admin Panel] ${actorName}: ${reason}`, delete_message_seconds: 0 }),
    });
    discordResult = { ok: res.ok, status: res.status, body: await res.text().catch(() => "") };
    if (!res.ok && res.status !== 204) {
      const errBody = discordResult.body;
      const hint =
        res.status === 403 && errBody.includes("Missing Permissions")
          ? " Fix: (1) Give bot 'Ban Members' permission. (2) Drag bot role ABOVE target member's highest role in Server Settings > Roles."
          : "";
      return NextResponse.json(
        { ok: false, error: `Discord ban failed (${res.status}): ${errBody}${hint}` },
        { status: 502 },
      );
    }
  } else if (action === "unban") {
    const res = await fetch(`${DISCORD_API}/guilds/${GUILD_ID}/bans/${targetDiscordId}`, {
      method: "DELETE",
      headers: { Authorization: `Bot ${BOT_TOKEN}` },
    });
    discordResult = { ok: res.ok, status: res.status, body: await res.text().catch(() => "") };
    if (!res.ok && res.status !== 204) {
      return NextResponse.json(
        { ok: false, error: `Discord unban failed (${res.status}): ${discordResult.body}` },
        { status: 502 },
      );
    }
  }

  if (action === "warn") {
    try {
      const dmRes = await fetch(`${DISCORD_API}/users/@me/channels`, {
        method: "POST",
        headers: {
          Authorization: `Bot ${BOT_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ recipient_id: targetDiscordId }),
      });
      if (dmRes.ok) {
        const dm = await dmRes.json();
        await fetch(`${DISCORD_API}/channels/${dm.id}/messages`, {
          method: "POST",
          headers: {
            Authorization: `Bot ${BOT_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            embeds: [
              moderationEmbed({
                author: "NewHopeGGN - Official Warning",
                title: "Official Warning",
                description: `> ${reason}`,
                color: 0xf59e0b,
                footer: "Please review our server rules to avoid further action.",
                fields: [
                  { name: "Issued By", value: actorName, inline: true },
                  { name: "Server", value: "NewHopeGGN", inline: true },
                ],
              }),
            ],
          }),
        });
      }
    } catch {
      // DM failure is non-fatal.
    }
  }

  const sb = getSupabase();
  await sb.from("admin_actions").insert({
    actor_discord_id: actorId,
    actor_username: actorName,
    target_discord_id: targetDiscordId,
    action,
    reason,
    created_at: new Date().toISOString(),
  });

  const actionLabel = action === "warn" ? "Warning" : action === "ban" ? "Ban" : "Unban";
  await logActivity({
    type: "admin_broadcast",
    username: actorName,
    discordId: actorId,
    details: `${actionLabel} issued to <@${targetDiscordId}>: ${reason}`,
  });

  const embedColor = action === "warn" ? 0xf59e0b : action === "ban" ? 0xef4444 : 0x22c55e;
  const embedTitle = action === "warn" ? "Warning Issued" : action === "ban" ? "Member Banned" : "Member Unbanned";
  const embedDesc =
    action === "warn"
      ? "A formal warning has been issued to this member."
      : action === "ban"
        ? "This member has been banned from the server."
        : "This member's ban has been lifted.";

  await postModerationWebhook({
    username: "NewHopeGGN Moderation",
    embeds: [
      moderationEmbed({
        title: embedTitle,
        description: embedDesc,
        color: embedColor,
        footer: "NewHopeGGN Admin Panel",
        fields: [
          { name: "Member", value: `<@${targetDiscordId}>\n\`${targetDiscordId}\``, inline: true },
          { name: "Actioned By", value: actorName, inline: true },
          { name: "Case Type", value: actionLabel, inline: true },
          { name: "Reason", value: reason },
          { name: "Discord API", value: `${discordResult.status || "logged only"}`, inline: true },
          { name: "Recorded", value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
        ],
      }),
    ],
  });

  if (action === "ban") {
    const banWebhook = env.discordWebhookUrlForPage("ban-page");
    if (banWebhook) {
      await postModerationWebhook(
        {
          username: "NewHopeGGN Moderation",
          embeds: [
            moderationEmbed({
              author: "NewHopeGGN - Official Ban Notice",
              title: "Member Banned",
              description: "A member has been removed from the NewHopeGGN Discord server.",
              color: 0xef4444,
              footer: "NewHopeGGN Ban Log",
              fields: [
                { name: "Member", value: `<@${targetDiscordId}>\n\`${targetDiscordId}\``, inline: true },
                { name: "Reason", value: reason },
                { name: "Time", value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
              ],
            }),
          ],
        },
        banWebhook,
      );
    }
  }

  return NextResponse.json({ ok: true, action, targetDiscordId });
}

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });

  const sb = getSupabase();
  const [{ data: actions, error: actionsErr }, { data: pendingBans, error: pendingErr }] = await Promise.all([
    sb.from("admin_actions").select("*").order("created_at", { ascending: false }).limit(100),
    sb.from("pending_bans").select("*").order("proposed_at", { ascending: false }).limit(50),
  ]);

  if (actionsErr) return NextResponse.json({ ok: false, error: actionsErr.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    actions: actions ?? [],
    pendingBans: pendingBans ?? [],
    pendingError: pendingErr?.message,
  });
}

export async function PATCH(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { pendingBanId, action, note }: { pendingBanId?: string; action?: "approve" | "reject"; note?: string } = body;

  if (!pendingBanId || !action || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ ok: false, error: "Missing pendingBanId or invalid action (approve/reject)." }, { status: 400 });
  }

  const actorId = admin.discord_id ?? "unknown";
  const actorName = admin.username ?? "Admin";
  const sb = getSupabase();

  if (action === "reject") {
    const { data: existing } = await sb.from("pending_bans").select("*").eq("id", pendingBanId).single();
    if (!existing) return NextResponse.json({ ok: false, error: "Pending ban not found." }, { status: 404 });
    if (existing.status !== "pending") return NextResponse.json({ ok: false, error: "Ban is no longer pending." }, { status: 400 });

    const isOwner = isOwnerSession(actorId);
    const isProposer = existing.proposed_by_discord_id === actorId;

    if (!isOwner && !isProposer) {
      return NextResponse.json({ ok: false, error: "Only owners or the original proposer can reject a ban." }, { status: 403 });
    }

    await sb
      .from("pending_bans")
      .update({
        status: "rejected",
        rejection_reason: note || "Rejected by admin",
        rejected_by_discord_id: actorId,
        rejected_by_username: actorName,
        rejected_at: new Date().toISOString(),
      })
      .eq("id", pendingBanId);

    await postModerationWebhook({
      username: "NewHopeGGN Moderation",
      embeds: [
        moderationEmbed({
          author: "NewHopeGGN - Ban Proposal Rejected",
          title: "Ban Proposal Rejected",
          description: "A pending ban proposal has been rejected.",
          color: 0x6b7280,
          fields: [
            { name: "Target", value: `<@${existing.target_discord_id}>`, inline: true },
            { name: "Rejected By", value: actorName, inline: true },
            { name: "Reason", value: existing.reason },
            ...(note ? [{ name: "Rejection Note", value: note }] : []),
          ],
        }),
      ],
    });

    return NextResponse.json({ ok: true, rejected: true });
  }

  const result = await approvePendingBan(sb, pendingBanId, actorId, actorName, note);

  if (result.error) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  if (result.executed) {
    await postModerationWebhook({
      username: "NewHopeGGN Moderation",
      embeds: [
        moderationEmbed({
          author: "NewHopeGGN - Multi-Sig Ban Executed",
          title: "Ban Executed (Multi-Sig)",
          description: "The pending ban reached required approvals and has been executed.",
          color: 0xef4444,
          fields: [
            { name: "Target", value: `<@${result.targetId}>`, inline: true },
            { name: "Final Approval By", value: actorName, inline: true },
            { name: "Status", value: "Executed", inline: true },
          ],
        }),
      ],
    });

    const banWebhook = env.discordWebhookUrlForPage("ban-page");
    if (banWebhook) {
      await postModerationWebhook(
        {
          username: "NewHopeGGN Moderation",
          embeds: [
            moderationEmbed({
              author: "NewHopeGGN - Official Ban Notice",
              title: "Member Banned",
              description: "A multi-signature ban has been executed.",
              color: 0xef4444,
              footer: "NewHopeGGN Ban Log",
              fields: [
                { name: "Member", value: `<@${result.targetId}>`, inline: true },
                { name: "Reason", value: result.reason ?? "No reason provided" },
                { name: "Time", value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
              ],
            }),
          ],
        },
        banWebhook,
      );
    }

    return NextResponse.json({ ok: true, executed: true, targetId: result.targetId });
  }

  return NextResponse.json({ ok: true, executed: false, approvalsCount: result.approvalsCount });
}
