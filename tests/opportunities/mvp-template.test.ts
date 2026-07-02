import { describe, expect, it } from "vitest";
import { getRecommendedMvp, getTargetUsers } from "../../src/opportunities/mvp-template.js";

describe("getRecommendedMvp", () => {
  it("returns the fixed template text for each category", () => {
    expect(getRecommendedMvp("pricing-complaint")).toContain("lower-cost alternative");
    expect(getRecommendedMvp("missing-capability")).toContain("minimal tool");
    expect(getRecommendedMvp("feature-request")).toContain("most-requested feature");
    expect(getRecommendedMvp("workflow-friction")).toContain("streamlined workflow tool");
    expect(getRecommendedMvp("bug")).toContain("Not a new-product opportunity");
    expect(getRecommendedMvp("migration")).toContain("migration-friendly alternative");
    expect(getRecommendedMvp("looking-for-alternative")).toContain("direct alternative product");
    expect(getRecommendedMvp("buying-intent")).toContain("paid product or paid tier");
    expect(getRecommendedMvp("complaint")).toContain("Unclear MVP shape");
    expect(getRecommendedMvp("praise")).toContain("Not a build opportunity");
    expect(getRecommendedMvp("trend")).toContain("rising-mention trend");
    expect(getRecommendedMvp("other")).toContain("Insufficient category signal");
  });

  it("returns a deterministic, identical string across repeated calls", () => {
    expect(getRecommendedMvp("bug")).toBe(getRecommendedMvp("bug"));
  });
});

describe("getTargetUsers", () => {
  it("interpolates the source id and category with hyphens replaced by spaces", () => {
    const result = getTargetUsers("workflow-friction", "reddit");
    expect(result).toBe(
      "People active on reddit discussing workflow friction — evidence-derived, not a demographic profile.",
    );
  });
});
