
import { createClient } from "@supabase/supabase-js";

async function run() {
  const supabaseUrl = "https://jpbipeiswduuxvbvxmt.supabase.co"; // From public env or derived
  const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwYmlwZWlzd2R1dXh2ZmJ2eG10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyOTk2NjEsImV4cCI6MjA5MTg3NTY2MX0.SGoAhljHmlhLq-ixkZCfqOs1J7yVg1L4v20WTmwwOfc"; // Hardcoded for one-off check

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: logs, error } = await supabase
    .from("activity_logs")
    .select("username, discord_id")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    console.error("Error fetching logs:", error);
    return;
  }

  console.log("Recent activity logs (Usernames & IDs):");
  console.log(JSON.stringify(logs, null, 2));
}

run();
