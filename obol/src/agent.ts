// The buyer loop. It owns budget accounting, history, and stop conditions; the
// "what to do next" is delegated to an injected Chooser, and "doing it" to an
// injected ExecuteCall. Neither chain nor LLM is imported here — both are injected,
// so the whole orchestration is unit-tested offline with mocks.

import type { Catalog, Service } from "./catalog.ts";
import type { AgentState, Chooser } from "./decide.ts";

export type ExecuteCall = (
  service: Service,
  input: unknown,
) => Promise<{ result: unknown; costWei: bigint }>;

export async function runBuyer(opts: {
  goal: string;
  budgetWei: bigint;
  catalog: Catalog;
  chooser: Chooser;
  execute: ExecuteCall;
  maxSteps?: number;
  onStep?: (state: AgentState, note: string) => void;
}): Promise<AgentState> {
  const maxSteps = opts.maxSteps ?? 12;
  const state: AgentState = {
    goal: opts.goal,
    budgetWei: opts.budgetWei,
    spentWei: 0n,
    history: [],
  };

  for (let step = 0; step < maxSteps; step++) {
    const decision = await opts.chooser.decide(state, opts.catalog);

    if (decision.action === "stop") {
      opts.onStep?.(state, `stop: ${decision.reason}`);
      break;
    }

    const { service, input } = decision;

    // Budget guard: never start a call we can't pay for.
    if (state.spentWei + service.priceWei > state.budgetWei) {
      opts.onStep?.(state, `stop: cannot afford ${service.name} (price exceeds remaining budget)`);
      break;
    }

    opts.onStep?.(state, `call ${service.name}: ${decision.reason}`);
    const { result, costWei } = await opts.execute(service, input);
    state.spentWei += costWei;
    state.history.push({ service: service.name, input, result, costWei });
  }

  return state;
}
