const LOGO_PROXY_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/logo-proxy`;

/**
 * Generate a logo URL for a given domain, routed through the server-side proxy.
 * @param domain - The domain to fetch the logo for (e.g., "netflix.com")
 * @param size - Image size in pixels (default: 128)
 * @returns The proxied logo image URL
 */
export function getLogoUrl(domain: string, size: number = 128): string {
  return `${LOGO_PROXY_BASE}?domain=${encodeURIComponent(domain)}&size=${size}`;
}
