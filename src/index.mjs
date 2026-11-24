import { readFileSync } from 'node:fs';
export { METRICS, metricsFor, validateKit, listCost, modelKey, usd } from './metrics.mjs';
export { traction, tractionTable, reposOf, PAGES_NOTE } from './traction.mjs';
/** The kit list (kit.json), the single source of truth. */
export const kit = JSON.parse(readFileSync(new URL('../kit.json', import.meta.url), 'utf8'));
