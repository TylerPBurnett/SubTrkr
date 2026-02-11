import type { BillingCycle, ItemType } from '../types';
import { getLogoUrl } from '../config/logoApi';

export interface KnownService {
  id: string;
  name: string;
  domain: string;
  defaultPrice: number;
  defaultCurrency: string;
  defaultBillingCycle: BillingCycle;
  suggestedCategory?: string;
  type: ItemType | 'both';
  aliases?: string[];
}

export const KNOWN_SERVICES: KnownService[] = [
  // Streaming
  { id: 'netflix', name: 'Netflix', domain: 'netflix.com', defaultPrice: 15.49, defaultCurrency: 'USD', defaultBillingCycle: 'monthly', suggestedCategory: 'Streaming', type: 'subscription' },
  { id: 'spotify', name: 'Spotify', domain: 'spotify.com', defaultPrice: 10.99, defaultCurrency: 'USD', defaultBillingCycle: 'monthly', suggestedCategory: 'Music', type: 'subscription' },
  { id: 'amazon-prime', name: 'Amazon Prime', domain: 'amazon.com', defaultPrice: 14.99, defaultCurrency: 'USD', defaultBillingCycle: 'monthly', suggestedCategory: 'Streaming', type: 'subscription', aliases: ['Prime', 'Prime Video'] },
  { id: 'disney-plus', name: 'Disney+', domain: 'disneyplus.com', defaultPrice: 13.99, defaultCurrency: 'USD', defaultBillingCycle: 'monthly', suggestedCategory: 'Streaming', type: 'subscription', aliases: ['Disney Plus'] },
  { id: 'hulu', name: 'Hulu', domain: 'hulu.com', defaultPrice: 17.99, defaultCurrency: 'USD', defaultBillingCycle: 'monthly', suggestedCategory: 'Streaming', type: 'subscription' },
  { id: 'hbo-max', name: 'Max', domain: 'max.com', defaultPrice: 15.99, defaultCurrency: 'USD', defaultBillingCycle: 'monthly', suggestedCategory: 'Streaming', type: 'subscription', aliases: ['HBO Max', 'HBO'] },
  { id: 'apple-tv', name: 'Apple TV+', domain: 'tv.apple.com', defaultPrice: 9.99, defaultCurrency: 'USD', defaultBillingCycle: 'monthly', suggestedCategory: 'Streaming', type: 'subscription', aliases: ['Apple TV Plus'] },
  { id: 'youtube-premium', name: 'YouTube Premium', domain: 'youtube.com', defaultPrice: 13.99, defaultCurrency: 'USD', defaultBillingCycle: 'monthly', suggestedCategory: 'Streaming', type: 'subscription', aliases: ['YouTube Music'] },
  { id: 'peacock', name: 'Peacock', domain: 'peacocktv.com', defaultPrice: 7.99, defaultCurrency: 'USD', defaultBillingCycle: 'monthly', suggestedCategory: 'Streaming', type: 'subscription' },
  { id: 'paramount-plus', name: 'Paramount+', domain: 'paramountplus.com', defaultPrice: 11.99, defaultCurrency: 'USD', defaultBillingCycle: 'monthly', suggestedCategory: 'Streaming', type: 'subscription', aliases: ['Paramount Plus'] },
  { id: 'crunchyroll', name: 'Crunchyroll', domain: 'crunchyroll.com', defaultPrice: 7.99, defaultCurrency: 'USD', defaultBillingCycle: 'monthly', suggestedCategory: 'Streaming', type: 'subscription' },

  // Music
  { id: 'apple-music', name: 'Apple Music', domain: 'music.apple.com', defaultPrice: 10.99, defaultCurrency: 'USD', defaultBillingCycle: 'monthly', suggestedCategory: 'Music', type: 'subscription' },
  { id: 'tidal', name: 'Tidal', domain: 'tidal.com', defaultPrice: 10.99, defaultCurrency: 'USD', defaultBillingCycle: 'monthly', suggestedCategory: 'Music', type: 'subscription' },
  { id: 'pandora', name: 'Pandora', domain: 'pandora.com', defaultPrice: 10.99, defaultCurrency: 'USD', defaultBillingCycle: 'monthly', suggestedCategory: 'Music', type: 'subscription' },
  { id: 'deezer', name: 'Deezer', domain: 'deezer.com', defaultPrice: 10.99, defaultCurrency: 'USD', defaultBillingCycle: 'monthly', suggestedCategory: 'Music', type: 'subscription' },

  // Software & Productivity
  { id: 'adobe-cc', name: 'Adobe Creative Cloud', domain: 'adobe.com', defaultPrice: 54.99, defaultCurrency: 'USD', defaultBillingCycle: 'monthly', suggestedCategory: 'Software', type: 'subscription', aliases: ['Adobe', 'Photoshop', 'Illustrator'] },
  { id: 'microsoft-365', name: 'Microsoft 365', domain: 'microsoft.com', defaultPrice: 9.99, defaultCurrency: 'USD', defaultBillingCycle: 'monthly', suggestedCategory: 'Software', type: 'subscription', aliases: ['Office 365', 'Microsoft Office'] },
  { id: 'notion', name: 'Notion', domain: 'notion.so', defaultPrice: 10.00, defaultCurrency: 'USD', defaultBillingCycle: 'monthly', suggestedCategory: 'Software', type: 'subscription' },
  { id: 'github', name: 'GitHub', domain: 'github.com', defaultPrice: 4.00, defaultCurrency: 'USD', defaultBillingCycle: 'monthly', suggestedCategory: 'Software', type: 'subscription' },
  { id: '1password', name: '1Password', domain: '1password.com', defaultPrice: 2.99, defaultCurrency: 'USD', defaultBillingCycle: 'monthly', suggestedCategory: 'Software', type: 'subscription' },
  { id: 'lastpass', name: 'LastPass', domain: 'lastpass.com', defaultPrice: 3.00, defaultCurrency: 'USD', defaultBillingCycle: 'monthly', suggestedCategory: 'Software', type: 'subscription' },
  { id: 'figma', name: 'Figma', domain: 'figma.com', defaultPrice: 15.00, defaultCurrency: 'USD', defaultBillingCycle: 'monthly', suggestedCategory: 'Software', type: 'subscription' },
  { id: 'slack', name: 'Slack', domain: 'slack.com', defaultPrice: 8.75, defaultCurrency: 'USD', defaultBillingCycle: 'monthly', suggestedCategory: 'Software', type: 'subscription' },
  { id: 'zoom', name: 'Zoom', domain: 'zoom.us', defaultPrice: 15.99, defaultCurrency: 'USD', defaultBillingCycle: 'monthly', suggestedCategory: 'Software', type: 'subscription' },
  { id: 'chatgpt', name: 'ChatGPT Plus', domain: 'openai.com', defaultPrice: 20.00, defaultCurrency: 'USD', defaultBillingCycle: 'monthly', suggestedCategory: 'Software', type: 'subscription', aliases: ['OpenAI', 'ChatGPT'] },
  { id: 'claude', name: 'Claude Pro', domain: 'anthropic.com', defaultPrice: 20.00, defaultCurrency: 'USD', defaultBillingCycle: 'monthly', suggestedCategory: 'Software', type: 'subscription', aliases: ['Anthropic', 'Claude'] },

  // Cloud Storage
  { id: 'dropbox', name: 'Dropbox', domain: 'dropbox.com', defaultPrice: 11.99, defaultCurrency: 'USD', defaultBillingCycle: 'monthly', suggestedCategory: 'Cloud Storage', type: 'subscription' },
  { id: 'google-one', name: 'Google One', domain: 'one.google.com', defaultPrice: 2.99, defaultCurrency: 'USD', defaultBillingCycle: 'monthly', suggestedCategory: 'Cloud Storage', type: 'subscription', aliases: ['Google Drive', 'Google Storage'] },
  { id: 'icloud', name: 'iCloud+', domain: 'icloud.com', defaultPrice: 2.99, defaultCurrency: 'USD', defaultBillingCycle: 'monthly', suggestedCategory: 'Cloud Storage', type: 'subscription', aliases: ['iCloud'] },

  // Gaming
  { id: 'xbox-game-pass', name: 'Xbox Game Pass', domain: 'xbox.com', defaultPrice: 16.99, defaultCurrency: 'USD', defaultBillingCycle: 'monthly', suggestedCategory: 'Gaming', type: 'subscription', aliases: ['Game Pass', 'Xbox'] },
  { id: 'playstation-plus', name: 'PlayStation Plus', domain: 'playstation.com', defaultPrice: 17.99, defaultCurrency: 'USD', defaultBillingCycle: 'monthly', suggestedCategory: 'Gaming', type: 'subscription', aliases: ['PS Plus', 'PSN'] },
  { id: 'nintendo-online', name: 'Nintendo Switch Online', domain: 'nintendo.com', defaultPrice: 3.99, defaultCurrency: 'USD', defaultBillingCycle: 'monthly', suggestedCategory: 'Gaming', type: 'subscription', aliases: ['Nintendo Online', 'Switch Online'] },
  { id: 'ea-play', name: 'EA Play', domain: 'ea.com', defaultPrice: 4.99, defaultCurrency: 'USD', defaultBillingCycle: 'monthly', suggestedCategory: 'Gaming', type: 'subscription' },

  // Fitness
  { id: 'peloton', name: 'Peloton', domain: 'onepeloton.com', defaultPrice: 44.00, defaultCurrency: 'USD', defaultBillingCycle: 'monthly', suggestedCategory: 'Fitness', type: 'subscription' },
  { id: 'apple-fitness', name: 'Apple Fitness+', domain: 'fitness.apple.com', defaultPrice: 9.99, defaultCurrency: 'USD', defaultBillingCycle: 'monthly', suggestedCategory: 'Fitness', type: 'subscription', aliases: ['Fitness Plus', 'Apple Fitness'] },
  { id: 'strava', name: 'Strava', domain: 'strava.com', defaultPrice: 11.99, defaultCurrency: 'USD', defaultBillingCycle: 'monthly', suggestedCategory: 'Fitness', type: 'subscription' },

  // News & Learning
  { id: 'nyt', name: 'The New York Times', domain: 'nytimes.com', defaultPrice: 4.25, defaultCurrency: 'USD', defaultBillingCycle: 'monthly', suggestedCategory: 'News', type: 'subscription', aliases: ['NYT', 'NY Times'] },
  { id: 'wsj', name: 'The Wall Street Journal', domain: 'wsj.com', defaultPrice: 12.99, defaultCurrency: 'USD', defaultBillingCycle: 'monthly', suggestedCategory: 'News', type: 'subscription', aliases: ['WSJ'] },
  { id: 'washington-post', name: 'The Washington Post', domain: 'washingtonpost.com', defaultPrice: 9.99, defaultCurrency: 'USD', defaultBillingCycle: 'monthly', suggestedCategory: 'News', type: 'subscription' },
  { id: 'medium', name: 'Medium', domain: 'medium.com', defaultPrice: 5.00, defaultCurrency: 'USD', defaultBillingCycle: 'monthly', suggestedCategory: 'News', type: 'subscription' },

  // Bills - Phone & Internet
  { id: 'att', name: 'AT&T', domain: 'att.com', defaultPrice: 75.00, defaultCurrency: 'USD', defaultBillingCycle: 'monthly', suggestedCategory: 'Phone & Internet', type: 'bill' },
  { id: 'verizon', name: 'Verizon', domain: 'verizon.com', defaultPrice: 80.00, defaultCurrency: 'USD', defaultBillingCycle: 'monthly', suggestedCategory: 'Phone & Internet', type: 'bill' },
  { id: 't-mobile', name: 'T-Mobile', domain: 't-mobile.com', defaultPrice: 70.00, defaultCurrency: 'USD', defaultBillingCycle: 'monthly', suggestedCategory: 'Phone & Internet', type: 'bill' },
  { id: 'comcast', name: 'Comcast Xfinity', domain: 'xfinity.com', defaultPrice: 89.99, defaultCurrency: 'USD', defaultBillingCycle: 'monthly', suggestedCategory: 'Phone & Internet', type: 'bill', aliases: ['Xfinity', 'Comcast'] },
  { id: 'spectrum', name: 'Spectrum', domain: 'spectrum.com', defaultPrice: 79.99, defaultCurrency: 'USD', defaultBillingCycle: 'monthly', suggestedCategory: 'Phone & Internet', type: 'bill' },
  { id: 'cox', name: 'Cox', domain: 'cox.com', defaultPrice: 79.99, defaultCurrency: 'USD', defaultBillingCycle: 'monthly', suggestedCategory: 'Phone & Internet', type: 'bill' },

  // Bills - Insurance
  { id: 'geico', name: 'GEICO', domain: 'geico.com', defaultPrice: 150.00, defaultCurrency: 'USD', defaultBillingCycle: 'monthly', suggestedCategory: 'Insurance', type: 'bill' },
  { id: 'state-farm', name: 'State Farm', domain: 'statefarm.com', defaultPrice: 140.00, defaultCurrency: 'USD', defaultBillingCycle: 'monthly', suggestedCategory: 'Insurance', type: 'bill' },
  { id: 'progressive', name: 'Progressive', domain: 'progressive.com', defaultPrice: 135.00, defaultCurrency: 'USD', defaultBillingCycle: 'monthly', suggestedCategory: 'Insurance', type: 'bill' },
  { id: 'allstate', name: 'Allstate', domain: 'allstate.com', defaultPrice: 145.00, defaultCurrency: 'USD', defaultBillingCycle: 'monthly', suggestedCategory: 'Insurance', type: 'bill' },

  // Bills - Utilities
  { id: 'pge', name: 'PG&E', domain: 'pge.com', defaultPrice: 150.00, defaultCurrency: 'USD', defaultBillingCycle: 'monthly', suggestedCategory: 'Utilities', type: 'bill', aliases: ['Pacific Gas Electric'] },
  { id: 'con-edison', name: 'Con Edison', domain: 'coned.com', defaultPrice: 120.00, defaultCurrency: 'USD', defaultBillingCycle: 'monthly', suggestedCategory: 'Utilities', type: 'bill', aliases: ['ConEd'] },
  { id: 'duke-energy', name: 'Duke Energy', domain: 'duke-energy.com', defaultPrice: 130.00, defaultCurrency: 'USD', defaultBillingCycle: 'monthly', suggestedCategory: 'Utilities', type: 'bill' },
];

/**
 * Search services by name or alias
 * @param query - Search query string
 * @param type - Optional filter by item type
 * @returns Matching services (max 8)
 */
export function searchServices(
  query: string,
  type?: 'subscription' | 'bill'
): KnownService[] {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return [];

  return KNOWN_SERVICES.filter(service => {
    // Filter by type if specified
    if (type && service.type !== type && service.type !== 'both') return false;

    // Match name
    if (service.name.toLowerCase().includes(normalizedQuery)) return true;

    // Match aliases
    if (service.aliases?.some(alias =>
      alias.toLowerCase().includes(normalizedQuery)
    )) return true;

    return false;
  }).slice(0, 8);
}

/**
 * Get service by ID
 */
export function getServiceById(id: string): KnownService | undefined {
  return KNOWN_SERVICES.find(s => s.id === id);
}

/**
 * Get logo URL for a known service
 */
export function getServiceLogoUrl(service: KnownService, size?: number): string {
  return getLogoUrl(service.domain, size);
}
