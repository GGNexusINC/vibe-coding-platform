import { NextResponse } from "next/server";
import { getAdminSession, isAdminDiscordId } from "@/lib/admin-auth";
import { getBorrowRequests, createBorrowRequest } from "@/lib/borrow-store";
import { sendDiscordWebhook } from "@/lib/discord";

export async function GET() {
  const session = await getAdminSession();
  if (!session || !session.discord_id) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  try {
    const isOwner = isAdminDiscordId(session.discord_id);
    // If owner, get all requests. If regular staff, only get their own.
    const requests = await getBorrowRequests(isOwner ? undefined : session.discord_id);
    return NextResponse.json({ ok: true, requests });
  } catch (error) {
    console.error("[borrow-api] GET error", error);
    return NextResponse.json({ ok: false, error: "Failed to fetch borrow requests." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session || !session.discord_id) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const amount = Number(body?.amount);
    const reason = String(body?.reason ?? "").trim();
    const preferredCycle = String(body?.preferredCycle ?? "").trim();
    const repaymentDayOfWeek = String(body?.repaymentDayOfWeek ?? "Monday").trim();
    const requestedInstallments = body?.requestedInstallments ? Number(body.requestedInstallments) : 4;
    const requestedApr = body?.requestedApr ? Number(body.requestedApr) : 15;

    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ ok: false, error: "Valid amount greater than 0 is required." }, { status: 400 });
    }
    if (!reason) {
      return NextResponse.json({ ok: false, error: "Reason is required." }, { status: 400 });
    }
    if (!["weekly", "biweekly", "monthly"].includes(preferredCycle)) {
      return NextResponse.json({ ok: false, error: "Preferred cycle must be weekly, biweekly, or monthly." }, { status: 400 });
    }
    if (!["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].includes(repaymentDayOfWeek)) {
      return NextResponse.json({ ok: false, error: "Invalid repayment day of the week selected." }, { status: 400 });
    }

    const request = await createBorrowRequest({
      discordId: session.discord_id,
      username: session.username || "Staff Member",
      amount,
      reason,
      preferredCycle,
      repaymentDayOfWeek,
      requestedInstallments,
      requestedApr,
    });

    // Send notification log to staff webhook
    try {
      const nowStr = new Date().toISOString();
      await sendDiscordWebhook({
        content:
          `💰 **New Borrow Request Submitted**\n` +
          `**Staff Member:** **${request.username}** (ID: \`${request.discordId}\`)\n` +
          `**Amount Requested:** \`$${request.amount}\` (at **${request.requestedApr}% APR**)\n` +
          `**Repayment Schedule:** \`${request.requestedInstallments} weeks\` (Every ${request.repaymentDayOfWeek})\n` +
          `**Reasoning:** *${request.reason}*\n` +
          `**Time (UTC):** \`${nowStr}\`\n` +
          `*Admins, please check the Admin Center to approve or reject.*`,
        username: "NewHopeGGN Staff Finance",
      }, {
        webhookUrl: "https://discord.com/api/webhooks/1497710654021173268/V411Sls-rmzm0yqKPVFP69qLPug7zf8mw0Grd5h6Mc2ZXMTME451MesqO4bTkNvs_CWQ"
      });
    } catch (webhookErr) {
      console.warn("[borrow-api] Webhook notification failed", webhookErr);
    }

    return NextResponse.json({ ok: true, request });
  } catch (error) {
    console.error("[borrow-api] POST error", error);
    return NextResponse.json({ ok: false, error: "Failed to create borrow request." }, { status: 500 });
  }
}
