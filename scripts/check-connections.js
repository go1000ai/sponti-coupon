const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data, error } = await supabase
    .from('social_connections')
    .select('id, platform, platform_page_id, is_active, is_brand_account, access_token, refresh_token, token_expires_at, last_error, connected_at');

  if (error) { console.log('Error:', error); return; }
  if (data.length === 0) { console.log('No social connections found.'); return; }

  data.forEach(c => {
    console.log('---');
    console.log('Platform:', c.platform);
    console.log('Page ID:', c.platform_page_id);
    console.log('Active:', c.is_active);
    console.log('Brand:', c.is_brand_account);
    console.log('Has access_token:', c.access_token ? 'YES (' + c.access_token.length + ' chars)' : 'NO/EMPTY');
    console.log('refresh_token:', c.refresh_token);
    console.log('token_expires_at:', c.token_expires_at);
    console.log('Last error:', c.last_error);
    console.log('Connected:', c.connected_at);
  });
}
main();
