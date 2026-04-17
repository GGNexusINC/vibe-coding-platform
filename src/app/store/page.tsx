import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { BuyButton } from "@/app/store/buy-button";

export const metadata: Metadata = {
  title: "Store | NewHopeGGN",
  description: "Buy wipe packs for Once Human. Construction, Defense, PvP, and Clan packages with VIP perks. Instant delivery via Discord.",
  keywords: ["store", "wipe packs", "Once Human", "VIP", "construction", "defense", "pvp", "packages"],
  openGraph: {
    title: "Store | NewHopeGGN",
    description: "Buy wipe packs for Once Human. Construction, Defense, PvP, and Clan packages with VIP perks.",
    type: "website",
  },
};

const products = [
  {
    slug: "construction",
    badge: "Builder Favorite",
    name: "Construction Package",
    price: 5,
    buyUrl: "https://www.paypal.com/ncp/payment/2CPNCAMCWTVUN",
    summary: "A fast-start builder bundle for serious base progression.",
    bullets: ["5000 stone", "7000 wood", "5000 steel", "5000 tungsten"],
    addons: [
      "Advanced tables: Supplies and Armament",
      "Storage, weapon, and armor box set",
      "3 V3 tickets",
      "350 gasoline",
    ],
    extra: "300 chips or deviant selector",
    featured: false,
  },
  {
    slug: "defense",
    badge: "Stronghold Loadout",
    name: "Defense Package",
    price: 5,
    buyUrl: "https://www.paypal.com/ncp/payment/E33JYFS2JF8V2",
    summary: "Everything needed to harden a position and hold pressure.",
    bullets: [
      "10 rifle turrets with ammo",
      "4 shotgun turrets or 4 stun traps",
      "6 pulse traps",
      "20 high tungsten walls",
      "2 high tungsten doors",
      "2 large biomass generators",
    ],
    extra: "300 chips or special meals",
    featured: false,
  },
  {
    slug: "tactical",
    badge: "Most Wanted",
    name: "Tactical Package",
    price: 5,
    buyUrl: "https://www.paypal.com/ncp/payment/74N3J2M7KPATS",
    summary: "The premium combat kit for players who want immediate battlefield value.",
    bullets: [
      "MK14 or KVD with full mods and ammo",
      "P90 or KV-SBR with full mods and ammo",
      "Stormweaver or Refugee armor set with gas mask",
      "20 corn soups",
      "20 emergency supplies",
      "2 universal repair kits",
      "60 gasoline",
    ],
    extra: "300 chips or Masamune Katana",
    featured: true,
  },
  {
    slug: "insurance",
    badge: "Security Pick",
    name: "Anti-Raid Insurance",
    price: 5,
    buyUrl: "https://www.paypal.com/ncp/payment/V2L73MUBJV6EN",
    summary: "A single-use protection option for players who value wipe resilience.",
    bullets: [
      "Base blueprint resources are returned",
      "Single use per wipe",
      "Staff-verified fulfillment after purchase confirmation",
    ],
    extra: "VIP role during the corresponding wipe",
    featured: false,
  },
];

export default async function StorePage() {
  const user = await getSession();

  return (
    <div className="relative mx-auto w-full max-w-7xl px-4 py-10 sm:py-14">
      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rz-surface rz-panel-border relative overflow-hidden rounded-[2rem] p-7 sm:p-9">
          <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_center,rgba(103,232,249,0.15),transparent_56%)]" />
          <div className="relative">
            <div className="rz-chip">Premium Storefront</div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Store Packs
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
              Choose a pack, sign in with Discord, and open secure checkout.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-[1.5rem] border border-white/8 bg-slate-950/55 p-4">
                <div className="text-xs uppercase tracking-[0.25em] text-cyan-200/70">Price Point</div>
                <div className="mt-2 text-3xl font-semibold text-white">$5</div>
                <div className="mt-1 text-sm text-slate-400">Simple pack pricing across the catalog.</div>
              </div>
              <div className="rounded-[1.5rem] border border-white/8 bg-slate-950/55 p-4">
                <div className="text-xs uppercase tracking-[0.25em] text-cyan-200/70">Checkout</div>
                <div className="mt-2 text-3xl font-semibold text-white">PayPal</div>
                <div className="mt-1 text-sm text-slate-400">Trusted external payment flow.</div>
              </div>
              <div className="rounded-[1.5rem] border border-white/8 bg-slate-950/55 p-4">
                <div className="text-xs uppercase tracking-[0.25em] text-cyan-200/70">Perk</div>
                <div className="mt-2 text-3xl font-semibold text-white">VIP</div>
                <div className="mt-1 text-sm text-slate-400">Granted during the matching wipe.</div>
              </div>
            </div>
          </div>
        </div>

        <div className="rz-surface rz-panel-border rounded-[2rem] p-7 sm:p-9">
          <div className="rz-chip">Buyer Readiness</div>
          <div className="mt-5 grid gap-4">
            <div className="rounded-[1.5rem] border border-white/8 bg-slate-950/55 p-4">
              <div className="text-sm font-semibold text-white">1. Discord login</div>
              <div className="mt-1 text-sm text-slate-400">
                Sign in before buying so staff can verify identity and support status quickly.
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-white/8 bg-slate-950/55 p-4">
              <div className="text-sm font-semibold text-white">2. UID confirmation</div>
              <div className="mt-1 text-sm text-slate-400">
                Link the correct in-game UID before checkout to avoid delivery issues.
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-white/8 bg-slate-950/55 p-4">
              <div className="text-sm font-semibold text-white">3. Staff-assisted fulfillment</div>
              <div className="mt-1 text-sm text-slate-400">
                Purchase flow is logged to Discord so admins can track fulfillment clearly.
              </div>
            </div>
          </div>

          {!user ? (
            <div className="mt-6 rounded-[1.5rem] border border-amber-300/20 bg-amber-400/10 p-4">
              <div className="text-sm font-semibold text-amber-100">Login required to buy</div>
              <div className="mt-2 text-sm text-amber-50/90">
                You can browse the store now, but checkout starts after Discord login.
              </div>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <a
                  className="inline-flex h-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#67e8f9,#facc15)] px-5 text-sm font-semibold text-slate-950 transition hover:scale-[1.01]"
                  href="/auth/discord/start?next=/store"
                >
                  Sign in with Discord
                </a>
                <a
                  className="inline-flex h-11 items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
                  href="/dashboard"
                >
                  Go to Dashboard
                </a>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-[1.5rem] border border-emerald-300/20 bg-emerald-400/10 p-4">
              <div className="text-sm font-semibold text-emerald-100">
                Signed in as {user.global_name || user.username}
              </div>
              <div className="mt-2 text-sm text-emerald-50/90">
                You are ready to open pack checkout links and have your purchase tracked.
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-2">
        {products.map((product) => (
          <article
            key={product.slug}
            className="rz-neon-border rz-pop-card group relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(11,22,33,0.92),rgba(6,14,21,0.86))] p-6"
          >
            <div className="pointer-events-none absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100">
              <div className="absolute -top-20 right-[-3rem] h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
              <div className="absolute bottom-[-4rem] left-[-3rem] h-56 w-56 rounded-full bg-amber-300/10 blur-3xl" />
            </div>

            <div className="relative">
              <div className="flex items-center justify-between gap-3">
                <div className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100">
                  {product.badge}
                </div>
                <div className="rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-sm font-semibold text-amber-100">
                  ${product.price}
                </div>
              </div>

              <h2 className="mt-5 text-2xl font-semibold text-white">{product.name}</h2>
              <p className="mt-2 text-sm leading-7 text-slate-300">{product.summary}</p>

              <div className="mt-5 grid gap-3">
                {product.bullets.map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 rounded-[1.15rem] border border-white/8 bg-slate-950/45 px-4 py-3 text-sm text-slate-200"
                  >
                    <span className="mt-1.5 h-2 w-2 rounded-full bg-cyan-300" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              {product.addons?.length ? (
                <div className="mt-5 rounded-[1.5rem] border border-white/8 bg-black/20 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">
                    Included Add-ons
                  </div>
                  <div className="mt-3 grid gap-2">
                    {product.addons.map((addon) => (
                      <div key={addon} className="text-sm text-slate-400">
                        {addon}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-5 rounded-[1.5rem] border border-emerald-300/18 bg-emerald-400/10 p-4 text-sm text-emerald-100">
                <span className="font-semibold text-white">Extra bonus:</span> {product.extra}
              </div>

              <div className="mt-6 flex items-center justify-between gap-3">
                <div className="text-xs uppercase tracking-[0.22em] text-slate-500">
                  Secure checkout
                </div>
                {user ? (
                  <BuyButton
                    packName={product.name}
                    packPrice={product.price}
                    buyUrl={product.buyUrl}
                  />
                ) : (
                  <a
                    className="inline-flex h-10 items-center justify-center rounded-full border border-white/15 bg-white/5 px-4 text-sm font-semibold text-white transition hover:bg-white/10"
                    href="/dashboard"
                  >
                    Login to buy
                  </a>
                )}
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
