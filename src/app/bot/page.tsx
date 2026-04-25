import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "NewHopeGGN | Premium Discord Translation",
  description:
    "Premium Discord voice translation for communities that need live multilingual support, voice-channel translation, and admin-grade logs.",
  robots: {
    index: false,
    follow: false,
  },
};

const plans = [
  {
    name: "Starter",
    price: "$19",
    cadence: "/mo",
    badge: "Basic",
    description: "Professional text translation for emerging communities.",
    features: [
      "1 premium Discord server",
      "/nhtranslate text translation",
      "Automatic chat translation",
      "Basic usage logs",
      "Community support",
    ],
    color: "cyan",
  },
  {
    name: "Pro Voice",
    price: "$59",
    cadence: "/mo",
    badge: "Popular",
    description: "Live VC translation for active staff and bilingual teams.",
    features: [
      "Everything in Starter",
      "Live voice translation",
      "Auto-detect EN ↔ ES",
      "Voice status dashboard",
      "Priority setup support",
    ],
    featured: true,
    color: "indigo",
  },
  {
    name: "Enterprise",
    price: "$149",
    cadence: "/mo",
    badge: "Maximum",
    description: "High-volume controls for large-scale operations.",
    features: [
      "Everything in Pro Voice",
      "Multi-server licensing",
      "Dedicated setup review",
      "Staff-only command policy",
      "Premium log monitoring",
    ],
    color: "emerald",
  },
];

const commandGroups = [
  {
    title: "Text Core",
    badge: "Standard",
    rows: [
      ["/nhtranslate", "Instant text translation with clean output."],
      ["/autotext mode:on", "Enable global live chat translation."],
      ["/autotext mode:off", "Disable chat translation server-wide."],
    ],
  },
  {
    title: "Voice Ops",
    badge: "Premium",
    rows: [
      ["/vclisten", "Join VC and post live speaker transcripts."],
      ["/vcauto", "High-speed auto-detect for EN/ES calls."],
      ["/vcstop", "Terminate active voice session instantly."],
    ],
  },
];

const botClientId =
  process.env.NEXT_PUBLIC_DISCORD_BOT_CLIENT_ID ||
  process.env.DISCORD_BOT_CLIENT_ID ||
  process.env.DISCORD_CLIENT_ID ||
  "";

const addToServerUrl = botClientId
  ? `https://discord.com/oauth2/authorize?client_id=${encodeURIComponent(botClientId)}&permissions=8&integration_type=0&scope=bot+applications.commands`
  : "https://discord.com/developers/applications";

const discordServerUrl = "https://discord.gg/hopeggn";
const setupSupportUrl = "/support?topic=bot-premium";

function DiscordMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 245 240" aria-hidden="true" className={className}>
      <path
        fill="currentColor"
        d="M104.4 104.8c-5.7 0-10.2 5-10.2 11.1s4.6 11.1 10.2 11.1c5.7 0 10.3-5 10.2-11.1.1-6.1-4.5-11.1-10.2-11.1Zm36.4 0c-5.7 0-10.2 5-10.2 11.1s4.6 11.1 10.2 11.1c5.7 0 10.3-5 10.2-11.1 0-6.1-4.5-11.1-10.2-11.1Z"
      />
      <path
        fill="currentColor"
        d="M189.5 20h-134C44.2 20 35 29.2 35 40.6v135.2c0 11.4 9.2 20.6 20.5 20.6h113.4l-5.3-18.5 12.8 11.9 12.1 11.2L210 220V40.6c0-11.4-9.2-20.6-20.5-20.6Zm-38.8 130.6s-3.6-4.3-6.6-8.1c13.1-3.7 18.1-11.9 18.1-11.9-4.1 2.7-8 4.6-11.5 5.9-5 2.1-9.8 3.4-14.5 4.2-9.6 1.8-18.4 1.3-25.9-.1-5.7-1.1-10.6-2.7-14.7-4.2-2.3-.9-4.8-2-7.3-3.4-.3-.2-.6-.3-.9-.5-.2-.1-.3-.2-.4-.3-1.8-1-2.8-1.7-2.8-1.7s4.8 8 17.5 11.8c-3 3.8-6.7 8.3-6.7 8.3-22.1-.7-30.5-15.2-30.5-15.2 0-32.2 14.4-58.3 14.4-58.3 14.4-10.8 28.1-10.5 28.1-10.5l1 1.2c-18 5.2-26.3 13.1-26.3 13.1s2.2-1.2 5.9-2.9c10.7-4.7 19.2-6 22.7-6.3.6-.1 1.1-.2 1.7-.2 6.1-.8 13-1 20.2-.2 9.5 1.1 19.7 3.9 30.1 9.6 0 0-7.9-7.5-24.9-12.7l1.4-1.6s13.7-.3 28.1 10.5c0 0 14.4 26.1 14.4 58.3 0 0-8.5 14.5-30.6 15.2Z"
      />
    </svg>
  );
}

export default function BotPremiumPage() {
  return (
    <main className="relative mx-auto w-full max-w-7xl overflow-hidden px-4 pb-24 pt-12 sm:px-6 lg:px-8">
      {/* Hyper-futuristic background elements */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-[-10%] top-[-10%] h-[60%] w-[60%] rounded-full bg-indigo-500/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[60%] w-[60%] rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      <div className="relative">
        {/* Hero Section */}
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
          <div className="inline-flex items-center gap-3 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.3em] text-indigo-300 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500"></span>
            </span>
            NewHopeGGN Engine
          </div>
          <h1 className="mt-8 max-w-4xl bg-gradient-to-br from-white via-slate-200 to-slate-500 bg-clip-text text-5xl font-black leading-[1.05] tracking-tight text-transparent sm:text-7xl lg:text-8xl">
            Shatter the <br />
            <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">Language Barrier</span>.
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-8 text-slate-400">
            Enterprise-grade translation for the next generation of Discord communities. 
            Real-time voice synthesis, multi-channel chat relay, and professional staff auditing.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4 lg:justify-start">
            <a
              href={addToServerUrl}
              className="group relative inline-flex h-14 items-center justify-center overflow-hidden rounded-2xl bg-indigo-600 px-8 font-black text-white transition-all hover:scale-[1.02] active:scale-95"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-violet-600 transition-all group-hover:opacity-90" />
              <div className="relative flex items-center gap-3">
                <DiscordMark className="h-6 w-6" />
                <span>Authorize & Deploy</span>
              </div>
            </a>
            <Link
              href="/bot/dashboard"
              className="inline-flex h-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-8 font-black text-white transition-all hover:bg-white/10 hover:shadow-[0_0_30px_rgba(255,255,255,0.05)]"
            >
              Control Panel
            </Link>
          </div>
        </div>

        {/* Feature Grid & Console */}
        <div className="mt-24 grid gap-8 lg:grid-cols-5">
          {/* Main Console Area */}
          <div className="lg:col-span-3">
            <div className="group relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-slate-900/40 p-1 backdrop-blur-xl transition-all hover:border-indigo-500/30">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-cyan-500/10 opacity-50" />
              
              <div className="relative overflow-hidden rounded-[2.2rem] bg-slate-950/80 p-8 sm:p-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex gap-1.5">
                      <div className="h-3 w-3 rounded-full bg-rose-500/50" />
                      <div className="h-3 w-3 rounded-full bg-amber-500/50" />
                      <div className="h-3 w-3 rounded-full bg-emerald-500/50" />
                    </div>
                    <div className="h-px w-24 bg-gradient-to-r from-white/10 to-transparent" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">System.Console // NEWHOPEGGN</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[9px] font-black uppercase text-emerald-300">Live Engine</span>
                  </div>
                </div>

                <div className="mt-12 space-y-12">
                  {commandGroups.map((group) => (
                    <div key={group.title}>
                      <div className="flex items-center gap-4 mb-6">
                        <h3 className="text-xl font-black text-white tracking-tight">{group.title}</h3>
                        <div className="h-px flex-1 bg-gradient-to-r from-white/10 via-white/5 to-transparent" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">{group.badge}</span>
                      </div>
                      <div className="grid gap-4">
                        {group.rows.map(([cmd, desc]) => (
                          <div key={cmd} className="group/row relative flex items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-4 transition-all hover:bg-white/[0.04] hover:border-white/10">
                            <div className="flex-1 min-w-0">
                              <div className="font-mono text-sm font-bold text-cyan-400 tracking-tight">{cmd}</div>
                              <div className="mt-1 text-xs text-slate-500 font-medium leading-relaxed">{desc}</div>
                            </div>
                            <div className="hidden sm:block opacity-0 group-hover/row:opacity-100 transition-opacity">
                              <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Enter</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Install Cards */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 p-8 shadow-2xl">
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-3xl" />
              <div className="relative">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-xl shadow-xl">
                  <DiscordMark className="h-6 w-6 text-white" />
                </div>
                <h3 className="mt-6 text-2xl font-black text-white">Bot Onboarding</h3>
                <p className="mt-4 text-sm leading-relaxed text-indigo-100/70 font-medium">
                  Quickly deploy NewHopeGGN to your guild. Use <code className="text-white">/vcpermcheck</code> after inviting to ensure zero-latency voice relay.
                </p>
                <div className="mt-8 flex flex-col gap-3">
                  <a href={addToServerUrl} className="flex items-center justify-between rounded-2xl bg-white px-5 py-4 font-black text-indigo-900 transition-transform hover:scale-[1.02] active:scale-95">
                    <span>Invite to Server</span>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                  </a>
                  <a href={discordServerUrl} className="flex items-center justify-between rounded-2xl border border-white/20 bg-white/10 px-5 py-4 font-black text-white transition-all hover:bg-white/20">
                    <span>Developer Support</span>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </a>
                </div>
              </div>
            </div>

            <div className="relative flex-1 overflow-hidden rounded-[2.5rem] border border-white/10 bg-slate-900/40 p-8 backdrop-blur-xl">
              <div className="absolute bottom-0 left-0 h-1/2 w-full bg-gradient-to-t from-cyan-500/10 to-transparent" />
              <div className="relative">
                <h3 className="text-xl font-black text-white">Legacy Integration</h3>
                <div className="mt-6 space-y-4">
                  <Link href={setupSupportUrl} className="group block rounded-2xl border border-white/5 bg-white/[0.02] p-4 transition-all hover:border-cyan-500/30">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-300">Request Licensing</span>
                      <span className="text-cyan-400 group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                    <p className="mt-1 text-[10px] text-slate-500">Custom billing and server allowlisting.</p>
                  </Link>
                  <Link href="/lottery" className="group block rounded-2xl border border-white/5 bg-white/[0.02] p-4 transition-all hover:border-amber-500/30">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-300">Public Rewards</span>
                      <span className="text-amber-400 group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                    <p className="mt-1 text-[10px] text-slate-500">Redeem prizes won through the bot.</p>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="mt-32">
          <div className="text-center">
            <h2 className="text-3xl font-black text-white tracking-tight sm:text-5xl">Performance Tiering</h2>
            <p className="mt-4 text-slate-500 font-medium">Select the processing power required for your community.</p>
          </div>
          
          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative group overflow-hidden rounded-[3rem] border p-8 transition-all hover:-translate-y-2 ${
                  plan.featured
                    ? "border-indigo-500/50 bg-indigo-500/5 shadow-[0_0_50px_rgba(99,102,241,0.1)]"
                    : "border-white/10 bg-slate-900/20 hover:border-white/20"
                }`}
              >
                {plan.featured && (
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.2),transparent_70%)]" />
                )}
                
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${
                      plan.color === "cyan" ? "text-cyan-400" : 
                      plan.color === "indigo" ? "text-indigo-400" : "text-emerald-400"
                    }`}>{plan.badge}</span>
                    {plan.featured && <span className="rounded-full bg-indigo-500 px-3 py-1 text-[8px] font-black uppercase text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]">Hypernode</span>}
                  </div>
                  
                  <h3 className="mt-6 text-3xl font-black text-white">{plan.name}</h3>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-5xl font-black text-white tracking-tight">{plan.price}</span>
                    <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">{plan.cadence}</span>
                  </div>
                  <p className="mt-6 text-sm leading-relaxed text-slate-400 font-medium">{plan.description}</p>
                  
                  <div className="my-8 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  
                  <ul className="space-y-4">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <div className={`mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0 shadow-[0_0_10px_currentColor] ${
                          plan.color === "cyan" ? "bg-cyan-400 text-cyan-400" : 
                          plan.color === "indigo" ? "bg-indigo-400 text-indigo-400" : "bg-emerald-400 text-emerald-400"
                        }`} />
                        <span className="text-sm font-semibold text-slate-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <button className={`mt-10 w-full rounded-2xl py-4 text-sm font-black transition-all ${
                    plan.featured 
                      ? "bg-indigo-600 text-white shadow-xl hover:bg-indigo-500" 
                      : "bg-white/5 text-white border border-white/10 hover:bg-white/10"
                  }`}>
                    {plan.featured ? "Initialize Node" : "Select Tier"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Access Policy Section */}
        <div className="mt-32 rounded-[3.5rem] border border-amber-500/20 bg-amber-500/5 p-8 sm:p-12 text-center lg:text-left overflow-hidden relative">
          <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-amber-500/5 to-transparent pointer-events-none" />
          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-12">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-black text-amber-100 tracking-tight">Security & Access Policy</h2>
              <p className="mt-6 text-lg leading-relaxed text-amber-100/70 font-medium">
                NewHopeGGN provides open public translation modules, but voice-channel synthesis and staff logging remain restricted to authorized clusters. 
                Contact our operations team for custom allowlisting and enterprise deployment.
              </p>
            </div>
            <a href={setupSupportUrl} className="inline-flex h-16 items-center justify-center rounded-2xl bg-amber-500 px-10 font-black text-amber-950 transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(245,158,11,0.2)]">
              Contact Operations
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
