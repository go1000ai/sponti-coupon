import { slugify } from '@/lib/utils';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True when the URL param is a deal UUID rather than an SEO slug. */
export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

// Minimal shape of the Supabase query builder we rely on — keeps this module
// usable from both the Node and Edge runtimes without pulling in client types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbLike = { from: (table: string) => any };

/**
 * Build a clean, human-readable, keyword-rich slug from a name (e.g.
 * "eddies-garage-premium-european-oil-change-15point-inspection").
 *
 * The slug is descriptive on its own — no hex/UUID suffix. To guarantee the
 * `deals.slug` UNIQUE constraint holds, a short numeric suffix (`-2`, `-3`, …)
 * is appended ONLY when the clean slug already belongs to another deal.
 *
 * @param excludeId  Skip this deal's own row when checking for conflicts (so
 *                   re-slugging an existing deal doesn't collide with itself).
 */
export async function generateUniqueDealSlug(
  db: DbLike,
  name: string,
  excludeId?: string
): Promise<string> {
  const base = slugify(name).replace(/^-+|-+$/g, '') || 'deal';

  for (let n = 1; n <= 50; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    let query = db.from('deals').select('id').eq('slug', candidate).limit(1);
    if (excludeId) query = query.neq('id', excludeId);
    const { data } = await query;
    if (!data || data.length === 0) return candidate;
  }

  // Pathological fallback (50 identically-named deals) — stay unique with an id fragment.
  return excludeId ? `${base}-${excludeId.slice(0, 8)}` : base;
}

/**
 * Resolve a deal from a URL param that may be a UUID, the current slug, or a
 * historical slug (kept in `deals.previous_slugs` after a slug change).
 *
 * @returns the deal row (or null) and `matchedOldSlug` — true when the param
 *          matched a retired slug, signalling the caller to 301 to `deal.slug`.
 */
export async function resolveDealByParam(
  db: DbLike,
  idOrSlug: string,
  select = '*'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ deal: any | null; matchedOldSlug: boolean }> {
  const column = isUuid(idOrSlug) ? 'id' : 'slug';

  const { data: current } = await db
    .from('deals')
    .select(select)
    .eq(column, idOrSlug)
    .maybeSingle();

  if (current) return { deal: current, matchedOldSlug: false };
  if (column === 'id') return { deal: null, matchedOldSlug: false };

  // Fall back to retired slugs so old links/shares/index entries still resolve.
  const { data: prior } = await db
    .from('deals')
    .select(select)
    .contains('previous_slugs', [idOrSlug])
    .limit(1)
    .maybeSingle();

  return { deal: prior ?? null, matchedOldSlug: Boolean(prior) };
}
