/** Category-appropriate fallback images for deals without uploaded photos */
export const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  'restaurants': 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=800&auto=format&fit=crop',
  'beauty-spa': 'https://images.unsplash.com/photo-1560750588-73207b1ef5b8?q=80&w=800&auto=format&fit=crop',
  'health-fitness': 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=800&auto=format&fit=crop',
  'entertainment': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=800&auto=format&fit=crop',
  'food-drink': 'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?q=80&w=800&auto=format&fit=crop',
  'shopping': 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=800&auto=format&fit=crop',
};

/** Default fallback if category is unknown */
export const DEFAULT_DEAL_IMAGE = 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=800&auto=format&fit=crop';

/** Get the best available image for a deal */
export function getDealImage(imageUrl: string | null | undefined, category?: string | null): string {
  if (imageUrl) return imageUrl;
  if (category && CATEGORY_FALLBACK_IMAGES[category]) return CATEGORY_FALLBACK_IMAGES[category];
  return DEFAULT_DEAL_IMAGE;
}
