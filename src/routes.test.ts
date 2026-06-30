import test from 'node:test';
import assert from 'node:assert/strict';
import {
    buildJobs,
    buildSearchUrl,
    extractListings,
    normalizeInput,
    normalizeListing,
    passesFilters,
} from './routes.js';

const sampleListing = {
    product_id: '6823179',
    product_name: 'Solar LED Street Light',
    product_description: 'Solar LED Street Light listing from TradeIndia',
    co_name: 'ZARAL ELECTRICALS',
    profile_id: 'supplier-123',
    business_type: 'Manufacturer | Supplier',
    city: 'Vadodara',
    state: 'Gujarat',
    country_name: 'India',
    price: '2,800 INR (Approx.)',
    moq: '10 Piece',
    unit_of_measure: 'Piece',
    in_stock: true,
    made_in_india: 'true',
    has_trust_stamp: true,
    premium_seller: true,
    member_since: '7',
    product_image: 'https://cpimg.tistatic.com/example/solar-led-street-light.jpg',
    catalog_mobile_url: 'https://www.zaralelectricals.in/',
    profile_url: '/Seller-123-Zaral-Electricals/',
    prod_url: '/products/solar-led-street-light-c6823179.html',
    custom_field_data_meta_info: {
        Product_Specifications: [
            { label_name: 'Material', value: 'Aluminium' },
            { label_name: 'Power', value: '40W' },
        ],
        Trade_Information: [
            { label_name: 'Supply Ability', value: '100 pieces per month' },
        ],
    },
};

function htmlWithNextData(listings: unknown[]): string {
    const nextData = {
        props: {
            pageProps: {
                serverData: {
                    searchListingData: {
                        listing_data: listings,
                    },
                },
            },
        },
    };

    return `<html><body><script id="__NEXT_DATA__" type="application/json">${JSON.stringify(nextData)}</script></body></html>`;
}

test('normalizes defaults and clamps maxResults', () => {
    const defaults = normalizeInput({ keywords: ['', '   '], maxResults: Number.NaN });
    assert.deepEqual(defaults.keywords, ['led light']);
    assert.equal(defaults.maxResults, 1);
    assert.deepEqual(defaults.proxyConfiguration, { useApifyProxy: false });

    const capped = normalizeInput({ keywords: ['led light'], maxResults: 9999 });
    assert.equal(capped.maxResults, 500);
});

test('builds paginated TradeIndia search jobs', () => {
    const input = normalizeInput({ keywords: ['solar pump'], maxResults: 1 });
    const jobs = buildJobs(input);

    assert.equal(jobs[0].keyword, 'solar pump');
    assert.equal(jobs[0].url, 'https://www.tradeindia.com/search.html?keyword=solar+pump');
    assert.ok(jobs.some((job) => job.page === 2 && job.url.endsWith('&page=2')));
    assert.equal(buildSearchUrl('led light', 1), 'https://www.tradeindia.com/search.html?keyword=led+light');
});

test('extracts and normalizes TradeIndia listing records', () => {
    const listings = extractListings(htmlWithNextData([sampleListing]));
    const record = normalizeListing(listings[0], 'led light');

    assert.ok(record);
    assert.equal(record.source, 'tradeindia');
    assert.equal(record.searchQuery, 'led light');
    assert.equal(record.productId, '6823179');
    assert.equal(record.productName, 'Solar LED Street Light');
    assert.equal(record.supplierName, 'Zaral Electricals');
    assert.equal(record.price, 2800);
    assert.equal(record.currency, 'INR');
    assert.equal(record.minimumOrderQuantity, '10 Piece');
    assert.equal(record.madeInIndia, true);
    assert.equal(record.trustedSeller, true);
    assert.equal(record.supplierUrl, 'https://www.tradeindia.com/Seller-123-Zaral-Electricals/');
    assert.equal(record.productUrl, 'https://www.tradeindia.com/products/solar-led-street-light-c6823179.html');
    assert.match(record.specificationsSummary ?? '', /Material: Aluminium/);
});

test('applies city, state, trust, country-of-origin, and business filters', () => {
    const record = normalizeListing(sampleListing, 'led light');
    assert.ok(record);

    const input = normalizeInput({
        keywords: ['led light'],
        city: 'Vadodara',
        state: 'Gujarat',
        businessTypes: ['manufacturer'],
        trustedOnly: true,
        madeInIndiaOnly: true,
        maxResults: 1,
    });

    assert.equal(passesFilters(record, input), true);
    assert.equal(passesFilters({ ...record, city: 'Mumbai' }, input), false);
    assert.equal(passesFilters({ ...record, trustedSeller: false }, input), false);
    assert.equal(passesFilters({ ...record, madeInIndia: false }, input), false);
});
