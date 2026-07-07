export interface ReportSection {
  title: string;
  compute: () => Promise<unknown> | unknown;
}

export interface ReportDefinition {
  id: string;
  title: string;
  sections: ReportSection[];
}

export interface ReportSectionResult {
  title: string;
  value: unknown;
  error?: string;
}

export interface Report {
  id: string;
  title: string;
  generatedAt: string;
  sections: ReportSectionResult[];
}

/** Generates a structured report by computing each section's value independently. */
export class ReportGenerator {
  async generate(definition: ReportDefinition): Promise<Report> {
    const sections = await Promise.all(
      definition.sections.map(async (section): Promise<ReportSectionResult> => {
        try {
          return { title: section.title, value: await section.compute() };
        } catch (error) {
          return {
            title: section.title,
            value: null,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }),
    );
    return { id: definition.id, title: definition.title, generatedAt: new Date().toISOString(), sections };
  }
}
