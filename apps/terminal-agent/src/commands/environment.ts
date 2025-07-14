import * as p from "@clack/prompts";
import color from "picocolors";
import { config, displayConfigStatus, getActiveProvider } from "../config/index.js";
import { existsSync } from "fs";
import { join } from "path";

export async function viewEnvironment(): Promise<void> {
  p.note(
    "View and manage your environment configuration for API keys and settings.",
    "Environment Configuration"
  );

  // Display current configuration
  displayConfigStatus();

  // Show active provider
  const provider = getActiveProvider();
  if (provider) {
    p.log.success(color.green(`✓ Active API Provider: ${provider}`));
  } else {
    p.log.warn(color.yellow("⚠️  No API provider configured"));
  }

  // Check for .env file
  const envPath = join(process.cwd(), ".env");
  const envExists = existsSync(envPath);
  
  if (!envExists) {
    p.log.info(color.blue("\n📝 To configure API keys:"));
    p.log.message("1. Copy .env.example to .env");
    p.log.message("2. Add your API keys to the .env file");
    p.log.message("3. Restart the terminal agent");
    
    const createEnv = await p.confirm({
      message: "Would you like to create a .env file from the template?",
      initialValue: true,
    });
    
    if (createEnv && !p.isCancel(createEnv)) {
      const { copyFileSync } = await import("fs");
      const examplePath = join(process.cwd(), ".env.example");
      
      try {
        copyFileSync(examplePath, envPath);
        p.log.success(color.green("✓ Created .env file from template"));
        p.note(
          `Please edit ${envPath} and add your API keys.\nThen restart the terminal agent.`,
          "Next Steps"
        );
      } catch (error) {
        p.log.error(color.red("Failed to create .env file"));
        if (error instanceof Error) {
          p.log.error(color.dim(error.message));
        }
      }
    }
  } else {
    p.log.info(color.blue("\n📁 Environment file: ") + color.dim(envPath));
  }

  // Show tips for getting API keys
  const showTips = await p.confirm({
    message: "Would you like tips on getting API keys?",
    initialValue: false,
  });
  
  if (showTips && !p.isCancel(showTips)) {
    p.note(
      `Getting API Keys:

OpenAI:
1. Go to https://platform.openai.com/api-keys
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key to your .env file

Anthropic:
1. Go to https://console.anthropic.com/
2. Sign in or create an account
3. Navigate to API keys section
4. Create and copy your key

Grid API:
Contact your Grid administrator or visit the Grid documentation.`,
      "API Key Setup Guide"
    );
  }
}