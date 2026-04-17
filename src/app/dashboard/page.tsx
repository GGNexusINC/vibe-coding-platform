import { getSession } from "@/lib/session";
import DashboardClient from "./dashboard-client";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const sp = searchParams ?? {};
  const user = await getSession();
  const msgParam = sp.msg;
  const msg = typeof msgParam === "string" ? msgParam : undefined;

  return (
    <DashboardClient 
      user={user} 
      msg={msg} 
    />
  );
}

