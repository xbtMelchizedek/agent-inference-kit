# Contributing to the agent inference kit

## Add a tool

Send one pull request that edits `kit.json`:

- `id`: lowercase, digits and `-`.
- `repo`: `owner/name`.
- `page`: an https URL.
- `summary`: 20 to 220 characters, saying what it does and not why it's great.
- `run`: one line starting `npx -y github:owner/repo`. Optionally, it can start with a `curl -s` of a public raw.githubusercontent.com JSON file piped in. No `;`, `&&`, `$` or redirects.
- `metric`: one of the metrics in `src/metrics.mjs`, or add a new one with a test.
- Put the id in one of the `jobs`, or propose a new job.

The tool should be MIT or similar, run without anyone else's keys, and say plainly what it does not do. Run its `run` line from an empty directory before you open the PR.

```sh
npm install && npm test
```

## Ground rules

- **Numbers come from the justweight snapshot, or they don't show.** A missing model is shown as missing.
- **Exact amounts.** Prices are BigInt nano-USD, never floats.
- **No tokens in output.** `traction` sends the token only as a header to api.github.com. Tests check that it never appears in output.

Security findings go through [SECURITY.md](SECURITY.md), never into a public issue.
