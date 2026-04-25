import { PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js";
import { useState, useEffect } from "react";

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

  // If the script rejected (e.g. adblock), show error immediately
  useEffect(() => {
    if (isRejected) {
      setError("The secure payment gateway was blocked or failed to load. This is often caused by an ad-blocker or VPN. Please disable them and refresh the page.");
    }
  }, [isRejected]);

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
            createOrder={(data, actions) => {
              return actions.order.create({
                intent: "CAPTURE",
                purchase_units: [{
                  amount: {
                    currency_code: "USD",
                    value: packPrice.toString(),
                  },
                  description: `${packName} - NewHopeGGN`,
                  custom_id: `${user?.discord_id || "guest"}|${user?.username || "guest"}|${packSlug}`,
                }],
              });
            }}
            onApprove={async (data, actions) => {
              if (actions.order) {
                const details = await actions.order.capture();
                onSuccess(details);
              }
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
