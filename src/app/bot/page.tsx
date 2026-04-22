import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "NewHope Translate Bot | Premium Discord Translation",
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
    cadence: "/month",
    badge: "For small servers",
    description: "Professional text translation and controlled voice speak for one Discord.",
    features: [
      "1 premium Discord server",
      "/nhtranslate text translation",
      "/nhtranslate speak:true voice playback",
      "Basic usage logs",
      "Community support",
    ],
  },
  {
    name: "Pro Voice",
    price: "$59",
    cadence: "/month",
    badge: "Recommended",
    description: "Live VC translation for active staff teams and bilingual communities.",
    features: [
      "Everything in Starter",
      "/vclisten and /vcauto live voice translation",
      "Voice status dashboard access",
      "Priority setup support",
      "Premium guild allowlist",
    ],
    featured: true,
  },
  {
    name: "Server Ops",
    price: "$149",
    cadence: "/month",
    badge: "High volume",
    description: "For larger Discords that need stronger controls, reporting, and support.",
    features: [
      "Everything in Pro Voice",
      "Multi-server licensing",
      "Dedicated setup review",
      "Staff-only command policy",
      "Premium log and reliability monitoring",
    ],
  },
];

const commandRows = [
  ["/nhtranslate", "Translate typed text into another language."],
  ["/nhtranslate speak:true", "Translate text and speak the result in VC for premium servers."],
  ["/vclisten", "Join a voice channel and post live translations."],
  ["/vcauto", "Auto EN/ES voice translation for faster staff use."],
  ["/nhpremium", "Open this premium panel from Discord."],
];

const botClientId =
  process.env.NEXT_PUBLIC_DISCORD_BOT_CLIENT_ID ||
  process.env.DISCORD_BOT_CLIENT_ID ||
  process.env.DISCORD_CLIENT_ID ||
  "";

const addToServerUrl = botClientId
  ? `https://discord.com/oauth2/authorize?client_id=${encodeURIComponent(botClientId)}&permissions=8&integration_type=0&scope=bot+applications.commands`
  : "https://discord.com/developers/applications";

const discordServerUrl = "https://discord.gg/newhopeggn";
const setupSupportUrl = "/support?topic=bot-premium";

function DiscordMark() {
  return (
    <svg viewBox="0 0 245 240" aria-hidden="true" className="h-7 w-7">
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

type BotPremiumPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function BotPremiumPage({ searchParams }: BotPremiumPageProps) {
  const params = await searchParams;
  const ref = Array.isArray(params?.ref) ? params?.ref[0] : params?.ref;
  const fromDiscord = ref === "discord" || ref === "nhpremium";

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:py-14">
      <section className="relative overflow-hidden rounded-[2rem] border border-[#5865F2]/30 bg-[radial-gradient(circle_at_20%_15%,rgba(88,101,242,0.25),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(4,7,15,0.96))] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.55)] sm:p-8">
        <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-[#5865F2]/20 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#5865F2]/30 bg-[#5865F2]/15 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-indigo-100">
              <DiscordMark />
              NewHope Translate Premium
            </div>
            <h1 className="mt-6 max-w-3xl text-4xl font-black tracking-tight text-white sm:text-6xl">
              A Discord translation bot built for serious communities.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">
              NewHope gets full internal access. Outside Discords can license premium features like voice-channel translated speech, live VC translation, admin logs, and reliability monitoring.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <a
                href={addToServerUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#5865F2] px-6 text-sm font-black text-white transition hover:scale-[1.03] hover:bg-[#4752c4]"
              >
                <DiscordMark />
                Add to Server
              </a>
              <Link
                href="/dashboard?tab=bot"
                className="inline-flex h-12 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-300/10 px-6 text-sm font-black text-cyan-100 transition hover:bg-cyan-300/15"
              >
                Bot Dashboard
              </Link>
              <Link
                href={setupSupportUrl}
                className="inline-flex h-12 items-center justify-center rounded-full border border-white/10 bg-white/5 px-6 text-sm font-black text-slate-100 transition hover:bg-white/10"
              >
                Request premium setup
              </Link>
            </div>
            {!fromDiscord && (
              <div className="mt-4 rounded-2xl border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm leading-6 text-amber-100/80">
                Hidden panel mode: this page is not listed in navigation or search. The clean customer link is <span className="font-mono text-amber-50">/bot?ref=discord</span>.
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-[1.75rem] border border-white/10 bg-black/35 p-4 shadow-2xl backdrop-blur">
              <div className="rounded-2xl border border-[#5865F2]/25 bg-[#5865F2]/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.2em] text-indigo-200">Bot install</div>
                    <div className="mt-1 text-sm text-slate-300">Invite, configure, and upgrade from one clean panel.</div>
                  </div>
                  <div className="rounded-2xl bg-[#5865F2] p-3 text-white shadow-[0_0_35px_rgba(88,101,242,0.45)]">
                    <DiscordMark />
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <a
                    href={addToServerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-2xl border border-[#5865F2]/40 bg-[#5865F2]/25 p-4 transition hover:-translate-y-0.5 hover:bg-[#5865F2]/35"
                  >
                    <div className="text-sm font-black text-white">Add to Server</div>
                    <p className="mt-1 text-xs leading-5 text-indigo-100/75">Install bot + slash commands with the permissions needed for VC translation.</p>
                  </a>
                  <a
                    href={discordServerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:-translate-y-0.5 hover:bg-white/10"
                  >
                    <div className="text-sm font-black text-white">Join NewHope</div>
                    <p className="mt-1 text-xs leading-5 text-slate-400">Open a ticket, ask for premium access, or test the bot with staff.</p>
                  </a>
                  <Link
                    href={setupSupportUrl}
                    className="rounded-2xl border border-cyan-300/30 bg-cyan-300/10 p-4 transition hover:-translate-y-0.5 hover:bg-cyan-300/15"
                  >
                    <div className="text-sm font-black text-cyan-100">Setup Panel</div>
                    <p className="mt-1 text-xs leading-5 text-cyan-100/70">Request allowlisting, pricing, and server onboarding.</p>
                  </Link>
                  <Link
                    href="/lottery"
                    className="rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 transition hover:-translate-y-0.5 hover:bg-amber-300/15"
                  >
                    <div className="text-sm font-black text-amber-100">Back to Lottery</div>
                    <p className="mt-1 text-xs leading-5 text-amber-100/70">Return to the public NewHope rewards page.</p>
                  </Link>
                </div>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-black/35 p-4 shadow-2xl backdrop-blur">
              <div className="text-xs font-black uppercase tracking-[0.2em] text-indigo-200">Command Console</div>
              <div className="mt-4 space-y-3">
                {commandRows.map(([command, desc]) => (
                  <div key={command} className="rounded-xl border border-white/8 bg-slate-950/70 p-3">
                    <div className="font-mono text-sm font-bold text-cyan-200">{command}</div>
                    <div className="mt-1 text-xs leading-5 text-slate-400">{desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => (
          <article
            key={plan.name}
            className={`relative overflow-hidden rounded-[1.5rem] border p-5 shadow-2xl ${
              plan.featured
                ? "border-[#5865F2]/50 bg-[#5865F2]/15"
                : "border-white/10 bg-black/30"
            }`}
          >
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-200">{plan.badge}</div>
            <h2 className="mt-3 text-2xl font-black text-white">{plan.name}</h2>
            <div className="mt-3 flex items-end gap-1">
              <span className="text-4xl font-black text-white">{plan.price}</span>
              <span className="pb-1 text-sm text-slate-400">{plan.cadence}</span>
            </div>
            <p className="mt-3 min-h-12 text-sm leading-6 text-slate-400">{plan.description}</p>
            <ul className="mt-5 space-y-2">
              {plan.features.map((feature) => (
                <li key={feature} className="flex gap-2 text-sm text-slate-200">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.75)]" />
                  {feature}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section id="bot-dashboard" className="mt-8 rounded-[1.75rem] border border-[#5865F2]/25 bg-slate-950/80 p-5 shadow-2xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-indigo-200">Bot Dashboard</div>
            <h2 className="mt-2 text-2xl font-black text-white">Install, verify, and upgrade without hunting through menus.</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              This is the customer-facing bot control panel. New servers can invite the bot, request premium allowlisting, and confirm which features are included before staff unlocks live VC translation.
            </p>
          </div>
          <a
            href={addToServerUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-[#5865F2] px-6 text-sm font-black text-white transition hover:scale-[1.03] hover:bg-[#4752c4]"
          >
            <DiscordMark />
            Add Bot
          </a>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {[
            ["1", "Invite bot", "Add the bot with slash commands and voice permissions."],
            ["2", "Run checks", "Use /vcpermcheck to verify View, Connect, and Speak."],
            ["3", "Unlock premium", "Staff adds the server ID to the premium allowlist."],
          ].map(([step, title, text]) => (
            <div key={step} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#5865F2]/25 text-sm font-black text-indigo-100">{step}</div>
              <h3 className="mt-3 font-black text-white">{title}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-400">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-[1.5rem] border border-amber-300/20 bg-amber-300/10 p-5">
        <h2 className="text-xl font-black text-amber-100">Access policy</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-amber-100/75">
          Main NewHopeGGN server access stays unlocked for internal staff. Outside Discords can use basic text translation, but premium voice features require the server ID to be added to the bot premium allowlist.
        </p>
      </section>
    </main>
  );
}
