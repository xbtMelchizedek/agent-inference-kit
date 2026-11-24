// One live number per tool, all read from one justweight snapshot. Browser-safe: justweight's pure core only.
import { canonicalModel, costOf, medianFixed, fromFixed } from 'justweight/core';

const FIXED_PER_NANO = 10n ** 15n; // justweight fixed point 1e-24 USD -> nano-USD
const DEC = /^\d+(\.\d{1,9})?$/;

/** justweight's model key, plus Anthropic API ids ("claude-sonnet-5-5-20261001" -> "claude-sonnet-5.5"). */
export function modelKey(id) {
  let k = canonicalModel(id).key;
  if (k.startsWith('claude-')) k = k.replace(/-\d{8}$/, '').replace(/(\d)-(\d)/g, '$1.$2');
  return k;
}
const usable = (o) => o.unit === 'USD' && DEC.test(String(o.inPer1M)) && DEC.test(String(o.outPer1M)) && !canonicalModel(o.model).variant.some((v) => /(^|-)batch$/.test(v));
const up = (fixed) => (fixed + FIXED_PER_NANO - 1n) / FIXED_PER_NANO;

export function usd(nano) {
  const n = BigInt(nano);
  const f = (n % 1_000_000_000n).toString().padStart(9, '0').replace(/0+$/, '');
  return `$${n / 1_000_000_000n}${f ? `.${f}` : ''}`;
}
const k = (n) => (n >= 1000 && n % 1000 === 0 ? `${n / 1000}k` : String(n));

/** Cheapest and median USD list cost for a model at these token counts, batch tiers skipped. */
export function listCost(snapshot, model, inputTokens, outputTokens) {
  const key = modelKey(model);
  const rows = [];
  for (const o of snapshot?.offers ?? []) {
    if (!usable(o) || modelKey(o.model) !== key) continue;
    const c = costOf(o, { inputTokens, outputTokens });
    if (c !== null) rows.push({ o, c });
  }
  if (!rows.length) return null;
  rows.sort((a, b) => (a.c < b.c ? -1 : a.c > b.c ? 1 : a.o.provider.localeCompare(b.o.provider)));
  return { key, n: rows.length, cheapest: up(rows[0].c), provider: rows[0].o.provider, median: up(medianFixed(rows.map((r) => fromFixed(r.c, 24)))) };
}

const missing = (model) => ({ text: `${model} is not in today's snapshot`, value: null });

export const METRICS = {
  offers(s) {
    const usdN = s.offers.filter((o) => o.unit === 'USD').length;
    const flopN = s.offers.filter((o) => o.unit === 'FLOP').length;
    const providers = new Set(s.offers.map((o) => o.provider)).size;
    return { text: `${s.offers.length} prices (${usdN} USD, ${flopN} FLOP) from ${providers} providers`, value: s.offers.length };
  },
  models(s) {
    const n = new Set(s.offers.filter(usable).map((o) => modelKey(o.model))).size;
    return { text: `${n} models with a USD price to watch`, value: n };
  },
  'cheapest-route'(s) {
    const m = 'qwen/qwen3.8-27b'; const c = listCost(s, m, 2000, 500);
    if (!c) return missing(m);
    return { text: `cheapest ${c.key} call (2k in / 500 out): ${usd(c.cheapest)} at ${c.provider}, of ${c.n} listings`, value: usd(c.cheapest).slice(1) };
  },
  'calls-per-dollar'(s) {
    const m = 'deepseek/deepseek-v4.1-flash'; const c = listCost(s, m, 2000, 1000);
    if (!c || c.cheapest === 0n) return missing(m);
    const n = 1_000_000_000n / c.cheapest;
    return { text: `$1 covers ${n.toLocaleString('en-US')} ${c.key} calls (2k in / 1k out) at the cheapest listing`, value: Number(n) };
  },
  spread(s) {
    const m = 'qwen/qwen3.8-27b'; const c = listCost(s, m, 100000, 1000);
    if (!c) return missing(m);
    return { text: `${c.key}, 100k in / 1k out: cheapest ${usd(c.cheapest)}, median ${usd(c.median)} across ${c.n} listings`, value: usd(c.median - c.cheapest).slice(1) };
  },
  'x402-ceiling'(s) {
    const m = 'deepseek/deepseek-v4.1-flash'; const c = listCost(s, m, 2000, 1000);
    if (!c) return missing(m);
    const cap = (c.cheapest * 125n + 99n) / 100n;
    return { text: `a fair x402 quote for a ${k(2000)} in / ${k(1000)} out ${c.key} call stops at ${usd(cap)} (list ${usd(c.cheapest)} + 25%)`, value: usd(cap).slice(1) };
  },
  'flop-prices'(s) {
    const rows = s.offers.filter((o) => o.unit === 'FLOP');
    const nets = [...new Set(rows.map((o) => o.network))].sort();
    return { text: rows.length ? `${rows.length} Flop gateway prices (${nets.join(', ')}${nets.every((n) => n === 'devnet') ? ': no value' : ''})` : 'no Flop prices in today\'s snapshot', value: rows.length };
  },
  'flop-watch'(s) {
    const w = s.flop?.watch;
    if (!w) return { text: 'testnet watch: no data in the snapshot', value: null };
    return { text: `Flop testnet watch: ${w.stage}, ${w.filled ?? 0} testnet prices so far`, value: w.stage };
  },
};

/** Every tool's number from one snapshot: { [toolId]: { text, value } }. */
export function metricsFor(kit, snapshot) {
  const out = {};
  for (const t of kit.tools) {
    const f = METRICS[t.metric];
    try { out[t.id] = f ? f(snapshot) : { text: `unknown metric ${t.metric}`, value: null }; } catch (e) { out[t.id] = { text: `could not compute: ${e.message}`, value: null }; }
  }
  return out;
}

/** Problems with a kit.json, or [] if it is fine. */
export function validateKit(kit) {
  const errs = [];
  if (kit?.version !== 1) errs.push('version must be 1');
  const ids = new Set();
  for (const t of kit?.tools ?? []) {
    const at = `tool ${t.id}`;
    if (!/^[a-z0-9-]{1,40}$/.test(t.id ?? '')) errs.push(`${at}: id must be lowercase letters, digits and -`);
    if (ids.has(t.id)) errs.push(`${at}: duplicate id`);
    ids.add(t.id);
    if (!/^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/.test(t.repo ?? '')) errs.push(`${at}: repo must be owner/name`);
    if (!/^https:\/\//.test(t.page ?? '')) errs.push(`${at}: page must be an https URL`);
    if (typeof t.summary !== 'string' || t.summary.length < 20 || t.summary.length > 220) errs.push(`${at}: summary must be 20-220 chars`);
    const run = String(t.run ?? '').replace(/^curl -s https:\/\/raw\.githubusercontent\.com\/[A-Za-z0-9._\/-]+\.json \| /, ''); // optional: pipe in a public example file
    if (!/^npx -y (-p )?github:[A-Za-z0-9-]+\/[A-Za-z0-9._-]+( |$)/.test(run)) errs.push(`${at}: run must be a one-line npx -y github:owner/repo command`);
    if (/[\n;&|`$<>]/.test(run)) errs.push(`${at}: run must be one plain command`);
    if (!METRICS[t.metric]) errs.push(`${at}: metric must be one of ${Object.keys(METRICS).join(', ')}`);
  }
  const used = new Set();
  for (const j of kit?.jobs ?? []) {
    if (!j.title || !Array.isArray(j.tools) || !j.tools.length) errs.push(`job ${j.id}: needs a title and tools`);
    for (const id of j.tools ?? []) { if (!ids.has(id)) errs.push(`job ${j.id}: unknown tool ${id}`); used.add(id); }
  }
  for (const id of ids) if (!used.has(id)) errs.push(`tool ${id}: not in any job`);
  return errs;
}
