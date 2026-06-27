import type { AgentCategory } from "../constants/categories.js";
import type { BlueprintTemplate } from "../types/blueprint.js";
import { engineeringTemplate } from "./engineering.js";
import { planningTemplate } from "./planning.js";
import { documentationTemplate } from "./documentation.js";
import { reviewTemplate } from "./review.js";
import { qaTemplate } from "./qa.js";
import { devopsTemplate } from "./devops.js";
import { researchTemplate } from "./research.js";
import { architectureTemplate } from "./architecture.js";

const TEMPLATES_BY_CATEGORY: Record<AgentCategory, BlueprintTemplate> = {
  engineering: engineeringTemplate,
  planning: planningTemplate,
  documentation: documentationTemplate,
  review: reviewTemplate,
  qa: qaTemplate,
  devops: devopsTemplate,
  research: researchTemplate,
  architecture: architectureTemplate,
};

export function getTemplate(category: AgentCategory): BlueprintTemplate {
  return TEMPLATES_BY_CATEGORY[category];
}

export function listTemplates(): readonly BlueprintTemplate[] {
  return Object.values(TEMPLATES_BY_CATEGORY);
}

export function getTemplateByName(name: string): BlueprintTemplate | undefined {
  return listTemplates().find((template) => template.templateName === name);
}
