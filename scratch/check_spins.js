const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('minigame_spins')
    .select('*')
    .order('spun_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching minigame_spins:', error);
  } else {
    console.log('Last 5 spins:', JSON.stringify(data, null, 2));
  }
}

check();
