import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { KNOWN_ADMINS } from "@/lib/env";
import { createClient } from "@supabase/supabase-js";
import { logActivity } from "@/lib/activity-log";

const DISCORD_API = "https://discord.com/api/v10";
const GUILD_ID = process.env.GUILD_ID || "1419522458075005023";
const BOT_TOKEN = process.env.BOT_TOKEN;
const MOD_WEBHOOK = "https://discord.com/api/webhooks/1494203915053563986/UmeAj1IZseuwq5S9_zkDV-uIQd4Cq1hbdCMQ8peF-5dq4zjd_LOQR1Tr44OHrCrnkVu5";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function isOwnerSession(discordId?: string): boolean {
  if (!discordId) return false;
  return KNOWN_ADMINS.some((a) => a.discordId === discordId && a.role === "owner");
}

async function checkIfAdmin(discordId: string): Promise<boolean> {
  const sb = getSupabase();
  const { data } = await sb.from("admin_roster").select("status").eq("discord_id", discordId).single();
  if (data?.status === "approved") return true;
  // Also check KNOWN_ADMINS owners
  return KNOWN_ADMINS.some((a) => a.discordId === discordId);
}

async function createPendingBan(
  sb: ReturnType<typeof getSupabase>,
  targetId: string,
  targetName: string | null,
  reason: string,
  proposerId: string,
  proposerName: string
) {
  const { data, error } = await sb.from("pending_bans").insert({
    target_discord_id: targetId,
    target_username: targetName,
    reason,
    proposed_by_discord_id: proposerId,
    proposed_by_username: proposerName,
    status: "pending",
    approvals: [{ discord_id: proposerId, username: proposerName, approved_at: new Date().toISOString(), note: "Proposed ban" }],
    required_approvals: 2,
  }).select().single();
  return { data, error };
}

async function approvePendingBan(
  sb: ReturnType<typeof getSupabase>,
  pendingBanId: string,
  approverId: string,
  approverName: string,
  note?: string
) {
  // Get current pending ban
  const { data: existing } = await sb.from("pending_bans").select("*").eq("id", pendingBanId).single();
  if (!existing) return { error: "Pending ban not found", executed: false };
  if (existing.status !== "pending") return { error: "Ban is no longer pending", executed: false };

  const approvals = [...(existing.approvals || [])];
  // Check if already approved by this user
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

  if (hasEnoughApprovals) {
    // Execute the ban immediately
    const res = await fetch(`${DISCORD_API}/guilds/${GUILD_ID}/bans/${existing.target_discord_id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bot ${BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reason: `[Admin Panel] Multi-sig ban approved by ${approvals.map((a: Record<string, unknown>) => a.username).join(", ")}. Reason: ${existing.reason}`,
        delete_message_seconds: 0,
      }),
    });

    if (!res.ok && res.status !== 204) {
      return { error: `Discord ban failed: ${await res.text()}`, executed: false };
    }

    // Update pending ban to executed
    await sb.from("pending_bans").update({
      status: "executed",
      executed_at: new Date().toISOString(),
      executed_by_discord_id: approverId,
      executed_by_username: approverName,
      approvals,
    }).eq("id", pendingBanId);

    // Log to admin_actions
    await sb.from("admin_actions").insert({
      actor_discord_id: approverId,
      actor_username: approverName,
      target_discord_id: existing.target_discord_id,
      action: "ban",
      reason: `[Multi-sig] ${existing.reason} | Approved by: ${approvals.map((a: Record<string, unknown>) => a.username).join(", ")}`,
      created_at: new Date().toISOString(),
    });

    return { executed: true, targetId: existing.target_discord_id };
  } else {
    // Just update approvals
    await sb.from("pending_bans").update({ approvals }).eq("id", pendingBanId);
    return { executed: false, approvalsCount: approvals.length };
  }
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

  // Check if target is an admin/owner - regular admins cannot ban other admins
  if (action === "ban" && !isOwner) {
    const targetIsAdmin = await checkIfAdmin(targetDiscordId);
    if (targetIsAdmin) {
      return NextResponse.json({ ok: false, error: "You cannot ban other admins. Only owners can ban admins." }, { status: 403 });
    }
  }

  // Multi-signature ban for non-owner admins
  if (action === "ban" && !isOwner) {
    const sb = getSupabase();

    // Try to get target username from guild_members
    const { data: targetMember } = await sb.from("guild_members").select("username, display_name").eq("discord_id", targetDiscordId).single();
    const targetName = targetMember?.display_name || targetMember?.username || null;

    const { data: pendingBan, error } = await createPendingBan(sb, targetDiscordId, targetName, reason, actorId, actorName);

    if (error) {
      return NextResponse.json({ ok: false, error: `Failed to create pending ban: ${error.message}` }, { status: 500 });
    }

    // Send Discord webhook notification about pending ban
    await fetch(MOD_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "NewHopeGGN Moderation",
        embeds: [{
          author: { name: "NewHopeGGN · Multi-Sig Ban Pending" },
          title: "⏳ Ban Proposal Created",
          description: `A ban has been proposed and requires **1 more approval** to execute.`,
          color: 0xf59e0b,
          fields: [
            { name: "👤 Target", value: `<@${targetDiscordId}>${targetName ? ` (${targetName})` : ""}`, inline: true },
            { name: "📝 Proposed By", value: actorName, inline: true },
            { name: "📋 Reason", value: reason },
            { name: "Status", value: `🟡 Pending (1/2 approvals)`, inline: true },
          ],
          footer: { text: "Visit Admin Panel → Mod Log to approve" },
          timestamp: new Date().toISOString(),
        }],
      }),
    }).catch(() => {});

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
      let hint = "";
      if (res.status === 403 && errBody.includes("Missing Permissions")) {
        hint = " Fix: (1) Give bot 'Ban Members' permission. (2) Drag bot role ABOVE target member's highest role in Server Settings > Roles.";
      }
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
  // "warn" = no Discord API call, just logged + DM attempt below

  if (action === "warn") {
    // Attempt to DM via bot — best-effort, won't fail the request
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
            embeds: [{
              author: { name: "NewHopeGGN · Official Warning" },
              title: "⚠️ You have received a warning",
              description: `> ${reason}`,
              color: 0xf59e0b,
              fields: [
                { name: "Issued By", value: actorName, inline: true },
                { name: "Server", value: "NewHopeGGN", inline: true },
              ],
              footer: { text: "Please review our server rules to avoid further action." },
              timestamp: new Date().toISOString(),
            }],
          }),
        });
      }
    } catch { /* DM failure is non-fatal */ }
  }

  // Log to Supabase admin_actions table
  const sb = getSupabase();
  await sb.from("admin_actions").insert({
    actor_discord_id: actorId,
    actor_username: actorName,
    target_discord_id: targetDiscordId,
    action,
    reason,
    created_at: new Date().toISOString(),
  });

  // Log to activity feed
  const actionLabel = action === "warn" ? "⚠️ Warning" : action === "ban" ? "🔨 Ban" : "✅ Unban";
  await logActivity({
    type: "admin_broadcast",
    username: actorName,
    discordId: actorId,
    details: `${actionLabel} issued to <@${targetDiscordId}>: ${reason}`,
  });

  // Post to moderation webhook
  const embedColor = action === "warn" ? 0xf59e0b : action === "ban" ? 0xef4444 : 0x22c55e;
  const embedTitle = action === "warn" ? "⚠️ Warning Issued" : action === "ban" ? "🔨 Member Banned" : "✅ Member Unbanned";
  const embedDesc = action === "warn"
    ? "A formal warning has been issued to this member."
    : action === "ban"
    ? "This member has been banned from the server."
    : "This member's ban has been lifted.";

  await fetch(MOD_WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "NewHopeGGN Moderation",
      embeds: [{
        author: { name: "NewHopeGGN · Moderation Log" },
        title: embedTitle,
        description: embedDesc,
        color: embedColor,
        fields: [
          { name: "👤 Member", value: `<@${targetDiscordId}>\n\`${targetDiscordId}\``, inline: true },
          { name: "🛡️ Actioned By", value: actorName, inline: true },
          { name: "\u200b", value: "\u200b", inline: true },
          { name: "📋 Reason", value: reason },
        ],
        footer: { text: "NewHopeGGN Admin Panel" },
        timestamp: new Date().toISOString(),
      }],
    }),
  }).catch(() => { /* webhook failure is non-fatal */ });

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
    // Only owners or the original proposer can reject
    const { data: existing } = await sb.from("pending_bans").select("*").eq("id", pendingBanId).single();
    if (!existing) return NextResponse.json({ ok: false, error: "Pending ban not found." }, { status: 404 });
    if (existing.status !== "pending") return NextResponse.json({ ok: false, error: "Ban is no longer pending." }, { status: 400 });

    const isOwner = isOwnerSession(actorId);
    const isProposer = existing.proposed_by_discord_id === actorId;

    if (!isOwner && !isProposer) {
      return NextResponse.json({ ok: false, error: "Only owners or the original proposer can reject a ban." }, { status: 403 });
    }

    await sb.from("pending_bans").update({
      status: "rejected",
      rejection_reason: note || "Rejected by admin",
      rejected_by_discord_id: actorId,
      rejected_by_username: actorName,
      rejected_at: new Date().toISOString(),
    }).eq("id", pendingBanId);

    // Notify webhook
    await fetch(MOD_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "NewHopeGGN Moderation",
        embeds: [{
          author: { name: "NewHopeGGN · Ban Proposal Rejected" },
          title: "❌ Ban Proposal Rejected",
          description: `A pending ban proposal has been rejected.`,
          color: 0x6b7280,
          fields: [
            { name: "👤 Target", value: `<@${existing.target_discord_id}>`, inline: true },
            { name: "📝 Rejected By", value: actorName, inline: true },
            { name: "📋 Reason", value: existing.reason },
            ...(note ? [{ name: "Rejection Note", value: note }] : []),
          ],
          timestamp: new Date().toISOString(),
        }],
      }),
    }).catch(() => {});

    return NextResponse.json({ ok: true, rejected: true });
  }

  // Approve flow
  const result = await approvePendingBan(sb, pendingBanId, actorId, actorName, note);

  if (result.error) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  if (result.executed) {
    // Notify that ban was executed
    await fetch(MOD_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "NewHopeGGN Moderation",
        embeds: [{
          author: { name: "NewHopeGGN · Multi-Sig Ban Executed" },
          title: "🔨 Ban Executed (Multi-Sig)",
          description: `The pending ban reached required approvals and has been executed.`,
          color: 0xef4444,
          fields: [
            { name: "👤 Target", value: `<@${result.targetId}>`, inline: true },
            { name: "✅ Final Approval By", value: actorName, inline: true },
            { name: "Status", value: "🟢 Executed", inline: true },
          ],
          footer: { text: "Multi-signature moderation system" },
          timestamp: new Date().toISOString(),
        }],
      }),
    }).catch(() => {});

    return NextResponse.json({ ok: true, executed: true, targetId: result.targetId });
  }

  return NextResponse.json({ ok: true, executed: false, approvalsCount: result.approvalsCount });
}
