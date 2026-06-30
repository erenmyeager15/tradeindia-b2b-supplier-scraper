import { Actor, log } from 'apify';
import { fetch, ProxyAgent, type Dispatcher } from 'undici';
import type { ActorInput, NormalizedInput, ScrapeJob, SupplierRecord } from './types.js';

const CHARGE_EVENT_NAME = 'supplier-scraped';
const DEFAULT_MAX_RESULTS = 1;
const MAX_RESULTS_CAP = 500;
const RESULTS_PER_PAGE_ESTIMATE = 28;
const BASE_URL = 'https://www.tradeindia.com';
const REQUEST_HEADERS = {
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'accept-language': 'en-IN,en;q=0.9',
    'cache-control': 'no-cache',
    pragma: 'no-cache',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
};

type ProxyConfiguration = Awaited<ReturnType<typeof Actor.createProxyConfiguration>>;
type AnyObject = Record<string, unknown>;

export async function scrapeTradeIndia(rawInput: ActorInput): Promise<void> {
    const input = normalizeInput(rawInput);
    const proxyConfiguration = await Actor.createProxyConfiguration(input.proxyConfiguration);
    const jobs = buildJobs(input);
    const seen = new Set<string>();
    const exhaustedKeywords = new Set<string>();
    let pushed = 0;
    let chargeLimitReached = false;

    log.info('Starting TradeIndia scrape', {
        keywords: input.keywords,
        city: input.city,
        state: input.state,
        businessTypes: input.businessTypes,
        maxResults: input.maxResults,
    });

    for (const job of jobs) {
        if (pushed >= input.maxResults || chargeLimitReached) break;
        if (exhaustedKeywords.has(job.keyword)) continue;

        log.info('Fetching TradeIndia search results', { keyword: job.keyword, page: job.page, url: job.url });

        let listings: AnyObject[];
        try {
            const html = await fetchHtml(job.url, proxyConfiguration);
            listings = extractListings(html);
        } catch (error) {
            log.warning(`Skipping page after retries: ${(error as Error).message}`, {
                keyword: job.keyword,
                page: job.page,
                url: job.url,
            });
            await delay(randomInt(900, 2200));
            continue;
        }

        if (listings.length === 0) {
            exhaustedKeywords.add(job.keyword);
            log.info('No listings parsed; stopping pagination for this keyword', {
                keyword: job.keyword,
                page: job.page,
            });
            continue;
        }

        let pushedFromPage = 0;
        for (const listing of listings) {
            if (pushed >= input.maxResults) break;

            const record = normalizeListing(listing, job.keyword);
            if (!record) continue;
            if (!passesFilters(record, input)) continue;

            const dedupeKey = `${record.productId}|${record.supplierId ?? record.supplierName ?? ''}`;
            if (seen.has(dedupeKey)) continue;

            // Push and charge atomically so records beyond the user's charge limit
            // are not saved for free and billing failures stop the run immediately.
            const chargingResult = await Actor.pushData(record, CHARGE_EVENT_NAME);
            const recordWasSaved = chargingResult.chargedCount > 0 || !chargingResult.eventChargeLimitReached;
            if (recordWasSaved) {
                seen.add(dedupeKey);
                pushed += 1;
                pushedFromPage += 1;
            }

            if (chargingResult.eventChargeLimitReached) {
                chargeLimitReached = true;
                await Actor.setStatusMessage(`Stopped at the user's spending limit after ${pushed} suppliers`);
                log.warning('Maximum charge limit reached; stopping before any further requests or results.', {
                    totalPushed: pushed,
                });
                break;
            }
        }

        log.info('Parsed page complete', {
            keyword: job.keyword,
            page: job.page,
            parsed: listings.length,
            pushedFromPage,
            totalPushed: pushed,
        });

        if (!chargeLimitReached && pushed < input.maxResults) {
            await delay(randomInt(900, 2200));
        }
    }

    if (pushed === 0) {
        throw new Error('No TradeIndia supplier records were scraped. Try broader keywords or remove filters.');
    }

    log.info('TradeIndia scrape finished', { pushed });
}

export function normalizeInput(input: ActorInput): NormalizedInput {
    const rawKeywords = Array.isArray(input.keywords) ? input.keywords : [];
    const rawBusinessTypes = Array.isArray(input.businessTypes) ? input.businessTypes : [];
    const requestedMaxResults = Number(input.maxResults ?? DEFAULT_MAX_RESULTS);
    const safeMaxResults = Number.isFinite(requestedMaxResults) ? requestedMaxResults : DEFAULT_MAX_RESULTS;
    const keywords = (rawKeywords.length ? rawKeywords : ['led light'])
        .map((keyword) => cleanText(keyword))
        .filter(Boolean)
        .slice(0, 25);

    return {
        keywords: keywords.length ? keywords : ['led light'],
        city: cleanText(input.city) || null,
        state: cleanText(input.state) || null,
        businessTypes: rawBusinessTypes.map((type) => cleanText(type).toLowerCase()).filter(Boolean),
        trustedOnly: Boolean(input.trustedOnly),
        madeInIndiaOnly: Boolean(input.madeInIndiaOnly),
        maxResults: Math.min(Math.max(Math.floor(safeMaxResults), 1), MAX_RESULTS_CAP),
        proxyConfiguration: input.proxyConfiguration ?? { useApifyProxy: false },
    };
}

export function buildJobs(input: NormalizedInput): ScrapeJob[] {
    const maxPages = Math.min(Math.ceil(input.maxResults / Math.max(input.keywords.length * RESULTS_PER_PAGE_ESTIMATE, 1)) + 8, 25);
    const jobs: ScrapeJob[] = [];

    for (let page = 1; page <= maxPages; page += 1) {
        for (const keyword of input.keywords) {
            jobs.push({
                keyword,
                page,
                url: buildSearchUrl(keyword, page),
            });
        }
    }

    return jobs;
}

export function buildSearchUrl(keyword: string, page: number): string {
    const url = new URL('/search.html', BASE_URL);
    url.searchParams.set('keyword', keyword);
    if (page > 1) url.searchParams.set('page', String(page));
    return url.toString();
}

async function fetchHtml(url: string, proxyConfiguration: ProxyConfiguration): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
            const proxyUrl = proxyConfiguration ? await proxyConfiguration.newUrl() : undefined;
            const dispatcher: Dispatcher | undefined = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;
            const response = await fetch(url, { headers: REQUEST_HEADERS, dispatcher });

            if ([403, 407, 429, 500, 502, 503, 504].includes(response.status)) {
                throw new Error(`HTTP ${response.status}`);
            }

            const html = await response.text();
            if (looksBlocked(html)) throw new Error('Page appears blocked or challenged');
            return html;
        } catch (error) {
            lastError = error as Error;
            if (attempt < 3) await delay(1000 * attempt + randomInt(250, 900));
        }
    }

    throw lastError ?? new Error('Request failed');
}

function looksBlocked(html: string): boolean {
    const lower = html.toLowerCase();
    const hasData = lower.includes('__next_data__') || lower.includes('searchlistingdata') || lower.includes('listing_data');
    if (hasData) return false;

    return lower.includes('captcha')
        || lower.includes('access denied')
        || lower.includes('unusual traffic')
        || lower.includes('enable cookies')
        || lower.includes('cloudflare');
}

export function extractListings(html: string): AnyObject[] {
    const nextData = extractNextData(html);
    const serverData = asObject(asObject(asObject(nextData.props).pageProps).serverData);
    const searchListingData = asObject(serverData.searchListingData);
    const listings = asArray(searchListingData.listing_data).filter(isObject);

    if (listings.length > 0) return listings;

    return [
        ...asArray(serverData.listingBanner).map((item) => asObject(asObject(item).product_details)),
        ...asArray(serverData.ProductShowcaseData),
    ].filter(isObject);
}

function extractNextData(html: string): AnyObject {
    const match = html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
    if (!match) throw new Error('Missing TradeIndia page data');

    try {
        return JSON.parse(decodeHtml(match[1].trim())) as AnyObject;
    } catch (error) {
        throw new Error(`Failed to parse TradeIndia page data: ${(error as Error).message}`);
    }
}

export function normalizeListing(item: AnyObject, searchQuery: string): SupplierRecord | null {
    const productId = cleanText(item.product_id ?? item.id);
    const supplierName = titleCaseIfNeeded(cleanText(item.co_name ?? item.initial_co_name));
    const productName = cleanText(item.product_name ?? item.product_description);

    if (!productId || (!supplierName && !productName)) return null;

    const meta = asObject(item.custom_field_data_meta_info);
    const priceDisplay = cleanText(item.price)
        || findMetaValue(meta, 'Price_And_Quantity', ['Price'])
        || findMetaValue(meta, 'TI_SHOPPING', ['Price'])
        || null;
    const moq = cleanText(item.moq)
        || findMetaValue(meta, 'Price_And_Quantity', ['Minimum Order Quantity'])
        || findMetaValue(meta, 'TI_SHOPPING', ['Moq', 'Minimum Order Quantity'])
        || null;

    return {
        source: 'tradeindia',
        searchQuery,
        productId,
        productName: productName || null,
        productDescription: cleanText(item.long_tail_prod_name ?? item.product_description) || null,
        supplierId: cleanText(item.profile_id) || null,
        supplierName: supplierName || null,
        businessType: cleanText(item.business_type) || deriveBusinessType(item),
        city: cleanText(item.city) || null,
        state: cleanText(item.state) || null,
        country: cleanText(item.country_name) || null,
        price: parsePrice(priceDisplay),
        priceDisplay,
        currency: extractCurrency(priceDisplay),
        minimumOrderQuantity: moq,
        unitOfMeasure: findMetaValue(meta, 'Price_And_Quantity', ['Unit of Measure']) || cleanText(item.unit_of_measure) || null,
        unitOfPrice: findMetaValue(meta, 'Price_And_Quantity', ['Unit of Price']) || null,
        inStock: booleanOrNull(item.in_stock),
        madeInIndia: booleanOrNull(item.made_in_india),
        trustedSeller: booleanOrNull(item.has_trust_stamp),
        premiumSeller: Boolean(item.premium_seller || item.super_seller || item.super_premium_seller || item.ifpaid),
        memberSinceYears: finiteNumber(item.member_since),
        specificationsSummary: summarizeMeta(meta, 'Product_Specifications', 6),
        tradeInfoSummary: summarizeMeta(meta, 'Trade_Information', 5),
        imageUrl: cleanText(item.product_image ?? item.image_path) || null,
        supplierWebsite: extractWebsite(item),
        supplierUrl: absoluteUrl(cleanText(item.profile_url), BASE_URL),
        productUrl: absoluteUrl(cleanText(item.prod_url), BASE_URL),
        scrapedAt: new Date().toISOString(),
    };
}

export function passesFilters(record: SupplierRecord, input: NormalizedInput): boolean {
    if (input.city && !sameText(record.city, input.city)) return false;
    if (input.state && !sameText(record.state, input.state)) return false;
    if (input.trustedOnly && record.trustedSeller !== true) return false;
    if (input.madeInIndiaOnly && record.madeInIndia !== true) return false;

    if (input.businessTypes.length > 0) {
        const businessText = cleanText(record.businessType).toLowerCase();
        if (!input.businessTypes.some((type) => businessText.includes(type))) return false;
    }

    return true;
}

function findMetaValue(meta: AnyObject, groupName: string, labels: string[]): string | null {
    const fields = asArray(meta[groupName]).filter(isObject);
    for (const field of fields) {
        const label = cleanText(field.label_name).toLowerCase();
        if (labels.some((expected) => label === expected.toLowerCase())) {
            return cleanText(field.value) || null;
        }
    }

    return null;
}

function summarizeMeta(meta: AnyObject, groupName: string, maxItems: number): string | null {
    const parts = asArray(meta[groupName])
        .filter(isObject)
        .map((field) => {
            const label = cleanText(field.label_name);
            const value = cleanText(field.value);
            return label && value ? `${label}: ${value}` : '';
        })
        .filter(Boolean)
        .slice(0, maxItems);

    return parts.length ? parts.join('; ') : null;
}

function deriveBusinessType(item: AnyObject): string | null {
    const types = [
        item.ifmanu ? 'Manufacturer' : '',
        item.ifsupplier ? 'Supplier' : '',
        item.ifexporter ? 'Exporter' : '',
        item.ifdistributor ? 'Distributor' : '',
        item.iftrader ? 'Trader' : '',
        item.ifservice ? 'Service Provider' : '',
    ].filter(Boolean);

    return types.length ? types.join(' | ') : null;
}

function extractWebsite(item: AnyObject): string | null {
    const directWebsite = cleanText(item.catalog_mobile_url);
    if (directWebsite) return directWebsite;

    const websites = asArray(item.extra_catalog_urls_json).filter(isObject);
    for (const website of websites) {
        const catalogUrl = cleanText(website.catalog_url);
        if (catalogUrl) return catalogUrl;
    }

    return null;
}

function parsePrice(value: string | null): number | null {
    if (!value) return null;
    const match = value.match(/\d[\d,.]*/);
    if (!match) return null;

    const amount = Number(match[0].replace(/,/g, ''));
    return Number.isFinite(amount) ? amount : null;
}

function extractCurrency(value: string | null): string | null {
    if (!value) return null;
    if (/\bINR\b|\bRs\.?\b|\u20b9/i.test(value)) return 'INR';
    if (/\bUSD\b|\$/i.test(value)) return 'USD';
    return null;
}

function titleCaseIfNeeded(value: string): string {
    if (!value) return '';
    if (value !== value.toUpperCase()) return value;
    return value.toLowerCase().replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function sameText(left: string | null, right: string): boolean {
    return cleanText(left).toLowerCase() === cleanText(right).toLowerCase();
}

function absoluteUrl(url: string | null, base: string): string | null {
    if (!url) return null;
    try {
        return new URL(url, base).toString();
    } catch {
        return null;
    }
}

function cleanText(value: unknown): string {
    return String(value ?? '')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
}

function decodeHtml(value: string): string {
    return value
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
}

function asObject(value: unknown): AnyObject {
    return isObject(value) ? value : {};
}

function asArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
}

function isObject(value: unknown): value is AnyObject {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const number = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''));
    return Number.isFinite(number) ? number : null;
}

function booleanOrNull(value: unknown): boolean | null {
    if (typeof value === 'boolean') return value;
    if (value === null || value === undefined || value === '') return null;
    if (String(value).toLowerCase() === 'true') return true;
    if (String(value).toLowerCase() === 'false') return false;
    return null;
}

function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
