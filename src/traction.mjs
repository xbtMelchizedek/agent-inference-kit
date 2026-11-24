// Per-repo traction from the GitHub API. Stars, forks and watchers are public. Views and clones (last 14 days)
// need a token with push access to the repo; without one they come back null with the reason.
// GitHub publishes no hit counts for Pages sites, so there is no Pages number to report.

export const PAGES_NOTE = 'GitHub has no API for GitHub Pages site traffic; repo views below are github.com visits only.';

export function reposOf(kit, self = 'xbtMelchizedek/agent-inference-kit') {
  return [...new Set([...kit.tools.map((t) => t.repo), self])];
}

/** token is used only as a request header; it is never returned, logged or written. */
export async function traction(repos, { token, fetchImpl = globalThis.fetch, now = () => new Date() } = {}) {
  const headers = { accept: 'application/vnd.github+json', 'user-agent': 'agent-inference-kit', ...(token ? { authorization: `Bearer ${token}` } : {}) };
  const get = async (path) => {
    const r = await fetchImpl(`https://api.github.com${path}`, { headers, signal: AbortSignal.timeout(20_000) });
    return { status: r.status, body: r.ok ? await r.json() : null };
  };
  const rows = [];
  for (const repo of repos) {
    const meta = await get(`/repos/${repo}`);
    if (!meta.body) { rows.push({ repo, error: `HTTP ${meta.status}` }); continue; }
    const row = { repo, stars: meta.body.stargazers_count, forks: meta.body.forks_count, watchers: meta.body.subscribers_count, openIssues: meta.body.open_issues_count, views14d: null, viewers14d: null, clones14d: null, cloners14d: null, traffic: null };
    if (token) {
      const [v, c] = [await get(`/repos/${repo}/traffic/views`), await get(`/repos/${repo}/traffic/clones`)];
      if (v.body && c.body) Object.assign(row, { views14d: v.body.count, viewers14d: v.body.uniques, clones14d: c.body.count, cloners14d: c.body.uniques, traffic: 'ok' });
      else row.traffic = `views HTTP ${v.status}, clones HTTP ${c.status} (needs push access)`;
    } else row.traffic = 'no token: public counts only';
    rows.push(row);
  }
  return { at: now().toISOString(), window: 'views and clones: last 14 days, per GitHub', pages: PAGES_NOTE, repos: rows };
}

export function tractionTable(t) {
  const n = (x) => (x === null || x === undefined ? '-' : String(x));
  const lines = ['| repo | stars | forks | watchers | views 14d (unique) | clones 14d (unique) |', '|---|---|---|---|---|---|'];
  for (const r of t.repos) {
    if (r.error) { lines.push(`| ${r.repo} | ${r.error} | | | | |`); continue; }
    lines.push(`| ${r.repo.split('/')[1]} | ${r.stars} | ${r.forks} | ${r.watchers} | ${n(r.views14d)} (${n(r.viewers14d)}) | ${n(r.clones14d)} (${n(r.cloners14d)}) |`);
  }
  return lines.join('\n');
}
