# Adding New Services to SubTrkr

This guide explains how to add new subscription services and bills to the autocomplete system.

## Quick Overview

Services are defined in a single file: `src/data/knownServices.ts`

When users type in the subscription/bill form, the autocomplete searches this list and shows matching services with logos, prices, and suggested categories.

## Service Structure

Each service follows this TypeScript interface:

```typescript
{
  id: string;              // Unique identifier (kebab-case)
  name: string;            // Display name
  domain: string;          // Website domain (used for logo fetching)
  defaultPrice: number;    // Monthly price in USD
  defaultCurrency: string; // Currency code (e.g., "USD")
  defaultBillingCycle: BillingCycle; // "weekly" | "monthly" | "quarterly" | "yearly"
  suggestedCategory?: string;        // Category name (optional)
  type: ItemType | 'both';           // "subscription" | "bill" | "both"
  aliases?: string[];                // Alternative search terms (optional)
}
```

## Adding a New Service

### 1. Find the Right Category Section

Open `src/data/knownServices.ts` and locate the appropriate category comment:

- `// Streaming`
- `// Music`
- `// Software & Productivity`
- `// Cloud Storage`
- `// Gaming`
- `// Fitness`
- `// News & Learning`
- `// VPN & Security`
- `// Food Delivery`
- `// Shopping & Memberships`
- `// Financial & Budgeting`
- `// Home Security`
- `// Bills - Phone & Internet`
- `// Bills - Insurance`
- `// Bills - Utilities`

### 2. Add Your Service Entry

Example:

```typescript
{
  id: 'notion',
  name: 'Notion',
  domain: 'notion.so',
  defaultPrice: 10.00,
  defaultCurrency: 'USD',
  defaultBillingCycle: 'monthly',
  suggestedCategory: 'Software',
  type: 'subscription'
},
```

**With aliases:**

```typescript
{
  id: 'chatgpt',
  name: 'ChatGPT Plus',
  domain: 'openai.com',
  defaultPrice: 20.00,
  defaultCurrency: 'USD',
  defaultBillingCycle: 'monthly',
  suggestedCategory: 'Software',
  type: 'subscription',
  aliases: ['OpenAI', 'ChatGPT']
},
```

### 3. Field Guidelines

**id:**
- Use kebab-case
- Make it unique and descriptive
- Examples: `netflix`, `spotify`, `amazon-prime`, `google-workspace`

**name:**
- Official brand name as users know it
- Include tier if relevant: "ChatGPT Plus", "Canva Pro", "iCloud+"

**domain:**
- Main website domain
- Used by logo API to fetch service logos
- Don't include `https://` or `www.`
- Examples: `netflix.com`, `spotify.com`, `notion.so`

**defaultPrice:**
- Use the **monthly** equivalent price
- For annual plans: divide by 12 (e.g., $60/year = 5.00)
- For weekly plans: multiply by 4.33 (average weeks per month)
- Use standard/individual tier pricing
- Examples: `15.49`, `10.99`, `5.00`

**defaultCurrency:**
- Use 3-letter currency code
- Most common: `"USD"`, `"EUR"`, `"GBP"`, `"CAD"`

**defaultBillingCycle:**
- `"weekly"` - Charged every week
- `"monthly"` - Charged every month (most common)
- `"quarterly"` - Charged every 3 months
- `"yearly"` - Charged annually

**suggestedCategory:**
- Must match an existing category name from Settings
- Common categories:
  - Subscriptions: `Streaming`, `Music`, `Software`, `Gaming`, `Fitness`, `Cloud Storage`, `News`, `Security`, `Food & Delivery`, `Shopping`, `Finance`, `Home & Security`
  - Bills: `Phone & Internet`, `Insurance`, `Utilities`

**type:**
- `"subscription"` - Recurring subscription services
- `"bill"` - Utility bills and insurance
- `"both"` - Can be either (rare)

**aliases (optional):**
- Alternative names users might search for
- Brand variations, common misspellings, parent companies
- Examples: `['Prime', 'Prime Video']` for Amazon Prime
- Examples: `['OpenAI', 'ChatGPT']` for ChatGPT Plus

## Finding Accurate Information

### Pricing
1. Visit the service's pricing page
2. Use standard/individual tier (not family/team plans)
3. Convert annual pricing to monthly (divide by 12)
4. Round to 2 decimal places

### Domains
- Use the main website domain
- The logo API will attempt to fetch from `https://logo.clearbit.com/{domain}`
- Test: Visit `https://logo.clearbit.com/netflix.com` to see if logo exists

### Categories
- Look at what category similar services use
- Check `src/components/CategorySettings.tsx` for the full list
- When in doubt, use `Software` for tech services or `Other`

## Testing Your Changes

After adding services:

1. **Verify no syntax errors:**
   ```bash
   bunx tsc --noEmit src/data/knownServices.ts
   ```

2. **Test search function:**
   ```bash
   # Create test file
   cat > test-search.mjs << 'EOF'
   import { searchServices } from './src/data/knownServices.ts';
   console.log('Result:', searchServices('your-service-name', 'subscription'));
   EOF

   bun test-search.mjs
   rm test-search.mjs
   ```

3. **Run the app:**
   ```bash
   bun tauri dev
   ```

4. **Test in UI:**
   - Open "Add Subscription" form
   - Type the service name
   - Verify it appears in autocomplete
   - Check that logo, price, and category are correct

## Example: Adding Multiple Services

```typescript
// VPN & Security
{ id: 'nordvpn', name: 'NordVPN', domain: 'nordvpn.com', defaultPrice: 12.99, defaultCurrency: 'USD', defaultBillingCycle: 'monthly', suggestedCategory: 'Security', type: 'subscription' },
{ id: 'expressvpn', name: 'ExpressVPN', domain: 'expressvpn.com', defaultPrice: 12.95, defaultCurrency: 'USD', defaultBillingCycle: 'monthly', suggestedCategory: 'Security', type: 'subscription' },

// Developer Tools
{ id: 'vercel', name: 'Vercel', domain: 'vercel.com', defaultPrice: 20.00, defaultCurrency: 'USD', defaultBillingCycle: 'monthly', suggestedCategory: 'Software', type: 'subscription' },
{ id: 'linear', name: 'Linear', domain: 'linear.app', defaultPrice: 8.00, defaultCurrency: 'USD', defaultBillingCycle: 'monthly', suggestedCategory: 'Software', type: 'subscription' },
```

## Tips

- **Keep alphabetical within categories** (not required but helpful)
- **Add popular services first** - these will be searched most often
- **Use accurate pricing** - users rely on this for budgeting
- **Test the autocomplete** - make sure search terms work intuitively
- **Check for duplicates** - search the file before adding
- **Group related services** - put all VPNs together, all streaming together, etc.

## Common Mistakes to Avoid

❌ Including `https://` in domain
✅ Just use `netflix.com`

❌ Using team/family pricing
✅ Use individual/standard tier pricing

❌ Forgetting to add aliases for common variations
✅ Add aliases: `['HBO Max', 'HBO']` for Max

❌ Creating a new category without updating CategorySettings
✅ Use existing categories or coordinate with category management

❌ Using annual price for `defaultPrice`
✅ Convert to monthly equivalent (divide by 12)

## File Location

**Services definition:** `src/data/knownServices.ts`

**Related files:**
- `src/components/ui/ServiceAutocomplete.tsx` - Autocomplete component
- `src/components/ItemForm.tsx` - Form that uses autocomplete
- `src/components/ui/ServiceLogo.tsx` - Logo rendering
- `src/components/CategorySettings.tsx` - Category management

## Need Help?

If you're unsure about:
- **Pricing:** Check the service's official website pricing page
- **Category:** Look at similar existing services
- **Domain:** Visit the service's main website and use that domain
- **Logo not showing:** Try the domain at `https://logo.clearbit.com/{domain}`

The autocomplete is forgiving - users can still manually enter services not in the list, this just makes it easier!
