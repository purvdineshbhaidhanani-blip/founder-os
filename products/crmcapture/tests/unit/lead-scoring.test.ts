import { describe, expect, it } from "vitest";
import { computeLeadScore } from "../../lib/services/lead-scoring.js";

describe("computeLeadScore", () => {
  it("scores a bare manual lead at the source weight only", () => {
    expect(computeLeadScore({ source: "manual", hasCompany: false, hasJobTitle: false, hasPhone: false })).toBe(5);
  });

  it("adds points for company, job title, and phone", () => {
    expect(computeLeadScore({ source: "email", hasCompany: true, hasJobTitle: true, hasPhone: true })).toBe(15 + 20 + 10 + 15);
  });

  it("adds a senior-title bonus for executive job titles", () => {
    const score = computeLeadScore({ source: "web_form", hasCompany: true, hasJobTitle: true, hasPhone: false }, "VP of Engineering");
    expect(score).toBe(25 + 20 + 10 + 30);
  });

  it("does not add the senior-title bonus for a non-senior title", () => {
    const score = computeLeadScore({ source: "web_form", hasCompany: true, hasJobTitle: true, hasPhone: false }, "Software Engineer");
    expect(score).toBe(25 + 20 + 10);
  });

  it("caps the score at 100", () => {
    const score = computeLeadScore({ source: "web_form", hasCompany: true, hasJobTitle: true, hasPhone: true }, "Chief Executive Officer");
    expect(score).toBe(100);
  });
});
