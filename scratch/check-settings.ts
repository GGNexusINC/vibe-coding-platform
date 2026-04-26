
import { createSupabaseAdminClient } from "./src/lib/supabase/admin";

async function checkSettings() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select("*");
  
  if (error) {
    console.error("Error fetching settings:", error);
    return;
  }
  
  console.log("Site Settings:", JSON.stringify(data, null, 2));
}

checkSettings();
