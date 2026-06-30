import type { BlueprintContext, CustomerPersona } from "./types.js";
import type { ContentCategory } from "../types.js";

// ---------------------------------------------------------------------------
// Customer Profiler
// Infers ICP from category, market size, pain signals, workarounds, WTP signal.
// ---------------------------------------------------------------------------

interface PersonaTemplate {
  name: string;
  jobTitles: string[];
  companySize: string;
  industryVerticals: string[];
}

const CATEGORY_PERSONA: Record<ContentCategory, PersonaTemplate> = {
  "ai": { name: "The AI-Forward Engineer", jobTitles: ["ML Engineer", "AI Product Manager", "Data Scientist", "CTO"], companySize: "10–500 employees", industryVerticals: ["Tech", "Finance", "Healthcare", "E-commerce"] },
  "automation": { name: "The Overloaded Ops Manager", jobTitles: ["Operations Manager", "RevOps Lead", "Business Analyst", "IT Director"], companySize: "50–500 employees", industryVerticals: ["SaaS", "E-commerce", "Logistics", "Finance"] },
  "developer-tools": { name: "The Frustrated Senior Engineer", jobTitles: ["Senior Engineer", "Staff Engineer", "Engineering Manager", "DevRel"], companySize: "10–1000 employees", industryVerticals: ["SaaS", "Fintech", "Developer tools"] },
  "saas": { name: "The Growth-Stage SaaS Operator", jobTitles: ["Head of Growth", "Product Manager", "COO", "CTO"], companySize: "20–200 employees", industryVerticals: ["B2B SaaS", "Marketplace", "Platform"] },
  "productivity": { name: "The Knowledge Worker at Scale", jobTitles: ["Project Manager", "Team Lead", "Operations Manager", "Chief of Staff"], companySize: "50–5000 employees", industryVerticals: ["Consulting", "Agency", "Enterprise", "SaaS"] },
  "devops": { name: "The Stretched DevOps Lead", jobTitles: ["DevOps Engineer", "Platform Engineer", "SRE", "Infrastructure Lead"], companySize: "20–500 employees", industryVerticals: ["SaaS", "Fintech", "Enterprise"] },
  "cloud": { name: "The Cost-Conscious Cloud Architect", jobTitles: ["Cloud Architect", "VP Engineering", "CTO", "FinOps Engineer"], companySize: "50–2000 employees", industryVerticals: ["Enterprise", "SaaS", "Media", "Retail"] },
  "apis": { name: "The Integration-Blocked Developer", jobTitles: ["Backend Engineer", "Integration Engineer", "Solution Architect"], companySize: "10–500 employees", industryVerticals: ["SaaS", "Fintech", "E-commerce"] },
  "no-code": { name: "The Non-Technical Founder", jobTitles: ["Founder", "Product Manager", "Marketing Director", "Operations Lead"], companySize: "1–50 employees", industryVerticals: ["Startup", "Agency", "SMB", "E-commerce"] },
  "low-code": { name: "The Citizen Developer", jobTitles: ["Business Analyst", "Operations Manager", "Product Owner"], companySize: "50–1000 employees", industryVerticals: ["Enterprise", "Consulting", "Insurance"] },
  "finance": { name: "The CFO Under Pressure", jobTitles: ["CFO", "Finance Manager", "Controller", "VP Finance"], companySize: "20–1000 employees", industryVerticals: ["SaaS", "E-commerce", "Professional Services"] },
  "hr": { name: "The CHRO Scaling Fast", jobTitles: ["CHRO", "HR Manager", "People Ops Lead", "Talent Director"], companySize: "50–500 employees", industryVerticals: ["SaaS", "Consulting", "Retail", "Healthcare"] },
  "sales": { name: "The VP Sales Chasing Quota", jobTitles: ["VP Sales", "Sales Manager", "AE", "RevOps Manager"], companySize: "20–500 employees", industryVerticals: ["B2B SaaS", "Enterprise", "Agency"] },
  "marketing": { name: "The CMO with Tight Budget", jobTitles: ["CMO", "Demand Gen Manager", "Growth Marketer", "Marketing Ops"], companySize: "20–500 employees", industryVerticals: ["SaaS", "E-commerce", "Agency"] },
  "enterprise": { name: "The Enterprise IT Director", jobTitles: ["IT Director", "CIO", "Enterprise Architect", "VP IT"], companySize: "1000+ employees", industryVerticals: ["Finance", "Healthcare", "Retail", "Manufacturing"] },
  "legal-tech": { name: "The Over-Billed In-House Counsel", jobTitles: ["General Counsel", "Legal Operations Manager", "Associate GC"], companySize: "50–2000 employees", industryVerticals: ["Finance", "Healthcare", "Technology", "Real Estate"] },
  "healthcare-tech": { name: "The Clinical Operations Director", jobTitles: ["CMO", "Clinical Ops Director", "Health IT Manager", "Practice Manager"], companySize: "10–500 employees", industryVerticals: ["Hospital Systems", "Digital Health", "Pharma"] },
  "cybersecurity": { name: "The CISO Stretched Thin", jobTitles: ["CISO", "Security Engineer", "IT Security Manager"], companySize: "100–5000 employees", industryVerticals: ["Finance", "Healthcare", "Government", "Enterprise"] },
  "construction-tech": { name: "The Field Operations Manager", jobTitles: ["Project Manager", "Construction Director", "Site Supervisor", "VDC Manager"], companySize: "50–500 employees", industryVerticals: ["General Contracting", "Architecture", "Real Estate Dev"] },
  "manufacturing": { name: "The Plant Operations Manager", jobTitles: ["Plant Manager", "Operations Director", "Production Manager", "Quality Manager"], companySize: "100–2000 employees", industryVerticals: ["Automotive", "Electronics", "Consumer Goods"] },
  "software": { name: "The Engineering Team Lead", jobTitles: ["Engineering Lead", "CTO", "Staff Engineer", "VP Engineering"], companySize: "10–500 employees", industryVerticals: ["SaaS", "Platform", "Marketplace"] },
  "business": { name: "The Scaling SMB Owner", jobTitles: ["CEO", "COO", "Operations Manager", "Business Owner"], companySize: "5–100 employees", industryVerticals: ["Services", "Retail", "Agency", "SaaS"] },
  "operations": { name: "The Ops Lead Drowning in Spreadsheets", jobTitles: ["Head of Ops", "Operations Manager", "COO", "Process Manager"], companySize: "20–500 employees", industryVerticals: ["SaaS", "E-commerce", "Logistics"] },
  "creator-economy": { name: "The Professional Creator", jobTitles: ["Content Creator", "Indie Founder", "Course Creator", "Consultant"], companySize: "1–20 employees", industryVerticals: ["Education", "Media", "Personal Brand"] },
  "professional-services": { name: "The Billable-Hours Partner", jobTitles: ["Partner", "Consultant", "Agency Owner", "Freelancer Lead"], companySize: "5–200 employees", industryVerticals: ["Consulting", "Agency", "Legal", "Accounting"] },
  "other": { name: "The Pragmatic Business User", jobTitles: ["Operations Manager", "Team Lead", "Business Analyst"], companySize: "10–500 employees", industryVerticals: ["Various"] },
};

export function buildCustomerProfile(ctx: BlueprintContext): CustomerPersona {
  const { intelligence: intel } = ctx;
  const template = CATEGORY_PERSONA[intel.category] ?? CATEGORY_PERSONA["other"]!;
  const timeSaved = intel.humanTimeSavedScore;
  const workarounds = intel.existingSolutionScore.workaroundCount;

  // Derive willingness to pay from annualised value saved
  const annualVal = timeSaved.annualisedValueUSD;
  let willingnessToPay: string;
  if (annualVal >= 20000) willingnessToPay = "$500–2000/mo (enterprise, high ROI)";
  else if (annualVal >= 8000) willingnessToPay = "$150–500/mo (growth tier)";
  else if (annualVal >= 3000) willingnessToPay = "$50–150/mo (starter)";
  else willingnessToPay = "$20–50/mo (prosumer / freemium)";

  // Pain points from evidence and signals
  const dailyPains: string[] = [
    intel.problem,
    ...intel.existingSolutionScore.solutionFailureSignals.slice(0, 3),
  ].filter(Boolean);

  // Current solution = workarounds
  const workaroundDescriptions = workarounds > 0
    ? `Manual workarounds (${workarounds} detected — e.g. spreadsheets, copy-paste, custom scripts)`
    : "Existing tools that partially solve the problem";

  const adoptionBarriers = [
    "Switching cost from current workflow",
    workarounds > 0 ? "Entrenched workaround habits" : "Satisfaction with status quo",
    intel.technicalFeasibilityScore.legalRiskLevel !== "low" ? "Compliance and security review required" : "Procurement process at larger companies",
    "Team buy-in required before rollout",
  ];

  return {
    name: template.name,
    jobTitles: template.jobTitles,
    companySize: template.companySize,
    industryVerticals: template.industryVerticals,
    dailyPains,
    currentSolution: workaroundDescriptions,
    willingnessToPay,
    adoptionBarriers,
  };
}
