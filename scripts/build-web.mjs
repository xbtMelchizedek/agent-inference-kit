// Builds the Pages site into _site: web/, kit.json, the traction baseline and the browser-safe metrics module.
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const out = join(root, '_site');
rmSync(out, { recursive: true, force: true });
cpSync(join(root, 'web'), out, { recursive: true });
mkdirSync(join(out, 'lib'), { recursive: true });
cpSync(join(root, 'kit.json'), join(out, 'kit.json'));
cpSync(join(root, 'data/traction.json'), join(out, 'traction.json'));
cpSync(join(root, 'src/metrics.mjs'), join(out, 'lib/metrics.mjs'));
cpSync(join(dirname(createRequire(import.meta.url).resolve('justweight/core')), 'core.mjs'), join(out, 'lib/justweight-core.mjs'));
console.log(`built ${out}`);
