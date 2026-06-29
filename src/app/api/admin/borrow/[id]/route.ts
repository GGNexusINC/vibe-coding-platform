import { NextResponse } from "next/server";
import { getAdminSession, isAdminDiscordId } from "@/lib/admin-auth";
import { updateBorrowRequestStatus } from "@/lib/borrow-store";
import { sendDiscordWebhook } from "@/lib/discord";

export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const session = await getAdminSession();
  if (!session || !session.discord_id) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  // Only Owners are authorized to approve or reject borrow requests
  const isOwner = isAdminDiscordId(session.discord_id);
  if (!isOwner) {
    return NextResponse.json({ ok: false, error: "Forbidden. Only owners can manage borrow requests." }, { status: 403 });
  }

  const { id } = params;
  if (!id) {
    return NextResponse.json({ ok: false, error: "Request ID is required." }, { status: 400 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const status = String(body?.status ?? "").trim() as "approved" | "rejected";
    const adminReasoning = String(body?.adminReasoning ?? "").trim();
    const cycle = body?.cycle;

    if (!["approved", "rejected"].includes(status)) {
      return NextResponse.json({ ok: false, error: "Status must be 'approved' or 'rejected'." }, { status: 400 });
    }
    if (!adminReasoning) {
      return NextResponse.json({ ok: false, error: "Admin reasoning/notes are mandatory for this decision." }, { status: 400 });
    }

    let cycleData = undefined;
    if (status === "approved") {
      if (!cycle) {
        return NextResponse.json({ ok: false, error: "Payment cycle settings are required for approval." }, { status: 400 });
      }
      const frequency = String(cycle.frequency ?? "").trim();
      const installments = Number(cycle.installments);
      const amountPerCycle = Number(cycle.amountPerCycle);
      const startDate = String(cycle.startDate ?? "").trim();
      const apr = cycle.apr !== undefined ? Number(cycle.apr) : 15;
      const totalInterest = cycle.totalInterest !== undefined ? Number(cycle.totalInterest) : 0;
      const totalRepayment = cycle.totalRepayment !== undefined ? Number(cycle.totalRepayment) : amountPerCycle * installments;
      const approvedAmount = cycle.approvedAmount !== undefined ? Number(cycle.approvedAmount) : undefined;

      if (!["weekly", "biweekly", "monthly"].includes(frequency)) {
        return NextResponse.json({ ok: false, error: "Cycle frequency must be weekly, biweekly, or monthly." }, { status: 400 });
      }
      if (isNaN(installments) || installments <= 0 || !Number.isInteger(installments)) {
        return NextResponse.json({ ok: false, error: "Installments count must be a positive integer." }, { status: 400 });
      }
      if (isNaN(amountPerCycle) || amountPerCycle <= 0) {
        return NextResponse.json({ ok: false, error: "Amount per cycle must be a positive number." }, { status: 400 });
      }
      if (!startDate) {
        return NextResponse.json({ ok: false, error: "Start date is required." }, { status: 400 });
      }

      cycleData = {
        frequency,
        installments,
        amountPerCycle,
        startDate,
        apr,
        totalInterest,
        totalRepayment,
        approvedAmount,
      };
    }

    const request = await updateBorrowRequestStatus(
      id,
      status,
      session.discord_id,
      session.username || "Admin",
      adminReasoning,
      cycleData
    );

    if (!request) {
      return NextResponse.json({ ok: false, error: "Borrow request not found." }, { status: 404 });
    }

    // Send status update notification log to Discord staff-audits
    try {
      const nowStr = new Date().toISOString();
      const actionIcon = status === "approved" ? "✅" : "❌";
      const actionText = status === "approved" ? "Approved" : "Rejected";
      
      let cycleDetail = "";
      if (status === "approved" && cycleData) {
        cycleDetail = 
          `**Repayment Terms:** ${cycleData.installments} x $${cycleData.amountPerCycle} (${cycleData.frequency})\n` +
          `**Approved APR:** \`${cycleData.apr}%\` | **Interest (Finance Charge):** \`$${cycleData.totalInterest.toFixed(2)}\` | **Total Debt:** \`$${cycleData.totalRepayment.toFixed(2)}\`\n` +
          `**Start Date:** \`${cycleData.startDate}\`\n`;
      }

      await sendDiscordWebhook({
        content:
          `${actionIcon} **Borrow Request ${actionText}**\n` +
          `**Borrower:** **${request.username}** (ID: \`${request.discordId}\`)\n` +
          `**Principal Amount:** \`$${request.amount}\`\n` +
          `**Decided By:** **${session.username}**\n` +
          `**Decision Reason/Reasoning:** *${request.adminReasoning}*\n` +
          cycleDetail +
          `**Time (UTC):** \`${nowStr}\``,
        username: "NewHopeGGN Staff Finance Gate",
      }, {
        webhookUrl: "https://discord.com/api/webhooks/1497710654021173268/V411Sls-rmzm0yqKPVFP69qLPug7zf8mw0Grd5h6Mc2ZXMTME451MesqO4bTkNvs_CWQ"
      });
    } catch (webhookErr) {
      console.warn("[borrow-api] Webhook decision log failed", webhookErr);
    }

    return NextResponse.json({ ok: true, request });
  } catch (error) {
    console.error("[borrow-api] POST details error", error);
    return NextResponse.json({ ok: false, error: "Failed to process decision." }, { status: 500 });
  }
}
