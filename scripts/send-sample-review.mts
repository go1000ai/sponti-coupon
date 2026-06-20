import { readFileSync } from 'fs';

// Load .env.local into process.env (strip surrounding quotes + stray trailing \n)
const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) {
    const val = m[2].trim().replace(/^["']|["']$/g, '').replace(/\\n$/, '').trim();
    if (!process.env[m[1]]) process.env[m[1]] = val;
  }
}

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sponticoupon.com';
const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Grab a real deal so the button lands on a working page
let dealId = '';
let dealTitle = 'Your Recent Deal';
let businessName = 'a local business';
try {
  const now = encodeURIComponent(new Date().toISOString());
  const res = await fetch(
    `${sbUrl}/rest/v1/deals?select=id,title,vendor:vendors(business_name)&status=eq.active&expires_at=gte.${now}&order=expires_at.desc&limit=1`,
    { headers: { apikey: sbKey, authorization: `Bearer ${sbKey}` } },
  );
  const rows = await res.json();
  if (Array.isArray(rows) && rows[0]) {
    dealId = rows[0].id;
    dealTitle = rows[0].title || dealTitle;
    businessName = rows[0].vendor?.business_name || businessName;
  }
} catch { /* fall back to placeholder below */ }

const reviewUrl = dealId ? `${appUrl}/deals/${dealId}?review=1` : `${appUrl}/deals`;

const { sendReviewRequestEmail } = await import('../src/lib/email/review-request.ts');

const toEmail = process.env.TO_EMAIL || 'info@sponticoupon.com';
await sendReviewRequestEmail({
  to: toEmail,
  customerName: 'Heriberto',
  businessName,
  dealTitle,
  reviewUrl,
  customerId: 'sample-preview',
});

console.log('SAMPLE SENT to ' + toEmail);
console.log('  business:', businessName);
console.log('  deal:', dealTitle);
console.log('  button →', reviewUrl);
