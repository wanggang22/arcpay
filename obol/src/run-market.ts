// Runnable entrypoint: watch the buyer agent autonomously work a goal within a budget.
//
//   tsx src/run-market.ts "<goal>" <budgetWei>
//
// Brain: llmChooser if an Anthropic key is available (env or ~/.claude-apis.env), else
//        the deterministic policy.
// Executor: onchainExecute if BUYER_PK + BUYER_ADDR are set (real settlement on Arc,
//           talking to live seller URLs in OBOL_SELLERS), else directExecute (offline
//           dry-run: real service logic, simulated payment) so the agent is demoable now.

import type { Catalog } from "./catalog.ts";
import { runBuyer } from "./agent.ts";
import { deterministicChooser, type Chooser } from "./decide.ts";
import { llmChooser, loadApiKey } from "./llm.ts";
import { SELLER_SPECS, directExecute, onchainExecute } from "./sellers.ts";
import { discover } from "./discovery.ts";
import type { ExecuteCall } from "./agent.ts";

async function buildCatalog(): Promise<Catalog> {
  const sellerUrls = (process.env.OBOL_SELLERS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (sellerUrls.length > 0) return discover(sellerUrls);
  // dry-run catalog straight from the specs (dummy ids/urls; directExecute ignores them)
  return SELLER_SPECS.map((s, i) => ({
    name: s.name,
    capability: s.capability,
    endpointId: ("0x" + String(i).repeat(64)).slice(0, 66) as `0x${string}`,
    priceWei: s.priceWei,
    sellerUrl: `dry://${s.name}`,
  }));
}

function chooser(): Chooser {
  return loadApiKey() ? llmChooser() : deterministicChooser();
}

function executor(): ExecuteCall {
  const buyerPk = process.env.BUYER_PK as `0x${string}` | undefined;
  const buyerAddress = process.env.BUYER_ADDR as `0x${string}` | undefined;
  if (buyerPk && buyerAddress) return onchainExecute({ buyerPk, buyerAddress });
  return directExecute();
}

async function main() {
  const goal = process.argv[2] ?? "classify the sentiment of: Arc makes nanopayments finally economical";
  const budgetWei = BigInt(process.argv[3] ?? "1000");

  const mode = process.env.BUYER_PK ? "ON-CHAIN (Arc)" : "DRY-RUN (offline)";
  const brain = loadApiKey() ? "LLM (Claude)" : "deterministic";
  console.log(`\nObol market  ·  brain: ${brain}  ·  settlement: ${mode}`);
  console.log(`goal: ${goal}\nbudget: ${budgetWei} wei\n`);

  const catalog = await buildCatalog();
  console.log("catalog:", catalog.map((s) => `${s.name}(${s.priceWei})`).join("  "), "\n");

  const state = await runBuyer({
    goal,
    budgetWei,
    catalog,
    chooser: chooser(),
    execute: executor(),
    onStep: (s, note) => console.log(`  · ${note}   [spent ${s.spentWei}/${s.budgetWei}]`),
  });

  console.log("\nresult transcript:");
  for (const h of state.history) {
    console.log(`  ${h.service} (${h.costWei}) -> ${JSON.stringify(h.result)}`);
  }
  console.log(`\ntotal spent: ${state.spentWei} wei across ${state.history.length} paid calls\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
