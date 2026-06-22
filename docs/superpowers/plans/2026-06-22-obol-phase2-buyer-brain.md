# Obol Phase 2 — Buyer Brain (Implementation Plan)

> REQUIRED SUB-SKILL: executing-plans / subagent-driven-development. Checkbox steps. TDD.

**Goal:** An autonomous buyer agent that, given a goal + budget + a service catalog, **decides** which seller services to call (capability/price/budget tradeoff), iterates on results, and stops — the 30%-agentic core. The decision policy is pure and unit-testable offline; the LLM is an injected adapter.

**Architecture:** Dependency-injected loop. `Chooser` decides the next action; `ExecuteCall` performs it. The loop owns budget/spend accounting, history, and stop conditions. A `deterministicChooser` (pure) is the testable fallback; `llmChooser` (Anthropic adapter) is the real brain. The loop never imports chain or LLM code — those are injected, so the whole orchestration is tested with mocks.

**Tech Stack:** TypeScript, viem types (for `Service`), `@anthropic-ai/sdk` (only in `llm.ts`). Model configurable via `OBOL_MODEL` (default `claude-sonnet-4-6`). Key from `~/.claude-apis.env` (`ANTHROPIC_API_KEY`).

## File structure
| File | Responsibility |
|---|---|
| `obol/src/catalog.ts` | `Service` + `Catalog` types; `affordable()` filter. |
| `obol/src/decide.ts` | `Decision`, `AgentState`, `Chooser` interface, `deterministicChooser` (pure). |
| `obol/src/agent.ts` | `runBuyer` loop — DI `Chooser` + `ExecuteCall`; budget/stop/history. |
| `obol/src/llm.ts` | `llmChooser` — Anthropic-backed `Chooser` (structured JSON decision). |
| `obol/test/decide.test.ts` | deterministicChooser + affordable (pure, offline). |
| `obol/test/agent.test.ts` | runBuyer with mock chooser + mock execute (offline). |

## Interfaces (locked)
```ts
// catalog.ts
export type Service = { name: string; capability: string; endpointId: `0x${string}`; priceWei: bigint; sellerUrl: string };
export type Catalog = Service[];
export function affordable(c: Catalog, remainingWei: bigint): Catalog;

// decide.ts
export type Decision =
  | { action: "call"; service: Service; input: unknown; reason: string }
  | { action: "stop"; reason: string };
export type HistoryItem = { service: string; input: unknown; result: unknown; costWei: bigint };
export type AgentState = { goal: string; budgetWei: bigint; spentWei: bigint; history: HistoryItem[] };
export interface Chooser { decide(state: AgentState, catalog: Catalog): Promise<Decision>; }
export function deterministicChooser(): Chooser;

// agent.ts
export type ExecuteCall = (service: Service, input: unknown) => Promise<{ result: unknown; costWei: bigint }>;
export function runBuyer(opts: {
  goal: string; budgetWei: bigint; catalog: Catalog;
  chooser: Chooser; execute: ExecuteCall; maxSteps?: number;
}): Promise<AgentState>;
```

## Tasks (TDD)
1. **catalog.ts + affordable** — test: filters out services priced above remaining budget. Commit.
2. **decide.ts deterministicChooser** — tests: picks cheapest affordable service whose capability keyword-matches the goal; skips already-used services; returns `stop` when none affordable/match. Commit.
3. **agent.ts runBuyer** — tests (mock chooser + mock execute): records history + spend; stops on `stop`; stops when budget can't afford the chosen call; respects `maxSteps`. Commit.
4. **llm.ts llmChooser** — Anthropic adapter returning a `Decision` from structured JSON; defensive parse + fallback to deterministic on malformed output. Light test behind `LLM_LIVE=1`. Commit.

## Self-review
- Coverage: spec §3.3 buyer loop = Tasks 1-3 (offline-tested) + Task 4 (LLM). Decompose/reassess live inside the chooser's prompt (Task 4) and the loop's history feedback (Task 3).
- No placeholders; interfaces above are referenced verbatim by every task.
- Type consistency: `Service/Catalog/Decision/AgentState/Chooser/ExecuteCall` identical across files.
