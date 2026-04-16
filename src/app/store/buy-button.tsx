"use client";

type BuyButtonProps = {
  packName: string;
  packPrice: number;
  buyUrl: string;
};

export function BuyButton({ packName, packPrice, buyUrl }: BuyButtonProps) {
  async function onClick() {
    await fetch("/api/store/intent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ packName, price: packPrice }),
    }).catch(() => {
      // Ignore tracking failures and continue checkout.
    });

    window.open(buyUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <button
      className="inline-flex h-9 items-center justify-center rounded-md border border-fuchsia-300/50 bg-gradient-to-r from-fuchsia-300 via-violet-200 to-cyan-200 px-4 text-sm font-extrabold text-black shadow-[0_0_22px_rgba(217,70,239,0.5)] transition hover:scale-[1.06] hover:shadow-[0_0_34px_rgba(217,70,239,0.75)] active:scale-[0.98]"
      onClick={onClick}
      type="button"
    >
      Buy
    </button>
  );
}

