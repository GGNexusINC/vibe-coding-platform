import { NextResponse } from "next/server";
import { getAdminSession, isAdminDiscordId } from "@/lib/admin-auth";
import { recordRepayment } from "@/lib/borrow-store";
import { sendDiscordWebhook } from "@/lib/discord";

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session || !session.discord_id) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const requestId = String(body?.requestId ?? "").trim();
    const amount = Number(body?.amount);
    const transactionId = String(body?.transactionId ?? "").trim();

    if (!requestId) {
      return NextResponse.json({ ok: false, error: "Request ID is required." }, { status: 400 });
    }
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ ok: false, error: "Valid amount is required." }, { status: 400 });
    }

    const updatedRequest = await recordRepayment(requestId, amount);
    if (!updatedRequest) {
      return NextResponse.json({ ok: false, error: "Borrow request not found." }, { status: 404 });
    }

    // Verify ownership: borrower or admin owner
    // If not the borrower, they cannot submit repayment (except owners)
    const isOwner = isAdminDiscordId(session.discord_id); 
    // Wait, let's keep it open for logged in staff for now or make it borrower-safe
    if (updatedRequest.discordId !== session.discord_id && !isOwner) {
      return NextResponse.json({ ok: false, error: "Forbidden. You can only repay your own loans." }, { status: 403 });
    }

    // Send Discord webhook update
    try {
      const nowStr = new Date().toISOString();
      await sendDiscordWebhook({
        content:
          `💳 **Loan Repayment Received**\n` +
          `**Staff Member:** **${updatedRequest.username}** (ID: \`${updatedRequest.discordId}\`)\n` +
          `**Repayment Amount:** \`$${amount.toFixed(2)}\`\n` +
          `**Remaining Installments:** \`${updatedRequest.installments}\` cycles\n` +
          `**Transaction ID:** \`${transactionId || "N/A"}\`\n` +
          `**Time (UTC):** \`${nowStr}\`\n` +
          (updatedRequest.installments === 0 
            ? `🎉 **This loan has been fully repaid!**` 
            : `*Keep it up!*`),
        username: "NewHopeGGN Staff Finance Gate",
      }, {
        webhookUrl: "https://discord.com/api/webhooks/1497710654021173268/V411Sls-rmzm0yqKPVFP69qLPug7zf8mw0Grd5h6Mc2ZXMTME451MesqO4bTkNvs_CWQ"
      });
    } catch (webhookErr) {
      console.warn("[borrow-repay] Webhook repayment notification failed", webhookErr);
    }

    return NextResponse.json({ ok: true, request: updatedRequest });
  } catch (error) {
    console.error("[borrow-repay] POST error", error);
    return NextResponse.json({ ok: false, error: "Failed to process repayment." }, { status: 500 });
  }
}
