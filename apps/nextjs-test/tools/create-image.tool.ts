import { z } from "zod";
import { createNamedTool } from "@mrck-labs/grid-core";

/**
 * Create image tool
 */
export const createImageTool = createNamedTool({
  name: "create_image",
  description: "use this to create/generate an image.",
  inputSchema: z.object({
    reasoningText: z
      .string()
      .describe("Why did you pick this tool to generate the image?"),
    prompt: z
      .string()
      .describe(
        "prompt for the image. Be sure to consider the user's original message when making the prompt. If you are unsure, then as the user to provide more details."
      ),
    whichModelToUse: z
      .enum(["openai", "leonardo"])
      .describe(
        "Which model to use to generate the image. If the user didn't mention which model to use, you must ask which one they want to use: openai, or leonardo. Make sure to look at the whole conversation history before making your choice."
      ),
    tags: z
      .array(z.string())
      .optional()
      .describe("Optional tags to associate with the generated image"),
  }),
  execute: async ({ reasoningText, prompt, whichModelToUse, tags }) => {
    // This is a demo tool - in a real implementation, you would integrate with actual image generation services
    const timestamp = new Date().toISOString();
    const imageTags = tags || ["ai-generated", whichModelToUse, "demo"];

    if (whichModelToUse === "openai") {
      return {
        message: `Image would be generated using OpenAI with prompt: "${prompt}"`,
        model: "dall-e-3",
        reasoningText,
        prompt,
        tags: imageTags,
        timestamp,
        demoUrl: `https://example.com/demo-image-openai-${Date.now()}.png`,
        note: "This is a demo response. In production, this would generate an actual image using OpenAI's API.",
      };
    } else if (whichModelToUse === "leonardo") {
      return {
        message: `Image would be generated using Leonardo AI with prompt: "${prompt}"`,
        model: "leonardo-diffusion",
        reasoningText,
        prompt,
        tags: imageTags,
        timestamp,
        demoUrl: `https://example.com/demo-image-leonardo-${Date.now()}.png`,
        note: "This is a demo response. In production, this would generate an actual image using Leonardo AI's API.",
      };
    } else {
      return {
        error: "No model selected",
        availableModels: ["openai", "leonardo"],
        timestamp,
      };
    }
  },
});