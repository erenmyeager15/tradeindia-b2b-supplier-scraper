# TradeIndia Supplier Scraper - B2B Products, Prices & MOQ

Scrape public TradeIndia supplier and product listings by keyword, with company names, business type, location, price, MOQ, trust flags, website, and product URLs. Export clean data to JSON, CSV, Excel, or HTML, or pull it via the Apify API. No login and no API key required.

Built with Node.js 20, TypeScript, and the Apify SDK using native `fetch`. The Actor reads TradeIndia's embedded search data (`__NEXT_DATA__`) instead of fragile DOM scraping, with retries and resilient extraction so runs are reliable and repeatable.

For a low-cost first run, use the default sample input: `led light`, 1 supplier/product record, and no proxy unless needed.

## What it extracts

- Product name, description, image, product URL, and TradeIndia product ID
- Supplier name, supplier profile URL, supplier website, and supplier ID
- Business type such as Manufacturer, Supplier, Exporter, Distributor, or Trader
- City, state, and country
- Price, currency, MOQ, unit of measure, and unit of price
- Stock status and supplier membership age where available
- Trusted seller, premium seller, and Made in India flags
- Product specification and trade information summaries
- Search query used and scrape timestamp

The Actor does not extract hidden phone numbers, emails, or private contact details.

## Use cases

1. B2B supplier discovery for exporters, wholesalers, and procurement teams
2. Vendor shortlisting for product sourcing
3. Supplier monitoring across product categories
4. India manufacturing and trade market research
5. Company-level supplier research and CRM enrichment workflows

## Pricing and usage

This Actor uses Apify Pay Per Event pricing. The live Store configuration charges a small start event and then charges supplier/product rows only when clean records are saved to the dataset. Failed, blocked, or empty runs are not billed as supplier records.

| Event name | Price | When charged |
| --- | ---: | --- |
| `apify-actor-start` | $0.00005 per GB | When the run starts, minimum one event |
| `supplier-scraped` | $0.003 | For each clean supplier/product record saved |

Supplier/product rows are charged only when clean records are saved. Depending on the active Store pricing configuration, platform usage such as compute and proxy traffic may also be billed by Apify.

Cost-control tips:

- Start with one keyword and `maxResults: 1`.
- Leave proxy disabled unless TradeIndia rate limits or blocks the run.
- Add location, trust, or business-type filters only after the first run confirms the output fits your use case.
- Use the run's maximum cost setting if you want a strict spending cap.

## Input

| Field | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `keywords` | array | yes | `["led light"]` | Product or service keywords to search on TradeIndia. |
| `city` | string | no | empty | Optional exact city filter applied to parsed records. |
| `state` | string | no | empty | Optional exact state filter applied to parsed records. |
| `businessTypes` | array | no | `[]` | Optional filters such as Manufacturer, Supplier, Exporter, Distributor, Trader, or Service Provider. |
| `trustedOnly` | boolean | no | `false` | Keep only records marked trusted by TradeIndia. |
| `madeInIndiaOnly` | boolean | no | `false` | Keep only records marked Made in India. |
| `maxResults` | integer | yes | `1` | Maximum unique supplier/product records to save. |
| `proxyConfiguration` | object | no | disabled | Apify proxy settings. Enable only if TradeIndia rate limits a run. |

## Example input

```json
{
  "keywords": ["led light"],
  "maxResults": 1,
  "proxyConfiguration": {
    "useApifyProxy": false
  }
}
```

## Filtered by location and trust

```json
{
  "keywords": ["industrial conveyor"],
  "state": "Karnataka",
  "trustedOnly": true,
  "madeInIndiaOnly": true,
  "maxResults": 25
}
```

## How to scrape TradeIndia suppliers

1. Click **Try for free** or **Run**.
2. Enter one or more product keywords.
3. Optionally add exact city, state, business type, trusted seller, or Made in India filters.
4. Keep `maxResults` at 1 for the first run.
5. Run the Actor and export the dataset as CSV, JSON, Excel, or through the Apify API.

## Sample output

```json
{
  "source": "tradeindia",
  "searchQuery": "led light",
  "productId": "6823179",
  "productName": "Solar LED Street Light",
  "productDescription": "Solar LED Street Light listing from TradeIndia",
  "supplierId": "example-supplier-id",
  "supplierName": "Zaral Electricals",
  "businessType": "Manufacturer | Supplier",
  "city": "Vadodara",
  "state": "Gujarat",
  "country": "India",
  "price": 2800,
  "priceDisplay": "2,800 INR (Approx.)",
  "currency": "INR",
  "minimumOrderQuantity": "10",
  "unitOfMeasure": null,
  "unitOfPrice": null,
  "inStock": null,
  "madeInIndia": null,
  "trustedSeller": null,
  "premiumSeller": null,
  "memberSinceYears": null,
  "specificationsSummary": null,
  "tradeInfoSummary": null,
  "imageUrl": "https://cpimg.tistatic.com/example/solar-led-street-light.jpg",
  "supplierWebsite": "http://www.zaralelectricals.in/",
  "supplierUrl": "https://www.tradeindia.com/example-supplier/",
  "productUrl": "https://www.tradeindia.com/products/solar-led-street-light-c6823179.html",
  "scrapedAt": "2026-06-20T12:06:43.000Z"
}
```

## API example

```js
import { ApifyClient } from 'apify-client';

const client = new ApifyClient({ token: 'YOUR_API_TOKEN' });
const run = await client.actor('tradeindia-b2b-supplier-scraper').call({
  keywords: ['led light'],
  maxResults: 1,
});
const { items } = await client.dataset(run.defaultDatasetId).listItems();
console.log(`Got ${items.length} suppliers`);
```

## How it works

1. Validates input and builds TradeIndia search URLs for each keyword.
2. Fetches search result pages with retries and reads embedded listing data.
3. Extracts and cleans supplier and product fields, including specs and trade information.
4. Applies optional city, state, business type, trusted, and Made in India filters, then deduplicates.
5. Saves each clean record and charges `supplier-scraped` atomically, then stops further requests when the user's charge limit is reached.

## Known limits

- Some fields are conditional: `supplierWebsite`, `madeInIndia`, MOQ, and unit fields are only saved when the supplier publishes them.
- City/state filters use exact matching against the parsed location text.
- TradeIndia page structure may change over time. If a run returns no results, try broader keywords, reduce filters, or enable Apify Proxy.

## Responsible use

This Actor is intended for lawful collection of publicly available information only. Users are responsible for ensuring their use complies with the source website's terms, robots.txt, applicable privacy laws, including India's DPDP Act, and all local regulations.

Do not use this Actor to collect, store, sell, or misuse personal data without a lawful basis. The Actor author is not responsible for misuse by end users.

## License

Apache-2.0. See `LICENSE`.
