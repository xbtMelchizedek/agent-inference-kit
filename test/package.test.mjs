import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

test('npm pack ships src and kit.json; no tests, no web', () => {
  const [p] = JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--json'], { encoding: 'utf8', cwd: new URL('..', import.meta.url).pathname }));
  const files = p.files.map((f) => f.path);
  for (const f of ['src/cli.mjs', 'src/index.mjs', 'src/metrics.mjs', 'src/traction.mjs', 'kit.json', 'LICENSE', 'README.md', 'CHANGELOG.md']) assert.ok(files.includes(f), f);
  assert.ok(!files.some((f) => f.startsWith('test/') || f.startsWith('web/')));
});
