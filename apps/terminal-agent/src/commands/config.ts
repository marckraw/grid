import * as p from "@clack/prompts";
import type { ConfigOptions } from "../types/index.js";

export async function configureGrid(): Promise<void> {
  const config = await p.group<ConfigOptions>({
    apiKey: async () => {
      const result = await p.text({
        message: "API Key:",
        placeholder: "Enter your API key",
        defaultValue: "test",
      });
      return p.isCancel(result) ? undefined : result;
    },
    baseUrl: async () => {
      const result = await p.text({
        message: "Base URL:",
        placeholder: "https://api.example.com",
        defaultValue: "https://api.grid.dev",
      });
      return p.isCancel(result) ? undefined : result;
    },
    timeout: async () => {
      const result = await p.text({
        message: "Timeout (ms):",
        placeholder: "30000",
        defaultValue: "30000",
      });
      return p.isCancel(result) ? undefined : result;
    },
  });

  if (p.isCancel(config)) {
    p.cancel("Configuration cancelled");
    return;
  }

  p.log.success("Configuration updated!");
  p.note(JSON.stringify(config, null, 2), "Current Configuration");
}