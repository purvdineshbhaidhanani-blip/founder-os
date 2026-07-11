import { describe, expect, it } from "vitest";
import { assemblePrompt } from "../../lib/services/prompt-assembler.js";

describe("assemblePrompt", () => {
  it("assembles a full prompt with all fields present", () => {
    const prompt = assemblePrompt({
      characterName: "Nova",
      faceDescription: "sharp jawline, freckles",
      hairDescription: "short blonde hair",
      outfitDescription: "a red leather jacket",
      artStyle: "cel-shaded anime",
      distinguishingFeatures: ["scar over left eyebrow"],
      poseDescription: "running through rain",
      sceneDescription: "a neon-lit city street at night",
    });
    expect(prompt).toContain("Nova");
    expect(prompt).toContain("short blonde hair");
    expect(prompt).toContain("a red leather jacket");
    expect(prompt).toContain("scar over left eyebrow");
    expect(prompt).toContain("running through rain");
    expect(prompt).toContain("neon-lit city street");
    expect(prompt).toContain("cel-shaded anime");
  });

  it("omits scene and distinguishing features sections when absent", () => {
    const prompt = assemblePrompt({
      characterName: "Nova",
      faceDescription: "sharp jawline",
      hairDescription: "short blonde hair",
      outfitDescription: "a jacket",
      artStyle: "anime",
      distinguishingFeatures: [],
      poseDescription: "standing",
    });
    expect(prompt).not.toContain("scene:");
    expect(prompt).not.toContain("distinguishing features:");
  });

  it("is deterministic for the same input", () => {
    const input = {
      characterName: "Nova",
      faceDescription: "sharp jawline",
      hairDescription: "short blonde hair",
      outfitDescription: "a jacket",
      artStyle: "anime",
      distinguishingFeatures: [],
      poseDescription: "standing",
    };
    expect(assemblePrompt(input)).toBe(assemblePrompt(input));
  });
});
