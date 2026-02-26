#!/usr/bin/env node
// Backfill search_tags for all existing deals using Gemini AI
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ypoytvqxuxpjipcyaxwg.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;

if (!SUPABASE_KEY || !GEMINI_KEY) {
  console.error('Set SUPABASE_SERVICE_ROLE_KEY and GEMINI_API_KEY env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function generateTags(deal) {
  const info = {
    title: deal.title,
    description: deal.description || 'N/A',
    deal_type: deal.deal_type === 'sponti_coupon' ? 'Flash deal' : 'Regular deal',
    business: deal.vendor?.business_name || 'N/A',
    category: deal.vendor?.category || 'N/A',
  };

  const prompt = `Generate 15-20 search keywords/tags for this local deal so customers can find it easily.

Deal: "${info.title}"
Description: ${info.description}
Type: ${info.deal_type}
Business: ${info.business}
Category: ${info.category}

Include:
1. Direct terms (what the deal IS)
2. Related activities (dinner, lunch, date night, family outing, etc.)
3. Occasion/context words (birthday, weekend, girls night, etc.)
4. Synonyms and alternative phrasings
5. Food/cuisine type or service type terms
6. Experience words (fun, relaxing, adventure, etc.)

Return ONLY a JSON array of lowercase strings. Example: ["sushi","dinner","date night","japanese food"]`;

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return [];

  try {
    const tags = JSON.parse(match[0]);
    return Array.from(new Set(
      tags.map(t => t.toLowerCase().trim()).filter(t => t.length > 0 && t.length <= 50)
    )).slice(0, 25);
  } catch {
    return [];
  }
}

async function main() {
  // Fetch all deals with vendor info
  const { data: deals, error } = await supabase
    .from('deals')
    .select('id, title, description, deal_type, vendor:vendors(business_name, category, description)')
    .order('created_at', { ascending: true });

  if (error) { console.error('Fetch error:', error); process.exit(1); }

  console.log(`Found ${deals.length} deals to tag.\n`);

  let success = 0;
  let failed = 0;

  for (const deal of deals) {
    process.stdout.write(`Tagging "${deal.title}"... `);
    try {
      const tags = await generateTags(deal);
      if (tags.length === 0) {
        console.log('SKIP (no tags generated)');
        failed++;
        continue;
      }

      const { error: updateError } = await supabase
        .from('deals')
        .update({ search_tags: tags })
        .eq('id', deal.id);

      if (updateError) {
        console.log(`ERROR: ${updateError.message}`);
        failed++;
      } else {
        console.log(`OK (${tags.length} tags: ${tags.slice(0, 5).join(', ')}...)`);
        success++;
      }

      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.log(`ERROR: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone! ${success} tagged, ${failed} failed out of ${deals.length} deals.`);
}

main();
