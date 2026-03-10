const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const META_GRAPH_URL = 'https://graph.facebook.com/v21.0';

function decrypt(encrypted) {
  const key = Buffer.from(process.env.SOCIAL_TOKEN_ENCRYPTION_KEY, 'hex');
  const [ivHex, authTagHex, ciphertext] = encrypted.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

async function main() {
  // Get all connections
  const { data: connections } = await supabase
    .from('social_connections')
    .select('*');

  console.log('Connections found:', connections.length);

  for (const conn of connections) {
    const token = decrypt(conn.access_token);
    console.log(`\n=== ${conn.platform} (brand=${conn.is_brand_account}, page=${conn.platform_page_id}) ===`);

    if (conn.platform === 'facebook') {
      // Get recent posts on the page
      const res = await fetch(`${META_GRAPH_URL}/${conn.platform_page_id}/feed?fields=id,message,created_time&limit=10&access_token=${token}`);
      const data = await res.json();
      if (data.error) { console.log('Error:', data.error.message); continue; }

      for (const post of (data.data || [])) {
        const isSponti = (post.message || '').includes('SpontiCoupon') || (post.message || '').includes('sponticoupon');
        console.log(`  Post ${post.id}: ${(post.message || '').substring(0, 60)}... ${isSponti ? '[SPONTI]' : ''}`);
        if (isSponti) {
          const delRes = await fetch(`${META_GRAPH_URL}/${post.id}?access_token=${token}`, { method: 'DELETE' });
          const delData = await delRes.json();
          console.log(`    DELETE: ${delData.success ? 'OK' : 'FAILED'} ${delData.error ? delData.error.message : ''}`);
        }
      }
    }

    if (conn.platform === 'instagram') {
      // Get recent media
      const res = await fetch(`${META_GRAPH_URL}/${conn.platform_page_id}/media?fields=id,caption,timestamp&limit=10&access_token=${token}`);
      const data = await res.json();
      if (data.error) { console.log('Error:', data.error.message); continue; }

      for (const media of (data.data || [])) {
        const isSponti = (media.caption || '').includes('SpontiCoupon') || (media.caption || '').includes('sponticoupon');
        console.log(`  Media ${media.id}: ${(media.caption || '').substring(0, 60)}... ${isSponti ? '[SPONTI]' : ''}`);
        if (isSponti) {
          const delRes = await fetch(`${META_GRAPH_URL}/${media.id}?access_token=${token}`, { method: 'DELETE' });
          const delData = await delRes.json();
          console.log(`    DELETE: ${delData.success ? 'OK' : 'FAILED'} ${delData.error ? delData.error.message : ''}`);
        }
      }
    }
  }

  console.log('\n=== DONE ===');
}
main();
