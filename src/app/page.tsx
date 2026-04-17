export default function Home() {
  const highlights = [
    {
      title: "Once Human Server",
      copy: "A dedicated Once Human community — wipes, events, and base-building with real players.",
    },
    {
      title: "Fast Support",
      copy: "Open a ticket and staff respond directly through Discord. No waiting around.",
    },
    {
      title: "Wipe Packs & VIP",
      copy: "Buy packs each wipe to get resources and VIP perks tied to the current season.",
    },
  ];

  const operations = [
    "Discord sign-in",
    "Support tickets",
    "Wipe pack checkout",
    "VIP role perks",
  ];

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 rz-bg opacity-30 rz-drift" />
      <div className="pointer-events-none absolute inset-0 rz-grid opacity-20" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(103,232,249,0.06),rgba(4,16,24,0.4),rgba(4,16,24,0.95))]" />
      <div className="pointer-events-none absolute -left-40 top-10 h-80 w-80 rounded-full bg-cyan-400/14 blur-3xl rz-pulse" />
      <div className="pointer-events-none absolute right-[-6rem] top-36 h-96 w-96 rounded-full bg-emerald-400/10 blur-3xl rz-pulse" />
      <div className="pointer-events-none absolute bottom-8 left-1/2 h-64 w-[40rem] -translate-x-1/2 rounded-full bg-amber-300/8 blur-3xl" />

      <section className="relative mx-auto w-full max-w-7xl px-4 py-16 sm:py-24">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rz-surface rz-panel-border rounded-[2rem] p-7 sm:p-10">
            <div className="rz-chip rz-float">NewHopeGGN</div>

            <h1 className="mt-6 max-w-4xl font-[family:var(--font-brand-display)] text-4xl font-semibold uppercase tracking-[0.06em] text-white sm:text-5xl xl:text-6xl">
              NewHopeGGN
              <span className="mt-3 block bg-[linear-gradient(135deg,#fed7aa,#f97316,#fbbf24)] bg-clip-text text-transparent">
                Your Once Human community home base.
              </span>
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-8 text-stone-300 sm:text-lg">
              Survive together. Build together. NewHopeGGN is a Once Human community server — buy wipe packs, open support tickets, and connect with your squad through Discord.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="/store"
                className="inline-flex h-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#f97316,#fbbf24)] px-6 text-sm font-bold text-stone-950 transition hover:scale-[1.02] shadow-[0_0_28px_rgba(249,115,22,0.4)]"
              >
                🛒 Wipe Store
              </a>
              <a
                href="/admin"
                className="inline-flex h-12 items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Staff Login
              </a>
            </div>

            <div className="mt-10 grid gap-4 lg:grid-cols-3">
              {highlights.map((item) => (
                <div key={item.title} className="rounded-[1.5rem] border border-white/8 bg-slate-950/55 p-4">
                  <div className="text-sm font-semibold text-white">{item.title}</div>
                  <div className="mt-2 text-sm leading-6 text-slate-400">{item.copy}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-6">
            <div className="rz-surface rz-panel-border rounded-[2rem] p-6">
              <div className="rz-chip">What You Can Do</div>
              <div className="mt-5 grid gap-4">
                {operations.map((item, index) => (
                  <div
                    key={item}
                    className="flex items-center gap-4 rounded-[1.35rem] border border-white/8 bg-slate-950/55 px-4 py-4"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400/10 text-sm font-semibold text-cyan-100">
                      0{index + 1}
                    </div>
                    <div className="text-sm font-medium text-slate-200">{item}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rz-surface rz-panel-border rounded-[2rem] p-6">
              <div className="rz-chip">Quick Start</div>
              <ol className="mt-5 space-y-3 text-sm">
                <li className="rounded-[1.35rem] border border-white/8 bg-slate-950/55 px-4 py-4">
                  <div className="font-semibold text-white">1. Sign in with Discord</div>
                  <div className="mt-1 text-slate-400">
                    Sign in to unlock the dashboard, support flow, and store access.
                  </div>
                </li>
                <li className="rounded-[1.35rem] border border-white/8 bg-slate-950/55 px-4 py-4">
                  <div className="font-semibold text-white">2. Link UID and choose your pack</div>
                  <div className="mt-1 text-slate-400">
                    Make sure your details are correct before buying a pack.
                  </div>
                </li>
                <li className="rounded-[1.35rem] border border-white/8 bg-slate-950/55 px-4 py-4">
                  <div className="font-semibold text-white">3. Buy and receive VIP perks</div>
                  <div className="mt-1 text-slate-400">
                    Purchases are tracked through Discord and tied to the current wipe perks.
                  </div>
                </li>
              </ol>

              <div className="mt-6 rounded-[1.5rem] border border-orange-400/25 bg-orange-400/10 p-4 text-sm text-orange-100">
                ⚠️ VIP role perks are tied to the active wipe. Buy during the wipe to receive your rewards.
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
