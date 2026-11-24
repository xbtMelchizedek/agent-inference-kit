import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { main } from '../src/cli.mjs';

const SNAP = readFileSync(new URL('./fixtures/snapshot.json', import.meta.url), 'utf8');
const CLI = new URL('../src/cli.mjs', import.meta.url).pathname;
const TOKEN = 'test-token-not-real-91c2';
const run = async (args, o = {}) => { const lines = []; const code = await main(args, { out: (s) => lines.push(s), env: {}, ...o }); return { code, out: lines.join('\n') }; };
const snapFetch = async () => new Response(SNAP, { status: 200 });

test('lists tools by job with live numbers', async () => {
  const r = await run([], { fetchImpl: snapFetch });
  assert.equal(r.code, 0);
  assert.match(r.out, /^agent inference kit · https:\/\/xbtmelchizedek\.github\.io\/agent-inference-kit\//);
  assert.match(r.out, /Spend without overspending\n {2}agent-spendcap: /);
  assert.match(r.out, /\$ npx -y github:xbtMelchizedek\/x402-price-check demo\n {4}now: a fair x402 quote/);
  assert.match(r.out, /live numbers: justweight snapshot 2026-11-24T21:15:08\.951Z$/);
});

test('job filter, --offline, --json, errors', async () => {
  const f = await run(['flop', '--offline']);
  assert.match(f.out, /Prove and track Flop compute spend/);
  assert.doesNotMatch(f.out, /Spend without overspending|now:/);
  const j = JSON.parse((await run(['--json'], { fetchImpl: snapFetch })).out);
  assert.equal(j.jobs.length, 4);
  assert.match(j.jobs[0].tools[0].live.text, /38 prices/);
  const down = await run([], { fetchImpl: async () => new Response('', { status: 503 }) });
  assert.equal(down.code, 0);
  assert.match(down.out, /live numbers unavailable \(HTTP 503\)/);
  assert.equal((await run(['nope'])).code, 2);
  assert.equal((await run(['--bogus'])).code, 2);
});

function fakeGitHub(calls) {
  return async (url, init) => {
    calls.push({ url, auth: init.headers.authorization ?? null });
    const p = new URL(url).pathname;
    if (p.endsWith('/traffic/views')) return init.headers.authorization ? Response.json({ count: 12, uniques: 3, views: [] }) : new Response('', { status: 401 });
    if (p.endsWith('/traffic/clones')) return init.headers.authorization ? Response.json({ count: 5, uniques: 2, clones: [] }) : new Response('', { status: 401 });
    if (p.endsWith('/agent-inference-kit')) return new Response('', { status: 404 });
    return Response.json({ stargazers_count: 4, forks_count: 1, subscribers_count: 2, open_issues_count: 3 });
  };
}

test('traction: public counts without a token, traffic with one, token never printed', async () => {
  const calls = [];
  const pub = await run(['traction', '--json'], { fetchImpl: fakeGitHub(calls) });
  const p = JSON.parse(pub.out);
  assert.equal(p.repos.find((r) => r.repo === 'xbtMelchizedek/justweight').stars, 4);
  assert.equal(p.repos[0].views14d, null);
  assert.match(p.repos[0].traffic, /no token/);
  assert.ok(calls.every((c) => !c.url.includes('/traffic/')));
  const calls2 = [];
  const auth = await run(['traction'], { fetchImpl: fakeGitHub(calls2), env: { GITHUB_TOKEN: TOKEN } });
  assert.match(auth.out, /\| justweight \| 4 \| 1 \| 2 \| 12 \(3\) \| 5 \(2\) \|/);
  assert.match(auth.out, /agent-inference-kit \| HTTP 404/);
  assert.match(auth.out, /no API for GitHub Pages site traffic/);
  assert.ok(!auth.out.includes(TOKEN));
  assert.equal(calls2[0].auth, `Bearer ${TOKEN}`);
  assert.ok(calls2.every((c) => c.url.startsWith('https://api.github.com/')));
});

test('the bin runs through a symlink (as npx does)', () => {
  const d = mkdtempSync(join(tmpdir(), 'kit-'));
  const link = join(d, 'agent-inference-kit');
  symlinkSync(CLI, link);
  const r = spawnSync(link, ['route', '--offline'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /justweight infer/);
});
