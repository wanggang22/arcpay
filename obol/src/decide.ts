// The buyer's decision policy. The Chooser interface is what makes the agent
// "agentic": given the current state + catalog, it decides the next action.
//
// deterministicChooser is a pure, testable fallback (and the safety net when the
// LLM is unavailable or returns garbage). llmChooser (src/llm.ts) is the real brain.

import type { Catalog, Service } from "./catalog.ts";
import { affordable } from "./catalog.ts";

export type Decision =
  | { action: "call"; service: Service; input: unknown; reason: string }
  | { action: "stop"; reason: string };

export type HistoryItem = { service: string; input: unknown; result: unknown; costWei: bigint };

export type AgentState = {
  goal: string;
  budgetWei: bigint;
  spentWei: bigint;
  history: HistoryItem[];
};

export interface Chooser {
  decide(state: AgentState, catalog: Catalog): Promise<Decision>;
}

// Function words that would create junk capability matches (e.g. a goal and a
// capability both containing "of"). Dropped before scoring.
const STOPWORDS = new Set([
  "the", "a", "an", "of", "to", "and", "or", "for", "in", "on", "at", "is", "are",
  "it", "this", "that", "then", "with", "as", "by", "be", "into", "couple", "your",
  "you", "i", "me", "my", "from", "up", "down", "out", "so",
]);

/** lowercase content-word tokens, for naive capability matching */
function tokens(s: string): string[] {
  return (s.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/** count how many content goal-tokens appear in a service's name+capability */
function matchScore(goal: string, s: Service): number {
  const hay = new Set(tokens(`${s.name} ${s.capability}`));
  return tokens(goal).filter((t) => hay.has(t)).length;
}

/**
 * Deterministic policy: among affordable, not-yet-used services, pick the best
 * capability match; break ties by lowest price. Stop when nothing affordable matches.
 */
export function deterministicChooser(): Chooser {
  return {
    async decide(state, catalog) {
      const remaining = state.budgetWei - state.spentWei;
      const used = new Set(state.history.map((h) => h.service));
      const candidates = affordable(catalog, remaining).filter((s) => !used.has(s.name));

      if (candidates.length === 0) {
        return { action: "stop", reason: "no affordable unused service left" };
      }

      const ranked = [...candidates].sort((a, b) => {
        const d = matchScore(state.goal, b) - matchScore(state.goal, a);
        if (d !== 0) return d;
        return a.priceWei < b.priceWei ? -1 : a.priceWei > b.priceWei ? 1 : 0;
      });

      const best = ranked[0]!;
      if (matchScore(state.goal, best) === 0) {
        return { action: "stop", reason: "no remaining service matches the goal" };
      }
      return {
        action: "call",
        service: best,
        input: { goal: state.goal },
        reason: `best capability match within budget (${best.name})`,
      };
    },
  };
}
