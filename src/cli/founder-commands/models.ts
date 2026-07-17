import { Command } from "commander";
import { loadFounderConfig } from "../../settings/founder-config.js";
import { OllamaProvider } from "../../llm/ollama-provider.js";
import { composeFounderRuntime } from "../founder-runtime.js";
import { stdout } from "../output.js";

export const modelsCommand = new Command("models")
  .description("List locally installed Ollama models and the configured model aliases")
  .action(async () => {
    const { config } = loadFounderConfig();
    const runtime = composeFounderRuntime(config);
    const provider = runtime.llm.getProvider("ollama");

    stdout(`Default model: ${config.defaultModel}`);
    stdout(
      Object.keys(config.modelAliases).length > 0
        ? `Configured aliases: ${Object.entries(config.modelAliases).map(([k, v]) => `${k}->${v}`).join(", ")}`
        : "Configured aliases: (none — set FOUNDER_MODEL_ALIASES to add some)",
    );

    if (!(provider instanceof OllamaProvider)) return;
    const available = await provider.isAvailable();
    if (!available) {
      stdout(`\nOllama daemon unreachable at ${config.ollamaHost} — run 'ollama serve' to see installed models.`);
      return;
    }
    const models = await provider.listModels();
    stdout(models.length > 0 ? `\nInstalled models:\n${models.map((m) => `  ${m}`).join("\n")}` : "\nNo models installed — run 'ollama pull <model>'.");
  });
