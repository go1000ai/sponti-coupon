const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  // Get the deal from the most recent failed post
  const { data: post } = await supabase
    .from('social_posts')
    .select('deal_id, image_url, claim_url')
    .eq('status', 'failed')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  console.log('Post image_url:', post.image_url);
  console.log('Post claim_url:', post.claim_url);
  console.log('Post deal_id:', post.deal_id);

  // Get the deal's image
  const { data: deal } = await supabase
    .from('deals')
    .select('title, image_url')
    .eq('id', post.deal_id)
    .single();

  console.log('Deal title:', deal.title);
  console.log('Deal image_url:', deal.image_url);
}
main();
