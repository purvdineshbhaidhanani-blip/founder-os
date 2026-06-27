import { Command } from "commander";
import { listTemplates } from "../../templates/registry.js";
import { stdout } from "../output.js";

export const templateCommand = new Command("template").description("Inspect the Template Library");

templateCommand
  .command("list")
  .description("List every available category template")
  .action(() => {
    for (const template of listTemplates()) {
      stdout(`${template.templateName.padEnd(28)} [${template.category}]  ${template.description}`);
    }
  });
