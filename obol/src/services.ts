// The three seller micro-services. Each is a pure-ish function with injectable
// side-effects (fetch / price source) so it is deterministic and unit-testable.
// Sellers (src/sellers.ts) wrap these as paid PayPerCall endpoints.

export type SummarizeInput = { url?: string; text?: string; maxSentences?: number };
export type SummarizeOutput = { summary: string; sourceChars: number };

/** Naive extractive summary: first N sentences of fetched/url-or-given text. */
export async function summarize(
  input: SummarizeInput,
  fetchImpl: typeof fetch = fetch,
): Promise<SummarizeOutput> {
  let text = input.text ?? "";
  if (!text && input.url) {
    const res = await fetchImpl(input.url);
    text = await res.text();
    text = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); // strip tags/whitespace
  }
  const n = input.maxSentences ?? 2;
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, n);
  return { summary: sentences.join(" "), sourceChars: text.length };
}

export type ClassifyInput = { text: string };
export type ClassifyOutput = { label: "positive" | "negative" | "neutral"; score: number };

const POS = new Set(["good", "great", "love", "excellent", "amazing", "win", "up", "bullish", "happy", "best"]);
const NEG = new Set(["bad", "terrible", "hate", "awful", "loss", "down", "bearish", "sad", "worst", "scam"]);

/** Lexicon sentiment: net (pos-neg) over tokens. Deterministic, offline. */
export function classify(input: ClassifyInput): ClassifyOutput {
  const toks = (input.text.toLowerCase().match(/[a-z]+/g) ?? []);
  let score = 0;
  for (const t of toks) {
    if (POS.has(t)) score += 1;
    if (NEG.has(t)) score -= 1;
  }
  const label = score > 0 ? "positive" : score < 0 ? "negative" : "neutral";
  return { label, score };
}

export type PriceInput = { symbol: string };
export type PriceOutput = { symbol: string; priceUsd: number | null };
export type PriceSource = (symbol: string) => Promise<number | null>;

const STATIC_PRICES: Record<string, number> = { BTC: 64000, ETH: 3200, USDC: 1, ARC: 1 };

/** Default price source: static map (deterministic). Swap for a live API in prod. */
export const staticPriceSource: PriceSource = async (symbol) =>
  STATIC_PRICES[symbol.toUpperCase()] ?? null;

export async function priceLookup(
  input: PriceInput,
  source: PriceSource = staticPriceSource,
): Promise<PriceOutput> {
  const priceUsd = await source(input.symbol);
  return { symbol: input.symbol.toUpperCase(), priceUsd };
}
