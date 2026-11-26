# Changelog

## Unreleased

- Add an offline `--markdown` CLI table generated from `kit.json` and check that it matches the README.

## 0.1.0 (2026-11-24)

First release.

- `kit.json`: the eight tools of the agent inference kit, sorted into four jobs, each with a one-line `npx -y github:…` command and a live metric. It is the single source of truth, and CI validates it.
- Page: tools by job, a copy button for each command, and a live number for each tool computed in the browser from the justweight snapshot. It also has a traction table.
- CLI: `npx -y github:xbtMelchizedek/agent-inference-kit [job] [--json] [--offline]`, and `traction`, which reads stars, forks and watchers for each repo, plus views and clones when a token allows.
- The other seven repos' READMEs now link to this page instead of keeping their own copy of the list.
- Baseline traction on 2026-11-24 is in `data/traction.json`.
