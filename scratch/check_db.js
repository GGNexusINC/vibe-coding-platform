const { createClient } = require('@supabase/supabase-js');

// These are typically available in the environment during run_command if they are set in the workspace
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Checking table: minigame_spins');
  const { data, error, count } = await supabase
    .from('minigame_spins')
    .select('*', { count: 'exact' });

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Total rows:', count);
    console.log('Sample rows:', JSON.stringify(data.slice(0, 5), null, 2));
  }
}

check();
