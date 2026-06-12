import { Actor, log } from 'apify';
import { scrapeTradeIndia } from './routes.js';
import type { ActorInput } from './types.js';

await Actor.init();

try {
    const input = (await Actor.getInput<ActorInput>()) ?? {};
    await scrapeTradeIndia(input);
} catch (error) {
    log.exception(error as Error, 'Actor failed');
    throw error;
} finally {
    await Actor.exit();
}
