export default function Home() {
  const highlights = [
    {
      title: "Fast Access",
      copy: "Sign in with Discord, link your account, and get into the store quickly.",
    },
    {
      title: "Fast Support",
      copy: "Tickets go straight to Discord so staff can respond faster.",
    },
    {
      title: "VIP Perks",
      copy: "Purchases during the active wipe include the VIP role benefit.",
    },
  ];

  const operations = [
    "Discord sign-in",
    "Support tickets",
    "Pack checkout",
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
              <span className="mt-3 block bg-[linear-gradient(135deg,#e0fbff,#67e8f9,#facc15)] bg-clip-text text-transparent">
                Packs, support, and server perks in one place.
              </span>
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
              Buy packs, contact staff, and manage your account through Discord-linked tools built for fast service.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="/store"
                className="inline-flex h-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#67e8f9,#facc15)] px-6 text-sm font-semibold text-slate-950 transition hover:scale-[1.02]"
              >
                Explore Store
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

              <div className="mt-6 rounded-[1.5rem] border border-amber-300/20 bg-amber-400/10 p-4 text-sm text-amber-100">
                VIP role perks are granted during the corresponding wipe.
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
