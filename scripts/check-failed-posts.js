const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data, error } = await supabase
    .from('social_posts')
    .select('platform, status, error_message, created_at')
    .eq('status', 'failed')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) { console.log('Error:', error); return; }
  data.forEach(p => {
    console.log('---');
    console.log(p.platform, '|', p.status, '|', p.created_at);
    console.log('Error:', p.error_message);
  });
}
main();
