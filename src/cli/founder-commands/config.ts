import { Command } from "commander";
import { loadFounderConfig } from "../../settings/founder-config.js";
import { stdout } from "../output.js";

export const configCommand = new Command("config")
  .description("Print the resolved Founder OS configuration and any validation issues")
  .option("--json", "Machine-readable JSON output")
  .action((opts: { json?: boolean }) => {
    const { config, issues, ok } = loadFounderConfig();
    if (opts.json) {
      stdout(JSON.stringify({ ok, config, issues }, null, 2));
      return;
    }
    stdout("Founder OS configuration (env -> validated, defaults applied for anything unset):\n");
    for (const [key, value] of Object.entries(config)) {
      stdout(`  ${key}: ${typeof value === "object" ? JSON.stringify(value) : value}`);
    }
    if (issues.length > 0) {
      stdout("\nIssues:");
      for (const issue of issues) stdout(`  ! ${issue.path}: ${issue.message}`);
    }
  });
