# Pactra

**One budget for a tree of agents, enforced on chain.**

An orchestrator spawns workers, and workers spawn workers of their own. Each
agent in the tree gets a spending limit and respects it — and nobody anywhere
adds the numbers up, so a fan-out of agents can spend a multiple of what the
owner actually signed for without a single local rule being broken.

Pactra closes that gap with a smart contract that has no admin key and no
upgrade path. Every purchase is checked against **every ancestor** in the
delegation tree, up to the root a person signed once. If the sum would break
that signature, the purchase does not happen — the refusal is written on
chain and published to a public reputation registry.

**Live**: [pactra.pages.dev](https://pactra.pages.dev) · **Console**:
[pactra.pages.dev/console](https://pactra.pages.dev/console/) · deployed on
Arc testnet, chain `5042002`.

Maintained by **SomeshTalligeriDEV**.

---

## Screenshots

| | |
|---|---|
| ![Console overview](docs/screenshots/console-overview.png) | ![New mandate](docs/screenshots/console-new-mandate.png) |
| ![Agents tree](docs/screenshots/console-agents.png) | ![Refusal record](docs/screenshots/refusal-page.png) |

More in [`docs/screenshots/`](docs/screenshots/).

---

## Read more

- [Package guide](packages/README.md) — the full architecture, the mandate's
  seven fields, the settlement rail, the evidence gates, and every command to
  run each package.
- [System architecture and user workflows](docs/Pactra-System-Architecture-and-User-Workflows.md)
  (also as [PDF](docs/Pactra-System-Architecture-and-User-Workflows.pdf)).
- [Operations](ops/README.md) — self-hosting, DNS, systemd, and the AWS/Cloudflare
  deploy scripts under `ops/aws/`.

## Local development

Each package has its own npm configuration:

```bash
npm ci --prefix packages/site && npm run dev --prefix packages/site
npm ci --prefix packages/console && npm run dev --prefix packages/console
```

Backend entry points run their `.ts` sources directly and need **Node 23.6+**
for type stripping without a flag. Contract tests need
[Foundry](https://getfoundry.sh).

The console runs in read-only preview mode until `VITE_PRIVY_APP_ID` is set —
see `packages/console/.env`. A working payment flow additionally needs
deployed contracts, a funded vault, an operator key, and a seller that speaks
x402 — `packages/README.md`'s quick start walks through all of it end to end.

## Tech stack

Solidity 0.8.28 + Foundry on Arc testnet · viem 2 · the Model Context
Protocol SDK · React 18 + Vite · x402 `exact` + EIP-3009 + Circle Gateway for
settlement · ERC-8004 for identity and reputation.

## Status

Contracts deployed and source-verified on Arc testnet, all 96 contract tests
passing. A live mandate has been signed, funded, and used for real purchases
end to end. `pactra.example` in the package guide and elsewhere is a
documentation placeholder for the eventual production domain — the actual
live deployment is at the Cloudflare Pages link above.

See the risk register in the architecture doc before any non-testnet use:
the daemon/proxy HTTP listeners do not authenticate callers, and payment
settlement is a separate step from contract budget enforcement.

## Licence

MIT — [LICENSE](LICENSE).
