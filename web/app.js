import { metricsFor } from './lib/metrics.mjs';

const $ = (id) => document.getElementById(id);
const el = (tag, text, cls) => { const e = document.createElement(tag); if (text !== undefined) e.textContent = text; if (cls) e.className = cls; return e; };
const link = (href, text) => { const a = el('a', text); a.href = href; return a; };

function copyButton(text) {
  const b = el('button', 'Copy', 'secondary copy');
  b.type = 'button';
  b.addEventListener('click', async () => { try { await navigator.clipboard.writeText(text); b.textContent = 'Copied'; } catch { b.textContent = 'Select and copy'; } setTimeout(() => { b.textContent = 'Copy'; }, 1500); });
  return b;
}

function updateLiveNumber(live, metric) {
  const badge = el('span', undefined, `badge ${metric && metric.value !== null ? 'info' : 'neutral'}`);
  badge.append(el('span', undefined, 'badge-dot'), 'now');
  live.replaceChildren(badge, ' ', metric ? metric.text : 'live number loading…');
}

function render(kit) {
  const tools = Object.fromEntries(kit.tools.map((t) => [t.id, t]));
  const jobs = $('jobs'); const nav = $('jobnav');
  const liveNumbers = new Map();
  const anchors = new Set(kit.jobs.map((job) => job.id));
  jobs.replaceChildren(); nav.replaceChildren();
  for (const j of kit.jobs) {
    nav.append(link(`#${j.id}`, j.title));
    const sec = el('section', undefined, 'panel'); sec.id = j.id;
    sec.append(el('h2', j.title));
    for (const id of j.tools) {
      const t = tools[id];
      const card = el('article', undefined, 'tool');
      if (!anchors.has(t.id)) {
        card.id = t.id;
        anchors.add(t.id);
      }
      const h = el('h3'); h.append(link(t.page, t.name), ' ', link(`https://github.com/${t.repo}`, 'repo'));
      card.append(h, el('p', t.summary));
      const cmd = el('div', undefined, 'cmd'); cmd.append(el('code', t.run), copyButton(t.run));
      card.append(cmd);
      const live = el('p', undefined, 'live');
      updateLiveNumber(live);
      if (!liveNumbers.has(id)) liveNumbers.set(id, []);
      liveNumbers.get(id).push(live);
      card.append(live);
      sec.append(card);
    }
    jobs.append(sec);
  }
  return liveNumbers;
}

async function traction(kit) {
  const tbl = $('trac');
  let base = null;
  try { base = await (await fetch('traction.json')).json(); } catch { /* optional */ }
  const repos = [...new Set(kit.tools.map((t) => t.repo))];
  const live = await Promise.all(repos.map(async (r) => {
    try { const x = await fetch(`https://api.github.com/repos/${r}`); return x.ok ? await x.json() : null; } catch { return null; }
  }));
  const hr = el('tr'); for (const h of ['Repo', 'Stars', 'Forks', 'Views 14d', 'Clones 14d']) hr.append(el('th', h));
  tbl.replaceChildren(hr);
  repos.forEach((r, i) => {
    const b = base?.repos.find((x) => x.repo === r);
    const tr = el('tr');
    const n = (v) => (v === null || v === undefined ? '–' : String(v));
    const td0 = el('td'); td0.append(link(`https://github.com/${r}`, r.split('/')[1]));
    tr.append(td0, el('td', n(live[i]?.stargazers_count ?? b?.stars), 'num'), el('td', n(live[i]?.forks_count ?? b?.forks), 'num'),
      el('td', b ? `${n(b.views14d)} (${n(b.viewers14d)} unique)` : '–', 'num'), el('td', b ? `${n(b.clones14d)} (${n(b.cloners14d)} unique)` : '–', 'num'));
    tbl.append(tr);
  });
  $('tracnote').textContent = `Stars and forks are live from the GitHub API${live.some((x) => !x) ? ' (some requests were rate-limited; those show the baseline)' : ''}. Views and clones are the last 14 days as GitHub reported them at ${base ? base.at.replace('T', ' ').slice(0, 16) + ' UTC' : 'no baseline yet'}; they need a token, so they are refreshed with \`npx -y github:xbtMelchizedek/agent-inference-kit traction\`. ${base?.pages ?? ''}`;
}

let linkedTool = null;
function openFragment(scroll = false) {
  const target = document.getElementById(location.hash.slice(1));
  linkedTool?.classList.remove('linked-tool');
  linkedTool = target?.matches('article.tool') ? target : null;
  linkedTool?.classList.add('linked-tool');
  if (scroll) target?.scrollIntoView({ block: 'start' });
}

const kit = await (await fetch('kit.json')).json();
const liveNumbers = render(kit);
// The initial fragment is resolved only after the requested card exists.
openFragment(true);
window.addEventListener('hashchange', () => openFragment());
traction(kit);
try {
  const r = await fetch(kit.snapshot);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const snap = await r.json();
  const metrics = metricsFor(kit, snap);
  for (const [id, labels] of liveNumbers) {
    for (const label of labels) updateLiveNumber(label, metrics[id]);
  }
  $('snapnote').textContent = `Live numbers: justweight snapshot ${snap.generatedAt.replace('T', ' ').slice(0, 16)} UTC`;
} catch (e) {
  $('snapnote').textContent = `Live numbers unavailable (${e.message})`;
}
