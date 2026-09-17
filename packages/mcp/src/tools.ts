/**
 * The tool list, and what is not in it.
 *
 * There is `pactra_fetch`. There is no `pactra_transfer(to, amount)`, and
 * there never will be. An agent holding these tools cannot express "send money
 * to X" — only "fetch this URL", after which the recipient comes from the
 * seller's own 402 challenge and the price comes from the seller. The moment a
 * general transfer tool exists, an agent can name a recipient, and the claim
 * that the fence is structural becomes a claim that everyone behaved.
 *
 * So the absence is part of the product, and it is tested.
 */
export const ABSENT_TOOLS = [
  "pactra_transfer",
  "pactra_pay",
  "pactra_send",
  "pactra_withdraw",
  "pactra_approve",
] as const;

export const TOOL_NAMES = ["pactra_fetch", "pactra_spawn", "pactra_status"] as const;
export type ToolName = (typeof TOOL_NAMES)[number];
