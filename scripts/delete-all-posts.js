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
  // Get all posted social posts
  const { data: posts, error } = await supabase
    .from('social_posts')
    .select('id, platform, platform_post_id, status, account_type')
    .in('status', ['posted', 'pending', 'failed', 'draft', 'scheduled', 'cancelled']);

  if (error) { console.log('Error fetching posts:', error); return; }
  console.log(`Found ${posts.length} social posts total.`);

  // Get all connections for token lookup
  const { data: connections } = await supabase
    .from('social_connections')
    .select('platform, is_brand_account, vendor_id, access_token');

  const tokenMap = {};
  for (const conn of (connections || [])) {
    const key = conn.is_brand_account ? `brand_${conn.platform}` : `${conn.vendor_id}_${conn.platform}`;
    try {
      tokenMap[key] = decrypt(conn.access_token);
    } catch { /* skip */ }
  }

  for (const post of posts) {
    console.log(`\n--- Post ${post.id} (${post.platform}, ${post.status}) ---`);

    // Try to delete from platform if posted
    if (post.status === 'posted' && post.platform_post_id && (post.platform === 'facebook' || post.platform === 'instagram')) {
      const tokenKey = post.account_type === 'brand' ? `brand_${post.platform}` : `vendor_${post.platform}`;
      // Try brand token first, then any available
      const token = tokenMap[tokenKey] || tokenMap[`brand_${post.platform}`];

      if (token) {
        try {
          const res = await fetch(`${META_GRAPH_URL}/${post.platform_post_id}?access_token=${token}`, { method: 'DELETE' });
          const data = await res.json();
          console.log(`  Platform delete: ${data.success ? 'OK' : 'FAILED'} ${data.error ? '- ' + data.error.message : ''}`);
        } catch (e) {
          console.log(`  Platform delete error: ${e.message}`);
        }
      } else {
        console.log('  No token found for platform delete');
      }
    } else {
      console.log(`  Skipping platform delete (status: ${post.status})`);
    }

    // Delete from database
    const { error: delError } = await supabase
      .from('social_posts')
      .delete()
      .eq('id', post.id);
    console.log(`  DB delete: ${delError ? 'FAILED - ' + delError.message : 'OK'}`);
  }

  console.log('\n=== ALL DONE ===');
}
main();
