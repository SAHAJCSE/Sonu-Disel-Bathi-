// Reliable static public image URLs
export const BHATTI_STATIC_URLS = {
  "Small": "/images/bhatti_small_model_1794033585976.jpg",
  "Medium": "/images/bhatti_medium_model_1794033586446.jpg",
  "Large": "/images/bhatti_large_model_1794033589239.jpg",
  "ExtraLarge": "/images/bhatti_jumbo_double_1794033588535.jpg",
  "Hero": "/images/hero_workshop_bhatti_1794033589036.jpg"
} as const;

export function resolveProductImageUrl(url?: string, size?: string): string {
  if (!url) {
    if (size === 'Small') return BHATTI_STATIC_URLS.Small;
    if (size === 'Large') return BHATTI_STATIC_URLS.Large;
    if (size === 'Extra Large') return BHATTI_STATIC_URLS.ExtraLarge;
    return BHATTI_STATIC_URLS.Medium;
  }
  // Convert any stale /src/assets/images paths to robust public /images paths
  if (url.includes('bhatti_small_model')) return BHATTI_STATIC_URLS.Small;
  if (url.includes('bhatti_medium_model')) return BHATTI_STATIC_URLS.Medium;
  if (url.includes('bhatti_large_model')) return BHATTI_STATIC_URLS.Large;
  if (url.includes('bhatti_jumbo_double')) return BHATTI_STATIC_URLS.ExtraLarge;
  if (url.includes('hero_workshop_bhatti')) return BHATTI_STATIC_URLS.Hero;
  return url;
}
