import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateKit, metricsFor, METRICS } from '../src/metrics.mjs';

const kit = JSON.parse(readFileSync(new URL('../kit.json', import.meta.url), 'utf8'));
const SNAP = JSON.parse(readFileSync(new URL('./fixtures/snapshot.json', import.meta.url), 'utf8'));

test('kit.json is valid: every tool in a job, one-line npx commands, known metrics', () => {
  assert.deepEqual(validateKit(kit), []);
  assert.equal(kit.tools.length, 8);
});

test('the validator catches bad entries', () => {
  const bad = structuredClone(kit);
  bad.tools.push({ ...bad.tools[0] });
  bad.tools[1].run = 'npm i -g agent-price-feed';
  bad.tools[2].run = 'npx -y github:a/b; rm -rf ~';
  bad.tools[3].metric = 'nope';
  bad.jobs[0].tools.push('ghost');
  bad.jobs = bad.jobs.filter((j) => j.id !== 'flop');
  const errs = validateKit(bad).join('\n');
  for (const re of [/duplicate id/, /one-line npx/, /one plain command/, /metric must be one of/, /unknown tool ghost/, /flop-spend: not in any job/]) assert.match(errs, re);
});

test('live numbers from a fixed justweight snapshot', () => {
  const m = metricsFor(kit, SNAP);
  assert.equal(m.justweight.text, '38 prices (35 USD, 3 FLOP) from 26 providers');
  assert.equal(m['agent-spendcap'].text, '$1 covers 3,287 deepseek-v4.1-flash calls (2k in / 1k out) at the cheapest listing');
  assert.equal(m['x402-price-check'].text, 'a fair x402 quote for a 2k in / 1k out deepseek-v4.1-flash call stops at $0.00038025 (list $0.0003042 + 25%)');
  assert.equal(m['agent-cost-proxy'].text, 'qwen3.8-27b, 100k in / 1k out: cheapest $0.005, median $0.0225 across 25 listings');
  assert.equal(m['flop-receipt-root'].text, '3 Flop gateway prices (devnet: no value)');
  assert.equal(m['flop-spend'].value, null); // the fixture has no flop.watch block
});

test('missing data is said, never filled in', () => {
  const empty = { offers: [], flop: { watch: { stage: 'explorer-down', filled: 0 } } };
  assert.match(METRICS['calls-per-dollar'](empty).text, /not in today's snapshot/);
  assert.equal(METRICS['flop-prices'](empty).text, "no Flop prices in today's snapshot");
  assert.equal(METRICS['flop-watch'](empty).text, 'Flop testnet watch: explorer-down, 0 testnet prices so far');
});
