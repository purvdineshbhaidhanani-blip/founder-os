import type { RawResearchItem } from "../research/types.js";
import type { PricingSignal } from "./types.js";

const PRICE_PATTERN = /\$\s?(\d+(?:\.\d{1,2})?)/g;
const MIN_REASONABLE_PRICE = 1;
const MAX_REASONABLE_PRICE = 10000;

function blobOf(item: RawResearchItem): string {
  return `${item.title} ${item.body ?? ""}`;
}

/**
 * Extracts dollar-amount mentions from evidence as a pricing signal.
 * Deterministic regex extraction, no LLM call — the suggested price is
 * evidence-derived, never market-validated.
 */
export function extractPricingSignal(items: RawResearchItem[]): PricingSignal {
  const prices = new Set<number>();

  for (const item of items) {
    const blob = blobOf(item);
    const regex = new RegExp(PRICE_PATTERN.source, PRICE_PATTERN.flags);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(blob)) !== null) {
      const value = Number.parseFloat(match[1] ?? "");
      if (Number.isNaN(value)) continue;
      if (value < MIN_REASONABLE_PRICE || value > MAX_REASONABLE_PRICE) continue;
      prices.add(value);
    }
  }

  const extractedPrices = [...prices].sort((a, b) => a - b);

  if (extractedPrices.length === 0) {
    return {
      extractedPrices,
      suggestedPriceText: "No price data mentioned in evidence — pricing requires primary research before launch.",
    };
  }

  const lowest = extractedPrices[0]!;
  const suggestion = Math.floor(lowest * 0.8);

  return {
    extractedPrices,
    suggestedPriceText: `Evidence mentions prices as low as $${lowest}. Consider testing a price point under $${suggestion} to undercut the cited pain point. This is evidence-derived, not a market-validated price.`,
  };
}
