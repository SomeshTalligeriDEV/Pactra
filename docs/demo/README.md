# Pactra — Razorpay AI Builders demo

**Builder:** Somesh.S.Talligeri · REVA University, Bengaluru, India

[Watch/download the narrated demo](pactra-razorpay-demo.mp4) · [Captions](pactra-razorpay-demo.srt) · [Application text](APPLICATION.md)

This walkthrough shows the product interface, real local contract reads, a seven-request concentration experiment, the refusal view, MCP integration, and the separately recorded three-condition evaluation. Narration uses a synthetic system voice; it is not a recording of the author's voice. Screen captures are edited into a narrated walkthrough, not a continuous real-time recording.

## Run the actual local demonstration

Requirements: Node.js 22.14+ with TypeScript stripping (or Node.js 23.6+), npm, Foundry (`forge` and `anvil` on PATH), existing package dependencies. From the repository root:

```sh
npm --prefix packages/console ci
npm --prefix packages/site ci
npm --prefix packages/daemon ci
NODE_OPTIONS=--experimental-strip-types node docs/demo/run-local.ts
```

Open `http://127.0.0.1:5375/console/`. In another terminal:

```sh
curl -X POST http://127.0.0.1:8660/loop
```

The helper deploys the actual contracts to a fresh local Anvil instance on port 8659 and mints mock tokens to the public test identity. Connect the local wallet in the console, open a root (budget 20, lifetime 100, tranche 5, concentration 35%, depth 3), fund it with 20, then spawn three workers at 50% of the root budget. Use the operator address returned by `curl http://127.0.0.1:8660/`. Each operation uses the existing console transaction flow and a development-only wallet confirmation adapter. The browser signs and broadcasts each transaction. Then run `curl -X POST http://127.0.0.1:8660/work` before the loop. Two initial draws charge 770000 base units ($0.77) to the root. The loop submits seven draws of 510000 units from one worker to one declared seller. Six succeed ($3.06), the seventh exceeds the worker's $3.50 concentration allowance, and the root ends at 3830000 units ($3.83). The control endpoint is local-only and the loop runs once. Stop with Ctrl-C; restart to reset.

The helper uses public deterministic test identities from the test harness. Never fund these identities on a public chain. No private wallet configuration is needed. Token, Gateway, and identity/reputation integrations are mocks. Owner actions are signed in the browser by a connected local test wallet. This development adapter is not MetaMask or the production Privy integration. Agent draw requests are signed separately by the local harness operator. Local transaction IDs are not public explorer evidence. The UI's external record/explorer links are not part of this local demo.

The network adapter is opt-in through `PACTRA_LOCAL_DEMO_CONFIG`, accepts a loopback RPC, and refuses production builds. Default production configuration still points at the archival Arc deployment. No corrected public deployment is claimed.

## Capture and render

Start the site in a second terminal:

```sh
npm --prefix packages/site run dev -- --host 127.0.0.1
```

Install Playwright in a separate tool directory or use an existing installation. Set `PACTRA_PLAYWRIGHT` to its package directory and `PACTRA_CHROME` to a local Chrome executable, then, from a freshly restarted demo:

```sh
node docs/demo/record.cjs
python3 docs/demo/render.py
```

The capture script connects the wallet, confirms six signed owner transactions (open, approve, fund, three spawns), checks contract values and the refusal, and checks browser exceptions. The renderer requires Python Pillow, FFmpeg/FFprobe, and macOS `say` with the Samantha voice. `PACTRA_DEMO_FONT_DIR` can override the default macOS supplemental font directory. It produces a 1920×1080 H.264/AAC MP4, SRT captions, a thumbnail and timing metadata. Browser captures and narration text are included for inspection.

## Evidence and limits

- Site and console production builds passed. Vite reports large chunks; the wallet SDK also emits removable annotation warnings.
- All 10 evaluation tests passed in this preparation run.
- `python3 benchmarks/validate-results.py` passed for the archived contract, gas, depth, search and baseline evidence at implementation commit `236f9f8744308bf9f7becc048d25777e2d5711f0`.
- The archived Foundry report has 101 reported cases; seven fuzz functions each have 512 runs. This is not 101 distinct Solidity functions.
- `validation.json` records the additional local demo checks.
- Controlled comparisons use scripted workers and mock settlement. No production latency, professional audit, formal verification, or general AI safety guarantee is claimed.
- The daemon declares the counterparty. The final payment recipient is not cryptographically bound to the checked address. The owner is trusted; privileged release and withdrawal are outside agent-draw budget conservation.

The public console's configured owner had no mandate when checked for this recording. Use the reproducible local demonstration above to inspect current behavior. No public-chain transaction or deployment was performed for this video.
