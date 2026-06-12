# TradeIndia B2B Supplier Scraper

Scrape public TradeIndia supplier and product listings for B2B lead generation, sourcing research, vendor discovery, and market intelligence. The actor searches TradeIndia by product or service keyword and saves structured supplier/product records to an Apify Dataset.

## What It Scrapes

- Product name, description, image, product URL, and TradeIndia product ID
- Supplier name, supplier profile URL, supplier website, and supplier ID
- Business type such as manufacturer, supplier, exporter, distributor, or trader
- City, state, country, price, MOQ, unit, stock status, and membership age
- Trusted seller, premium seller, and Made in India flags
- Product specification and trade information summaries

The actor does not extract hidden phone numbers, emails, or private contact details.

## How To Scrape TradeIndia Suppliers

1. Enter one or more product keywords.
2. Optionally add exact city, state, business type, trusted seller, or Made in India filters.
3. Set `maxResults` up to 500.
4. Run the actor and export the dataset as JSON, CSV, Excel, or through the Apify API.

## Input Example

```json
{
  "keywords": ["packaging machine"],
  "maxResults": 10,
  "proxyConfiguration": {
    "useApifyProxy": false
  }
}
```

## Output Example

```json
{
  "source": "tradeindia",
  "searchQuery": "packaging machine",
  "productId": "3695173",
  "productName": "Automatic Pouch Packaging Machine",
  "supplierName": "Rising Industries",
  "businessType": "Manufacturer | Supplier",
  "city": "Kolkata",
  "state": "West Bengal",
  "price": 136000,
  "priceDisplay": "136000 INR (Approx.)",
  "minimumOrderQuantity": "1",
  "trustedSeller": true,
  "supplierWebsite": "http://www.risingfoodprocessingmachinery.com/",
  "productUrl": "https://www.tradeindia.com/products/automatic-pouch-packaging-machine-c3695173.html",
  "scrapedAt": "2026-06-12T12:00:00.000Z"
}
```

## Use Cases

- B2B lead generation for exporters, wholesalers, and procurement teams
- Vendor discovery for product sourcing
- Competitor and supplier monitoring
- India manufacturing market research
- Sales prospecting and enrichment workflows

## Pricing

This actor uses pay per event pricing.

| Event | When charged | Price |
| --- | --- | --- |
| `supplier-scraped` | Each clean TradeIndia supplier/product record saved to the dataset | `$0.003` |

## Notes

TradeIndia page structure may change over time. If a run returns no results, try broader keywords, reduce filters, or enable Apify Proxy.
