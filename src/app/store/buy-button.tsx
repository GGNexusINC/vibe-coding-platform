"use client";

import { useCart } from "./cart-context";
import { useState } from "react";

type BuyButtonProps = {
  packName: string;
  packPrice: number;
  packSlug: string;
  user: { discord_id: string; username?: string } | null;
};

export function BuyButton({ packName, packPrice, packSlug, user }: BuyButtonProps) {
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    addToCart({
      slug: packSlug,
      name: packName,
      price: packPrice,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <button
      className={`inline-flex h-12 items-center justify-center rounded-2xl px-8 text-xs font-black transition-all duration-300 uppercase tracking-[0.1em] ${
        added 
          ? "bg-emerald-500 text-white scale-105 shadow-[0_0_20px_rgba(16,185,129,0.4)]" 
          : "bg-gradient-to-r from-fuchsia-300 via-violet-200 to-cyan-200 text-black shadow-[0_0_22px_rgba(217,70,239,0.3)] hover:scale-[1.06] hover:shadow-[0_0_34px_rgba(217,70,239,0.5)] active:scale-[0.98]"
      }`}
      onClick={handleAdd}
      type="button"
    >
      {added ? (
        <span className="flex items-center gap-2">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
          Added!
        </span>
      ) : (
        "Add to Cart"
      )}
    </button>
  );
}
