// logo.dev API configuration
const LOGO_DEV_API_KEY = 'pk_LURXB378TgS-zdvustF4Bg';

/**
 * Generate a logo.dev URL for a given domain
 * @param domain - The domain to fetch the logo for (e.g., "netflix.com")
 * @param size - Image size in pixels (default: 128)
 * @returns The logo.dev image URL
 */
export function getLogoUrl(domain: string, size: number = 128): string {
  return `https://img.logo.dev/${domain}?token=${LOGO_DEV_API_KEY}&size=${size}`;
}
