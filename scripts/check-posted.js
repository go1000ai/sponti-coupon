const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data } = await supabase
    .from('social_posts')
    .select('platform, status, platform_post_id, platform_post_url')
    .eq('status', 'posted')
    .order('created_at', { ascending: false })
    .limit(4);

  data.forEach(p => {
    console.log(p.platform, '| ID:', p.platform_post_id, '| URL:', p.platform_post_url);
  });
}
main();
