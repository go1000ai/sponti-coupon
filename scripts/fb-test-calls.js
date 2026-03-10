const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

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
  const { data: connections } = await supabase
    .from('social_connections')
    .select('*');

  for (const conn of connections) {
    console.log(`\n=== ${conn.platform.toUpperCase()} ===`);
    console.log('Page ID:', conn.platform_page_id);

    let token;
    try {
      token = decrypt(conn.access_token);
      console.log('Token decrypted OK (length:', token.length, ')');
    } catch (e) {
      console.log('DECRYPT FAILED:', e.message);
      continue;
    }

    const BASE = 'https://graph.facebook.com/v21.0';
    const pageId = conn.platform_page_id;

    if (conn.platform === 'facebook') {
      // Test 1: pages_show_list
      console.log('\n--- pages_show_list (GET /me/accounts) ---');
      let res = await fetch(`${BASE}/me/accounts?access_token=${token}`);
      let data = await res.json();
      console.log(data.error ? 'FAILED: ' + data.error.message : 'OK: ' + (data.data?.length || 0) + ' pages');

      // Test 2: pages_read_engagement
      console.log('\n--- pages_read_engagement (GET /{pageId}/feed) ---');
      res = await fetch(`${BASE}/${pageId}/feed?fields=message,created_time&limit=3&access_token=${token}`);
      data = await res.json();
      console.log(data.error ? 'FAILED: ' + data.error.message : 'OK: ' + (data.data?.length || 0) + ' posts');

      // Test 3: pages_manage_metadata
      console.log('\n--- pages_manage_metadata (GET /{pageId}) ---');
      res = await fetch(`${BASE}/${pageId}?fields=name,about,category&access_token=${token}`);
      data = await res.json();
      console.log(data.error ? 'FAILED: ' + data.error.message : 'OK: ' + data.name);

      // Test 4: pages_manage_posts (post + delete)
      console.log('\n--- pages_manage_posts (POST /{pageId}/feed) ---');
      res = await fetch(`${BASE}/${pageId}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'API Test - SpontiCoupon integration verification. Please ignore.', access_token: token }),
      });
      data = await res.json();
      if (data.error) {
        console.log('FAILED:', data.error.message, '| Code:', data.error.code, '| Type:', data.error.type);
      } else {
        console.log('OK: Post ID:', data.id);
        // Delete test post
        const delRes = await fetch(`${BASE}/${data.id}?access_token=${token}`, { method: 'DELETE' });
        const delData = await delRes.json();
        console.log('Cleaned up:', delData.success ? 'yes' : 'no');
      }

      // Test 5: business_management
      console.log('\n--- business_management (GET /me/businesses) ---');
      res = await fetch(`${BASE}/me/businesses?access_token=${token}`);
      data = await res.json();
      console.log(data.error ? 'FAILED: ' + data.error.message : 'OK: ' + (data.data?.length || 0) + ' businesses');
    }

    if (conn.platform === 'instagram') {
      // Test: instagram_basic
      console.log('\n--- instagram_basic (GET /{igId}?fields=username) ---');
      let res = await fetch(`${BASE}/${pageId}?fields=id,username,media_count&access_token=${token}`);
      let data = await res.json();
      console.log(data.error ? 'FAILED: ' + data.error.message : 'OK: @' + data.username + ' (' + data.media_count + ' posts)');

      // Test: instagram_content_publish (create + publish)
      console.log('\n--- instagram_content_publish (POST /{igId}/media) ---');
      res = await fetch(`${BASE}/${pageId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: 'https://sponticoupon.com/og-image.png',
          caption: 'API Test - SpontiCoupon integration verification. Please ignore. #test',
          access_token: token,
        }),
      });
      data = await res.json();
      if (data.error) {
        console.log('FAILED:', data.error.message);
      } else {
        console.log('OK: Container ID:', data.id);
        // Publish
        console.log('Publishing...');
        const pubRes = await fetch(`${BASE}/${pageId}/media_publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ creation_id: data.id, access_token: token }),
        });
        const pubData = await pubRes.json();
        console.log(pubData.error ? 'PUBLISH FAILED: ' + pubData.error.message : 'OK: Published ID: ' + pubData.id);
      }
    }
  }

  console.log('\n=== ALL TESTS DONE ===');
}
main();
