# Razorpay AI Builders — project submission draft

Name: Somesh.S.Talligeri

Project: Pactra — hierarchical budget enforcement for delegated agents

GitHub: https://github.com/SomeshTalligeriDEV/Pactra

Demo: https://github.com/SomeshTalligeriDEV/Pactra/blob/main/docs/demo/pactra-razorpay-demo.mp4

## What I built

I built Pactra to explore a problem in agentic payments: when an agent delegates to multiple workers, separate spending limits can multiply the owner's exposure. Pactra accounts for every accepted draw at the requesting node and each ancestor, so delegation shares the root budget instead of creating new authority.

The prototype includes Solidity contracts, a TypeScript payment runtime, MCP tools, an owner console, and a reproducible local evaluation. The demo connects a local test wallet, signs mandate creation, token approval, vault funding and worker delegation in the browser, then shows a looping worker stopped by a concentration rule. In the separate controlled evaluation, useful work completed in all three Pactra runs; independent wallets also preserved completion, but allowed more loop spending.

## Why this fits AI Builders

I am interested in the infrastructure that makes agent workflows useful around money: explicit authority, bounded spending, observable failures, and clear recovery paths. Pactra turns that question into a working prototype with code and experiments a reviewer can inspect. It is directly relevant to agentic payments while remaining independent of Razorpay's products.

## What I would work on next

An end-to-end agent workflow under realistic latency and fee conditions, additional adaptive failure cases, stronger settlement-to-authorization binding, and better operational observability. The current prototype uses scripted evaluation workers and mock settlement locally. It is not production-ready or professionally audited.

## Before submitting

Paste the text into the form and adapt it to the actual questions. Add your own truthful explanation of the AI tools you used and one concrete example of how they helped you build or debug; the repository alone does not establish that personal history. No job application has been sent.
