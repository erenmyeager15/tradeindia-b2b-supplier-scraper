export interface ActorInput {
    keywords?: string[];
    city?: string;
    state?: string;
    businessTypes?: string[];
    trustedOnly?: boolean;
    madeInIndiaOnly?: boolean;
    maxResults?: number;
    proxyConfiguration?: Record<string, unknown>;
}

export interface NormalizedInput {
    keywords: string[];
    city: string | null;
    state: string | null;
    businessTypes: string[];
    trustedOnly: boolean;
    madeInIndiaOnly: boolean;
    maxResults: number;
    proxyConfiguration?: Record<string, unknown>;
}

export interface ScrapeJob {
    keyword: string;
    page: number;
    url: string;
}

export interface SupplierRecord {
    source: 'tradeindia';
    searchQuery: string;
    productId: string;
    productName: string | null;
    productDescription: string | null;
    supplierId: string | null;
    supplierName: string | null;
    businessType: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    price: number | null;
    priceDisplay: string | null;
    currency: string | null;
    minimumOrderQuantity: string | null;
    unitOfMeasure: string | null;
    unitOfPrice: string | null;
    inStock: boolean | null;
    madeInIndia: boolean | null;
    trustedSeller: boolean | null;
    premiumSeller: boolean | null;
    memberSinceYears: number | null;
    specificationsSummary: string | null;
    tradeInfoSummary: string | null;
    imageUrl: string | null;
    supplierWebsite: string | null;
    supplierUrl: string | null;
    productUrl: string | null;
    scrapedAt: string;
}
