import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { BotDashboardClient } from "./bot-dashboard-client";

export const metadata: Metadata = {
  title: "Bot Dashboard | NewHope Translate",
  description: "Dedicated premium dashboard for NewHope Discord bot translation, voice, and logging controls.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function BotDashboardPage() {
  const user = await getSession();

  if (!user) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-24 sm:pt-32">
        <section className="overflow-hidden rounded-[2rem] border border-[#5865F2]/25 bg-gradient-to-br from-slate-950 via-slate-950 to-[#111741] p-6 shadow-2xl sm:p-10">
          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-indigo-200">Protected Bot Dashboard</div>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-white">Sign in to manage your Discord bot.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            Bot settings are separate from the regular player dashboard. Sign in with Discord, then we will only show controls for servers you manage.
          </p>
          <a
            href="/auth/discord/start?next=/bot/dashboard"
            className="mt-6 inline-flex rounded-full bg-[#5865F2] px-6 py-3 text-sm font-black text-white transition hover:bg-[#4752c4]"
          >
            Continue with Discord
          </a>
        </section>
      </main>
    );
  }

  return <BotDashboardClient user={user} />;
}
