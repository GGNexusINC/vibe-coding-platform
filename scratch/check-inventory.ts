
import { createClient } from "@supabase/supabase-js";

async function run() {
  const supabaseUrl = "https://jpbipeiswduuxvbvxmt.supabase.co";
  const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwYmlwZWlzd2R1dXh2ZmJ2eG10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyOTk2NjEsImV4cCI6MjA5MTg3NTY2MX0.SGoAhljHmlhLq-ixkZCfqOs1J7yVg1L4v20WTmwwOfc"; 

  const supabase = createClient(supabaseUrl, supabaseKey);

  const userId = "1310794181190352997";
  
  console.log(`Checking inventory for ${userId}...`);

  const { data: items, error } = await supabase
    .from("user_inventory")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching inventory:", error);
    return;
  }

  console.log("Found items:");
  console.log(JSON.stringify(items, null, 2));
}

run();
