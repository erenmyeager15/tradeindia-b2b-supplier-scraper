# TradeIndia B2B Supplier Scraper - Suppliers, Products, Prices & MOQ

Scrape public TradeIndia supplier and product listings by keyword, with company names, business type, location, price, MOQ, trust flags, website, and product URLs. Export clean data to JSON, CSV, Excel, or HTML, or pull it via the Apify API — no login and no API key required.

Built with Node.js 20, TypeScript, and the Apify SDK using native `fetch`. The actor reads TradeIndia's own embedded search data (`__NEXT_DATA__`) instead of fragile DOM scraping, with retries and resilient extraction so runs are reliable and repeatable.

## What It Extracts

- Product name, description, image, product URL, and TradeIndia product ID
- Supplier name, supplier profile URL, supplier website, and supplier ID
- Business type such as Manufacturer, Supplier, Exporter, Distributor, or Trader
- City, state, and country
- Price, currency, MOQ, unit of measure, and unit of price
- Stock status and supplier membership age (years)
- Trusted seller, premium seller, and Made in India flags
- Product specification and trade information summaries
- Search query used and scrape timestamp

The actor does not extract hidden phone numbers, emails, or private contact details.

## Use Cases

1. B2B lead generation for exporters, wholesalers, and procurement teams
2. Vendor discovery and supplier shortlisting for product sourcing
3. Competitor and supplier monitoring across product categories
4. India manufacturing and trade market research
5. Sales prospecting and CRM enrichment workflows

## Pricing

This actor uses Apify Pay Per Event pricing. You pay only for clean records delivered to the dataset — failed, blocked, or empty results are not billed.

| Event name | Price per event | 1,000 results | 10,000 results |
| --- | ---: | ---: | ---: |
| `supplier-scraped` | $0.003 | $3.00 | $30.00 |

## Input

| Field | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `keywords` | array | yes | `["packaging machine"]` | Product or service keywords to search on TradeIndia. |
| `city` | string | no | — | Optional exact city filter applied to parsed records. |
| `state` | string | no | — | Optional exact state filter applied to parsed records. |
| `businessTypes` | array | no | `[]` | Optional filters such as Manufacturer, Supplier, Exporter, Distributor, Trader, or Service Provider. |
| `trustedOnly` | boolean | no | `false` | Keep only records marked trusted by TradeIndia. |
| `madeInIndiaOnly` | boolean | no | `false` | Keep only records marked Made in India. |
| `maxResults` | integer | yes | `50` | Maximum unique supplier/product records to save (1–500). |
| `proxyConfiguration` | object | no | Disabled | Apify proxy settings. Enable only if TradeIndia rate limits a run. |

## Example Input

```json
{
  "keywords": ["packaging machine"],
  "maxResults": 10,
  "proxyConfiguration": {
    "useApifyProxy": false
  }
}
```

### Filtered by location and trust

```json
{
  "keywords": ["industrial conveyor"],
  "state": "Karnataka",
  "trustedOnly": true,
  "madeInIndiaOnly": true,
  "maxResults": 25
}
```

## How to Scrape TradeIndia Suppliers (Step by Step)

1. Click **Try for free** / **Run**.
2. Enter one or more product keywords.
3. Optionally add exact city, state, business type, trusted seller, or Made in India filters.
4. Set `maxResults` (start small to test).
5. Run the actor and export the dataset as CSV, JSON, Excel, or through the Apify API.

## Sample Output

```json
{
  "source": "tradeindia",
  "searchQuery": "packaging machine",
  "productId": "3695173",
  "productName": "Automatic Pouch Packaging Machine",
  "productDescription": "Automatic Pouch Packing Machine - Stainless Steel, 220 Volt, 150-500 KG | Automatic Grade, Packing Speed 1800-2100 Pouches/Hour",
  "supplierId": "3612085",
  "supplierName": "Rising Industries",
  "businessType": "Manufacturer | Supplier",
  "city": "Kolkata",
  "state": "West Bengal",
  "country": "India",
  "price": 136000,
  "priceDisplay": "136000 INR (Approx.)",
  "currency": "INR",
  "minimumOrderQuantity": "1",
  "unitOfMeasure": "Piece/Pieces",
  "inStock": true,
  "madeInIndia": false,
  "trustedSeller": true,
  "premiumSeller": true,
  "memberSinceYears": 15,
  "specificationsSummary": "Material: SS; Capacity: 15-35 m3/hr; Automatic Grade: Automatic; Power: 1/2 H.P -3 H.P Horsepower (HP); Voltage: 220 Volt (v)",
  "tradeInfoSummary": "Delivery Time: 3 Week",
  "imageUrl": "https://cpimg.tistatic.com/03695173/b/4/Automatic-Pouch-Packaging-Machine.jpg",
  "supplierWebsite": "http://www.risingfoodprocessingmachinery.com/",
  "supplierUrl": "https://www.tradeindia.com/rising-industries-3612085/",
  "productUrl": "https://www.tradeindia.com/products/automatic-pouch-packaging-machine-c3695173.html",
  "scrapedAt": "2026-06-12T19:55:58.503Z"
}
```

## API Example

```js
import { ApifyClient } from 'apify-client';

const client = new ApifyClient({ token: 'YOUR_API_TOKEN' });
const run = await client.actor('tradeindia-b2b-supplier-scraper').call({
  keywords: ['packaging machine'],
  maxResults: 10,
});
const { items } = await client.dataset(run.defaultDatasetId).listItems();
console.log(`Got ${items.length} suppliers`);
```

## How It Works

1. Validates input and builds TradeIndia search URLs for each keyword.
2. Fetches search result pages with retries and reads the embedded `__NEXT_DATA__` listing data.
3. Extracts and cleans supplier and product fields, including specs and trade information.
4. Applies optional city, state, business type, trusted, and Made in India filters, then deduplicates.
5. Charges `supplier-scraped` only after a clean record is saved, then writes to the Apify Dataset.

## Known Limits

- Some fields are conditional: `supplierWebsite`, `madeInIndia`, MOQ, and unit fields are only saved when the supplier publishes them.
- City/state filters use exact matching against the parsed location text.
- TradeIndia page structure may change over time. If a run returns no results, try broader keywords, reduce filters, or enable Apify Proxy.

## Responsible Use

This Actor is intended for lawful collection of publicly available information only. Users are responsible for ensuring their use complies with the source website's terms, robots.txt, applicable privacy laws, including India's DPDP Act, and all local regulations.

Do not use this Actor to collect, store, sell, or misuse personal data without a lawful basis. The Actor author is not responsible for misuse by end users.

## License

Apache-2.0. See `LICENSE`.
