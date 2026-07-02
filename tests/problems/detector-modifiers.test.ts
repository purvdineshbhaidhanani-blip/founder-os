import { describe, expect, it } from "vitest";
import { computeEmotionalIntensity, detectUrgency } from "../../src/problems/detector.js";

/**
 * Dedicated tests for the two non-category, informational detectors:
 * `detectUrgency` (boolean) and `computeEmotionalIntensity` (0/0.3/0.55/0.8
 * tiered, same matchCount tiering as category confidence). These never form
 * their own ProblemCategory/cluster — they ride along on every
 * ClassifiedItem via `classifyItem`, tested separately here against the
 * functions directly.
 */
describe("detectUrgency", () => {
  const urgentCases: Array<{ text: string; note?: string }> = [
    { text: "We need this today, our launch is blocked without it." },
    { text: "This is ASAP, please help immediately." },
    { text: "This is a critical outage affecting all customers." },
    { text: "This bug is blocking our team from shipping the release." },
    { text: "We can't ship until this is fixed, it's urgent." },
    { text: "We cant ship this week because of this issue, please prioritize." },
    { text: "Must fix before Monday, this is a critical launch blocker." },
    { text: "Need this today, our client demo is in two hours." },
    { text: "This is asap, the whole team is stuck." },
    { text: "Critical bug found in production, needs immediate attention." },
    { text: "It's blocking our team from closing the sprint." },
    { text: "We must fix this before the client call tomorrow." },
  ];

  for (const { text } of urgentCases) {
    it(`detects urgency: "${text}"`, () => {
      expect(detectUrgency(text)).toBe(true);
    });
  }

  const nonUrgentCases: string[] = [
    "Just a general thought about the roadmap for next year.",
    "No rush on this, whenever you get a chance is fine.",
    "I really love this feature, thanks for building it.",
  ];

  for (const text of nonUrgentCases) {
    it(`does not flag as urgent: "${text}"`, () => {
      expect(detectUrgency(text)).toBe(false);
    });
  }

  it("is case-insensitive", () => {
    expect(detectUrgency("THIS IS CRITICAL, WE CANNOT WAIT.")).toBe(true);
    expect(detectUrgency("This Is ASAP")).toBe(true);
  });

  it("handles empty and unrelated text without throwing", () => {
    expect(detectUrgency("")).toBe(false);
    expect(detectUrgency("A calm, low-key update on the roadmap for next quarter.")).toBe(false);
  });
});

describe("computeEmotionalIntensity", () => {
  const singleMatchCases: string[] = [
    "I'm exhausted from dealing with this every single day.",
    "Im exhausted, this has been a nightmare all week.",
    "I'm frustrated beyond words at this point.",
    "Im frustrated with the lack of progress on this bug.",
    "This drives me crazy every time it happens.",
    "I'm tired of asking for the same fix over and over.",
    "Im tired of waiting for a response from support.",
    "I've given up trying to get this to work properly.",
    "Ive given up on this tool entirely at this point.",
  ];

  for (const text of singleMatchCases) {
    it(`scores 0.3 for a single distinct pattern match: "${text}"`, () => {
      expect(computeEmotionalIntensity(text)).toBe(0.3);
    });
  }

  it("scores 0.55 for two distinct pattern matches", () => {
    const text = "I hate this, it's exhausting and frustrating every day, I've given up.";
    expect(computeEmotionalIntensity(text)).toBe(0.55);
  });

  it("scores 0.8 for three or more distinct pattern matches", () => {
    const text = "I'm exhausted and frustrated and it drives me crazy every day, I've given up hope.";
    expect(computeEmotionalIntensity(text)).toBe(0.8);
  });

  it("scores 0.8 for three or more distinct pattern matches regardless of casing", () => {
    const text = "im exhausted, im frustrated, and honestly ive given up trying.";
    expect(computeEmotionalIntensity(text)).toBe(0.8);
  });

  it("scores 0 when no emotional-intensity pattern matches", () => {
    expect(computeEmotionalIntensity("Just a neutral note about the release schedule.")).toBe(0);
    expect(computeEmotionalIntensity("This is fine, nothing to report today.")).toBe(0);
    expect(computeEmotionalIntensity("A calm, low-key update on the roadmap for next quarter.")).toBe(0);
  });

  it("handles empty text without throwing", () => {
    expect(computeEmotionalIntensity("")).toBe(0);
  });

  it("counts distinct patterns, not repeated occurrences of the same pattern", () => {
    // "asap"-style repetition test analog: repeating the SAME phrase twice
    // must not double the matchCount, since matchCount counts distinct
    // patterns filtered from the fixed list, not occurrences.
    const text = "I'm exhausted, I'm exhausted, I'm exhausted about this.";
    expect(computeEmotionalIntensity(text)).toBe(0.3);
  });
});
