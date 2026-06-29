const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Querying borrow_requests...');
  const { data, error, count } = await supabase
    .from('borrow_requests')
    .select('*', { count: 'exact' });

  if (error) {
    console.error('Database Error:', error);
  } else {
    console.log('Success! Total requests on Supabase:', count);
    console.log('Sample rows:', JSON.stringify(data.slice(0, 5), null, 2));
  }
}

check();
