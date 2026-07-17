import { Command } from "commander";
import { FACTORY_VERSION } from "../../constants/factory.js";
import { stdout } from "../output.js";

export const versionCommand = new Command("version")
  .description("Print the Founder OS version")
  .action(() => {
    stdout(`Founder OS v${FACTORY_VERSION}`);
  });
