// The real buyer brain: an Anthropic-backed Chooser. Given the goal, remaining
// budget, history, and the affordable services, Claude decides the next action.
//
// Safety net: ANY failure (no key, API error, malformed output, unknown/unaffordable
// service) falls back to the deterministic policy, so the agent never stalls.

import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Catalog } from "./catalog.ts";
import { affordable } from "./catalog.ts";
import { deterministicChooser, type AgentState, type Chooser, type Decision } from "./decide.ts";

const DEFAULT_MODEL = process.env.OBOL_MODEL ?? "claude-sonnet-4-6";

/** Find the API key in env, else in ~/.claude-apis.env. Returns "" if absent. */
export function loadApiKey(): string {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  try {
    const env = readFileSync(join(homedir(), ".claude-apis.env"), "utf8");
    const m = env.match(/^ANTHROPIC_API_KEY\s*=\s*(.+)$/m);
    if (m) return m[1]!.trim().replace(/^["']|["']$/g, "");
  } catch {
    /* file may not exist */
  }
  return "";
}

function buildPrompt(state: AgentState, options: Catalog): string {
  const remaining = state.budgetWei - state.spentWei;
  const services = options.map((s) => ({
    name: s.name,
    capability: s.capability,
    priceWei: s.priceWei.toString(),
  }));
  const history = state.history.map((h) => ({
    service: h.service,
    costWei: h.costWei.toString(),
    result: h.result,
  }));
  return [
    `You are an autonomous buyer agent spending a real USDC budget on Arc.`,
    `GOAL: ${state.goal}`,
    `REMAINING BUDGET (wei): ${remaining.toString()}`,
    `WORK SO FAR: ${JSON.stringify(history)}`,
    `AVAILABLE SERVICES (you may only choose one of these by exact name): ${JSON.stringify(services)}`,
    ``,
    `Decide the single next action. Reply with ONLY a JSON object, no prose, no markdown:`,
    `  {"action":"call","service":"<exact service name>","input":<json input for that service>,"reason":"<why>"}`,
    `or`,
    `  {"action":"stop","reason":"<why you are done or cannot usefully continue>"}`,
    `Stop when the goal is met, nothing left is worth its price, or no service helps.`,
  ].join("\n");
}

export function parseDecision(text: string, options: Catalog): Decision | null {
  let raw = text.trim();
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) raw = fence[1]!.trim();
  let obj: unknown;
  try {
    obj = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!obj || typeof obj !== "object") return null;
  const o = obj as Record<string, unknown>;
  if (o.action === "stop") return { action: "stop", reason: String(o.reason ?? "stopped") };
  if (o.action === "call") {
    const service = options.find((s) => s.name === o.service);
    if (!service) return null; // hallucinated/unaffordable service -> trigger fallback
    return { action: "call", service, input: o.input ?? { goal: "" }, reason: String(o.reason ?? "call") };
  }
  return null;
}

export function llmChooser(opts: { apiKey?: string; model?: string } = {}): Chooser {
  const apiKey = opts.apiKey ?? loadApiKey();
  const model = opts.model ?? DEFAULT_MODEL;
  const fallback = deterministicChooser();
  const client = apiKey ? new Anthropic({ apiKey }) : null;

  return {
    async decide(state, catalog) {
      const options = affordable(catalog, state.budgetWei - state.spentWei).filter(
        (s) => !state.history.some((h) => h.service === s.name),
      );
      if (!client || options.length === 0) return fallback.decide(state, catalog);

      try {
        const res = await client.messages.create({
          model,
          max_tokens: 512,
          messages: [{ role: "user", content: buildPrompt(state, options) }],
        });
        const text = res.content
          .filter((b): b is Anthropic.TextBlock => b.type === "text")
          .map((b) => b.text)
          .join("");
        const decision = parseDecision(text, options);
        return decision ?? (await fallback.decide(state, catalog));
      } catch {
        return fallback.decide(state, catalog);
      }
    },
  };
}
