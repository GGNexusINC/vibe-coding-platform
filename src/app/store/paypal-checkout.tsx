import { PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js";
import { useState, useEffect, useRef } from "react";

type PayPalCheckoutProps = {
  clientId: string;
  packName: string;
  packPrice: number;
  packSlug: string;
  user: { discord_id: string; username?: string } | null;
  onSuccess: (details: any) => void;
};

export function PayPalCheckout({
  packName,
  packPrice,
  packSlug,
  user,
  onSuccess
}: PayPalCheckoutProps) {
  const [{ isPending, isResolved, isRejected }] = usePayPalScriptReducer();
  const [error, setError] = useState<string | null>(null);

  // Stable intentId per checkout session — used for cross-referencing webhook vs client
  const intentId = useRef(
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 8).toUpperCase()
      : Math.random().toString(36).substring(2, 10).toUpperCase()
  );

  useEffect(() => {
    if (isRejected) {
      setError("The secure payment gateway was blocked or failed to load. This is often caused by an ad-blocker or VPN. Please disable them and refresh the page.");
    }
  }, [isRejected]);

  // Build custom_id once — format: userId|username|packSlug|intentId
  const customId = `${user?.discord_id || "guest"}|${user?.username || "guest"}|${packSlug}|${intentId.current}`;

  return (
    <div className="w-full min-h-[150px] flex flex-col items-center justify-center">
      {error && (
        <div className="mb-4 w-full rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400 animate-in fade-in zoom-in duration-300">
          <p className="font-bold mb-1 flex items-center gap-2">
            <span>⚠️</span> Secure Gateway Error
          </p>
          <p className="opacity-80">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 text-[10px] font-black uppercase tracking-widest text-white underline underline-offset-4 hover:text-cyan-400 transition"
          >
            Refresh Page
          </button>
        </div>
      )}

      {(isPending && !error) && (
        <div className="flex flex-col items-center justify-center py-8 animate-pulse">
          <div className="h-8 w-8 rounded-full border-2 border-cyan-500/20 border-t-cyan-500 animate-spin mb-3" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Initializing Secure Gateway...</p>
        </div>
      )}

      {isResolved && !error && (
        <div className="w-full animate-in fade-in duration-500">
          <PayPalButtons
            style={{ layout: "vertical", shape: "pill", label: "checkout", height: 45 }}
            createOrder={(_data, actions) => {
              return actions.order.create({
                intent: "CAPTURE",
                purchase_units: [{
                  amount: {
                    currency_code: "USD",
                    value: packPrice.toString(),
                  },
                  description: `${packName} - NewHopeGGN`,
                  // Include full custom_id with intentId so webhook + client can cross-reference
                  custom_id: customId,
                }],
              });
            }}
            onApprove={async (_data, actions) => {
              if (!actions.order) return;
              const details = await actions.order.capture();

              // ── CLIENT-SIDE FULFILLMENT FALLBACK ──────────────────────────────
              // After a successful capture, call our own API directly.
              // This guarantees delivery even if the PayPal webhook is late or
              // misses the custom_id (which happens on PAYMENT.CAPTURE.COMPLETED).
              try {
                await fetch("/api/store/success", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    orderId: details.id,
                    packSlug,
                    packName,
                    amount: packPrice,
                    customId,
                    user, // Pass full user object for identity resolution
                    transactionId:
                      details.purchase_units?.[0]?.payments?.captures?.[0]?.id ||
                      details.id,
                  }),
                });
              } catch (e) {
                console.warn("[paypal-checkout] Client-side fulfillment fallback failed:", e);
              }
              // ─────────────────────────────────────────────────────────────────

              onSuccess(details);
            }}
            onError={(err) => {
              console.error("PayPal Error:", err);
              setError("An unexpected error occurred during the payment process. Please try again or contact support.");
            }}
          />
        </div>
      )}
    </div>
  );
}
