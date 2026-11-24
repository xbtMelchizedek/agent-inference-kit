#!/usr/bin/env node
// agent-inference-kit: the kit's tools by job, each with its one-line command and a live number.
import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { metricsFor } from './metrics.mjs';
import { traction, tractionTable, reposOf } from './traction.mjs';

const KIT = JSON.parse(readFileSync(new URL('../kit.json', import.meta.url), 'utf8'));
const VERSION = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
const HELP = `agent-inference-kit ${VERSION}: small tools for pricing, routing, capping and proving agent inference spend

  agent-inference-kit [job]            the tools by job, with live numbers from justweight (jobs: ${KIT.jobs.map((j) => j.id).join(', ')})
  agent-inference-kit --json           the same as JSON
  agent-inference-kit --offline        skip the live numbers
  agent-inference-kit traction [--out file.json]   stars, forks, watchers per repo; views and clones too if GITHUB_TOKEN can read them

Page: ${KIT.page}`;

export async function main(argv, { out = console.log, env = process.env, fetchImpl = globalThis.fetch } = {}) {
  try {
    const flags = new Set(argv.filter((a) => a.startsWith('--')));
    const args = argv.filter((a) => !a.startsWith('--'));
    for (const f of flags) if (!['--json', '--offline', '--help', '--out'].includes(f)) throw new Error(`unknown option ${f}`);
    if (flags.has('--help') || args[0] === 'help') { out(HELP); return 0; }
    if (args[0] === 'traction') {
      const i = argv.indexOf('--out');
      const t = await traction(reposOf(KIT), { token: env.GITHUB_TOKEN || undefined, fetchImpl });
      if (i >= 0) { if (!argv[i + 1]) throw new Error('--out needs a file'); writeFileSync(argv[i + 1], JSON.stringify(t, null, 1) + '\n'); }
      out(flags.has('--json') ? JSON.stringify(t, null, 1) : `${tractionTable(t)}\n\n${t.at} · ${t.window} · ${t.pages}`);
      return 0;
    }
    const jobs = args[0] ? KIT.jobs.filter((j) => j.id === args[0]) : KIT.jobs;
    if (!jobs.length) throw new Error(`unknown job ${args[0]} (jobs: ${KIT.jobs.map((j) => j.id).join(', ')})`);
    let snap = null; let metrics = {}; let note = 'live numbers skipped (--offline)';
    if (!flags.has('--offline')) {
      try {
        const r = await fetchImpl(env.KIT_SNAPSHOT_URL || KIT.snapshot, { signal: AbortSignal.timeout(20_000) });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        snap = await r.json();
        metrics = metricsFor(KIT, snap);
        note = `live numbers: justweight snapshot ${snap.generatedAt}`;
      } catch (e) { note = `live numbers unavailable (${e.message})`; }
    }
    const tools = Object.fromEntries(KIT.tools.map((t) => [t.id, t]));
    if (flags.has('--json')) { out(JSON.stringify({ page: KIT.page, snapshotAt: snap?.generatedAt ?? null, jobs: jobs.map((j) => ({ ...j, tools: j.tools.map((id) => ({ ...tools[id], live: metrics[id] ?? null })) })) }, null, 1)); return 0; }
    const lines = [`agent inference kit · ${KIT.page}`, ''];
    for (const j of jobs) {
      lines.push(`${j.title}`);
      for (const id of j.tools) {
        const t = tools[id];
        lines.push(`  ${t.name}: ${t.summary}`, `    $ ${t.run}`);
        if (metrics[id]) lines.push(`    now: ${metrics[id].text}`);
      }
      lines.push('');
    }
    lines.push(note);
    out(lines.join('\n'));
    return 0;
  } catch (e) {
    out(`agent-inference-kit: ${e.message}`);
    return 2;
  }
}

function isEntry() {
  try { return !!process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url); } catch { return false; }
}
if (isEntry()) main(process.argv.slice(2)).then((c) => process.exit(c));
