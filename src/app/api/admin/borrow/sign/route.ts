import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { signBorrowRequest } from "@/lib/borrow-store";
import { sendDiscordWebhook } from "@/lib/discord";

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session || !session.discord_id) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const requestId = String(body?.requestId ?? "").trim();
    const legalName = String(body?.legalName ?? "").trim();
    const signature = String(body?.signature ?? "").trim();

    if (!requestId || !legalName || !signature) {
      return NextResponse.json(
        { ok: false, error: "Request ID, legal name, and digital signature are mandatory to execute this agreement." },
        { status: 400 }
      );
    }

    const request = await signBorrowRequest(requestId, legalName, signature);
    if (!request) {
      return NextResponse.json({ ok: false, error: "Borrow request not found." }, { status: 404 });
    }

    if (request.discordId !== session.discord_id) {
      return NextResponse.json({ ok: false, error: "Forbidden. You cannot execute agreements for other users." }, { status: 403 });
    }

    // Send Discord Log Webhook
    try {
      const nowStr = new Date().toISOString();
      await sendDiscordWebhook({
        content:
          `🖋️ **Legally Binding Loan Agreement Signed**\n` +
          `**Borrower:** **${request.username}** (ID: \`${request.discordId}\`)\n` +
          `**Legal Signature:** *${legalName}*\n` +
          `**Principal Amount:** \`$${request.amount}\`\n` +
          `**Approved APR:** \`${request.apr ?? 15}%\` | **Interest Fee:** \`$${request.totalInterest ?? 0}\` | **Total Repayable Debt:** \`$${request.totalRepayment ?? request.amount}\`\n` +
          `**Payment Schedule:** \`${request.installments} installments of $${request.amountPerCycle}/week (Every ${request.repaymentDayOfWeek})\`\n` +
          `**Start Repaying On:** \`${request.paymentStartDate ? new Date(request.paymentStartDate).toLocaleDateString() : "N/A"}\`\n` +
          `**Time (UTC):** \`${nowStr}\`\n` +
          `*The borrower has executed a binding Promissory Note with NewHopeGGN.*`,
        username: "NewHopeGGN Staff Finance Gate",
      }, {
        webhookUrl: "https://discord.com/api/webhooks/1497710654021173268/V411Sls-rmzm0yqKPVFP69qLPug7zf8mw0Grd5h6Mc2ZXMTME451MesqO4bTkNvs_CWQ"
      });
    } catch (webhookErr) {
      console.warn("[borrow-sign] Webhook notification failed", webhookErr);
    }

    return NextResponse.json({ ok: true, request });
  } catch (error) {
    console.error("[borrow-sign] POST error", error);
    return NextResponse.json({ ok: false, error: "Failed to sign loan contract." }, { status: 500 });
  }
}
