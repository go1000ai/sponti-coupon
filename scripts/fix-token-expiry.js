const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  // Clear token_expires_at on facebook connection - Page tokens don't expire
  const { error } = await supabase
    .from('social_connections')
    .update({ token_expires_at: null })
    .eq('platform', 'facebook')
    .not('access_token', 'is', null);

  if (error) {
    console.log('Error:', error);
  } else {
    console.log('Fixed: cleared token_expires_at on Facebook connections');
  }

  // Verify
  const { data } = await supabase
    .from('social_connections')
    .select('platform, token_expires_at, is_active');
  data.forEach(c => console.log(c.platform, '| expires:', c.token_expires_at, '| active:', c.is_active));
}
main();
