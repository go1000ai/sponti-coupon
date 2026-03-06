import type { SupabaseClient } from '@supabase/supabase-js';

// Alphanumeric chars excluding ambiguous ones (0/O, 1/I/l)
const CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Generate a single promo code: SPONTI-XXXXXXXX */
export function generatePromoCode(): string {
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return `SPONTI-${code}`;
}

/** Generate `count` unique promo codes */
export function generatePromoCodes(count: number): string[] {
  const codes = new Set<string>();
  let attempts = 0;
  while (codes.size < count && attempts < count * 3) {
    codes.add(generatePromoCode());
    attempts++;
  }
  return Array.from(codes);
}

/** Insert promo codes into deal_promo_codes table */
export async function insertPromoCodes(
  supabase: SupabaseClient,
  dealId: string,
  codes: string[],
): Promise<{ inserted: number; error?: string }> {
  const rows = codes.map(code => ({ deal_id: dealId, code }));

  // Batch in chunks of 200 to avoid payload limits
  let inserted = 0;
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const { error } = await supabase.from('deal_promo_codes').insert(chunk);
    if (error) return { inserted, error: error.message };
    inserted += chunk.length;
  }

  return { inserted };
}

/** Atomically assign the next available promo code to a claim */
export async function assignPromoCode(
  supabase: SupabaseClient,
  dealId: string,
  claimId: string,
): Promise<string | null> {
  const { data, error } = await supabase.rpc('assign_promo_code', {
    p_deal_id: dealId,
    p_claim_id: claimId,
  });

  if (error) {
    console.error('[PromoCode] Assignment error:', error.message);
    return null;
  }

  return data as string | null;
}

/** Get available (unclaimed) code count for a deal */
export async function getAvailableCodeCount(
  supabase: SupabaseClient,
  dealId: string,
): Promise<number> {
  const { count } = await supabase
    .from('deal_promo_codes')
    .select('id', { count: 'exact', head: true })
    .eq('deal_id', dealId)
    .is('claim_id', null);

  return count || 0;
}

/** Get total code count for a deal */
export async function getTotalCodeCount(
  supabase: SupabaseClient,
  dealId: string,
): Promise<number> {
  const { count } = await supabase
    .from('deal_promo_codes')
    .select('id', { count: 'exact', head: true })
    .eq('deal_id', dealId);

  return count || 0;
}

/** Check if a deal uses promo codes (has website_url) */
export function isDealOnline(deal: { website_url?: string | null }): boolean {
  return !!deal.website_url;
}
