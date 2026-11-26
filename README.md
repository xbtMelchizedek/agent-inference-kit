# agent inference kit

Small open-source tools for agents that pay for their own inference, in one place and sorted by job. Each tool does one thing, runs with one `npx` line and works with the others. All are MIT and read-only or local by default, and none holds your keys.

**Page, with a live number for each tool from justweight's price snapshot:** https://xbtmelchizedek.github.io/agent-inference-kit/

## Quickstart

```sh
npx -y github:xbtMelchizedek/agent-inference-kit
```

This prints every tool by job, with its one-line command and today's number. Name a job (`prices`, `route`, `spend` or `flop`) to see only that job's tools, and add `--json` for machine-readable output. Use `--markdown` to print the tool table without fetching live numbers.

## The tools

| Job | Tool | One line |
|---|---|---|
| Know what inference costs | [justweight](https://github.com/xbtMelchizedek/justweight) | `npx -y github:xbtMelchizedek/justweight tiers` |
|  | [agent-price-feed](https://github.com/xbtMelchizedek/agent-price-feed) | `npx -y github:xbtMelchizedek/agent-price-feed events --kind price-drop,cheapest-change` |
| Route one call to the cheapest venue | [justweight infer](https://github.com/xbtMelchizedek/justweight#infer-route-one-call-with-caps-and-a-receipt) | `npx -y -p github:xbtMelchizedek/justweight justweight-mcp` |
| Spend without overspending | [agent-spendcap](https://github.com/xbtMelchizedek/agent-spendcap) | `curl -s https://raw.githubusercontent.com/xbtMelchizedek/agent-spendcap/main/examples/policy.json \| npx -y github:xbtMelchizedek/agent-spendcap authorize --policy /dev/stdin --venue openrouter:pearl-research/fp8 --model qwen/qwen3.8-27b --usd 0.004 --privacy no-retention` |
|  | [agent-cost-proxy](https://github.com/xbtMelchizedek/agent-cost-proxy) | `npx -y github:xbtMelchizedek/agent-cost-proxy` |
|  | [x402-price-check](https://github.com/xbtMelchizedek/x402-price-check) | `npx -y github:xbtMelchizedek/x402-price-check demo` |
| Prove and track Flop compute spend | [flop-receipt-root](https://github.com/xbtMelchizedek/flop-receipt-root) | `npx -y github:xbtMelchizedek/flop-receipt-root build --network devnet --last 3600 --out epoch.json` |
|  | [flop-spend](https://github.com/xbtMelchizedek/flop-spend) | `npx -y github:xbtMelchizedek/flop-spend has-spent 5GsXb3TmNGixuEsbtixqHnqWr9UQJ2M8bkqBQWteNekgF98S` |

[kit.json](kit.json) is the source of truth, with the full commands, summaries and which live number each tool shows. The page and the CLI both read it. Each tool's README links here instead of keeping its own copy of the list. On 2026-11-24 every command was run from an empty directory, and each one ran.

## Live numbers

Each tool's number is computed from one [justweight snapshot](https://xbtmelchizedek.github.io/justweight/data/snapshot.json) in the browser, or in the CLI:

- **justweight:** how many prices, and from how many providers.
- **agent-price-feed:** how many models have a USD price to watch.
- **justweight infer:** the cheapest Qwen3.8-27B call (2k in, 500 out), and where.
- **agent-spendcap:** how many DeepSeek V4.1 Flash calls $1 covers.
- **agent-cost-proxy:** the cheapest and median price of the same Qwen call.
- **x402-price-check:** the most a fair x402 quote can ask (list price + 25%).
- **flop-receipt-root:** the Flop gateway prices.
- **flop-spend:** where Flop's testnet watch stands.

A model missing from the snapshot shows as missing, never as a made-up price.

## Traction

```sh
GITHUB_TOKEN=… npx -y github:xbtMelchizedek/agent-inference-kit traction --out data/traction.json
```

This reads stars, forks and watchers for each repo, which anyone can read. With a token that has push access, it also reads views and clones for the last 14 days. The token is only sent to api.github.com as a header and is never printed or written. GitHub has no API for GitHub Pages traffic, so there is no Pages number. The page shows live stars and forks, plus the views and clones from the last committed `data/traction.json`, with its date.

## Add a tool

Send one pull request to `kit.json` with an id, the repo, a summary, the `npx -y github:…` command, a job and a metric. CI checks the entry, and the page and CLI pick it up. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Develop

```sh
git clone https://github.com/xbtMelchizedek/agent-inference-kit && cd agent-inference-kit
npm install && npm test
node scripts/build-web.mjs   # the Pages site, into _site
```

The tests run without network access. Dependency: justweight. See [SECURITY.md](SECURITY.md).

MIT. The page uses Arc UI foundation tokens (MIT, see `web/arc/LICENSE`).
