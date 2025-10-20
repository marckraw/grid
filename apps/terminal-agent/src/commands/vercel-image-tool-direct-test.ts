import "dotenv/config";
import { generateText, stepCountIs, type ModelMessage } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createImageTool } from "@mrck-labs/grid-core";

async function main(): Promise<void> {
  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is not set in environment");
    process.exit(1);
  }

  const tools = [createImageTool.withExecute];

  const messages: ModelMessage[] = [
    {
      role: "user",
      content:
        "Generate a 512x512 image of a neon cyberpunk hummingbird in flight. Use the create_image tool. Use whichModelToUse='openai' and include tags ['test','sdk'].",
    },
  ];

  console.log("Starting generateText with create_image tool...\n");

  const result = await generateText({
    model: openai("gpt-4o-mini"),
    system:
      "You can call tools. If the user asks for an image, you must call the create_image tool with appropriate arguments.",
    messages,
    tools: tools as any,
    // Allow a few steps so the tool can be called and resolved
    stopWhen: stepCountIs(5),
    prepareStep: async ({ stepNumber, steps }) => {
      console.log(`\n[prepareStep] step ${stepNumber}`);
      console.log(JSON.stringify(steps, null, 2));
      for (const step of steps) {
        for (const item of step.content) {
          if ((item as any).type === "tool-call") {
            console.log("[tool-start]", JSON.stringify(item));
          }
          if ((item as any).type === "tool-result") {
            console.log("[tool-finish]", JSON.stringify(item));
          }
        }
      }
      return {};
    },
    onStepFinish: (step) => {
      console.log("[onStepFinish] step finished");
      for (const item of step.content) {
        if ((item as any).type === "tool-call") {
          console.log("[onStepFinish tool-call]", JSON.stringify(item));
        }
        if ((item as any).type === "tool-result") {
          console.log("[onStepFinish tool-result]", JSON.stringify(item));
        }
      }
    },
  });

  console.log("\nFinal text:\n", result.text);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
