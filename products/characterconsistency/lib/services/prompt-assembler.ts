export interface PromptAssemblyInput {
  characterName: string;
  faceDescription: string;
  hairDescription: string;
  outfitDescription: string;
  artStyle: string;
  distinguishingFeatures: string[];
  poseDescription: string;
  sceneDescription?: string;
}

/**
 * Deterministically assembles a locked, reusable prompt for a specific
 * pose/scene from a character's identity fields per
 * products/characterconsistency/docs/PRODUCT_IDENTITY.md §7 "Style
 * lock... Face consistency... Outfit consistency... Pose memory" — the
 * same character fields always produce the same base description, only
 * the pose/scene varies, which is exactly the "identity object reused,
 * not re-engineered every time" value proposition from §5.
 */
export function assemblePrompt(input: PromptAssemblyInput): string {
  const parts = [
    `${input.characterName}, ${input.faceDescription}, ${input.hairDescription}, wearing ${input.outfitDescription}`,
    input.distinguishingFeatures.length > 0 ? `distinguishing features: ${input.distinguishingFeatures.join(", ")}` : null,
    `pose: ${input.poseDescription}`,
    input.sceneDescription ? `scene: ${input.sceneDescription}` : null,
    `art style: ${input.artStyle}`,
  ].filter((part): part is string => Boolean(part));

  return parts.join(". ") + ".";
}
