import path from "node:path";
import { Command } from "commander";
import { PATHS } from "../../constants/paths.js";
import { readTextFile } from "../../utils/fs.js";
import { parseGeneratedAgentFile } from "../../validator/parse.js";
import { validateGeneratedAgent } from "../../validator/runValidation.js";
import { failWith, stdout } from "../output.js";

export const validateCommand = new Command("validate")
  .description("Validate an on-disk generated agent Markdown file")
  .argument("<agent>", "Path to a .claude/agents/<name>.md file")
  .action(async (agentPath: string) => {
    const absolute = path.isAbsolute(agentPath) ? agentPath : path.resolve(agentPath);
    const raw = await readTextFile(absolute);
    const candidate = parseGeneratedAgentFile(absolute, raw);

    const report = await validateGeneratedAgent(candidate);
    if (!report.valid) {
      failWith(report);
    }

    if (report.issues.length === 0) {
      stdout(`OK ${path.relative(PATHS.root, absolute)} (${candidate.frontmatter.name})`);
    } else {
      stdout(`OK with warnings: ${path.relative(PATHS.root, absolute)}`);
      for (const issue of report.issues) {
        stdout(`  [${issue.severity.toUpperCase()}] ${issue.code}: ${issue.message}`);
      }
    }
  });
