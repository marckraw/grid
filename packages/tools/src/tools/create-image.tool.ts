import { z } from "zod";
import { tool } from "ai";
import { GridTool } from "../types";
import { createOpenAIImageService } from "./services/openai-image.service.js";
import { writeFileSync } from "fs";
import { join } from "path";

/**
 * Create image tool
 */
export const toolDefinition = {
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
};

export const createImageToolWithoutExecute = tool(toolDefinition);

export const createImageToolWithExecute = tool({
  ...toolDefinition,
  execute: async ({ reasoningText, prompt, whichModelToUse, tags }) => {
    const timestamp = new Date().toISOString();
    const imageTags = tags || ["ai-generated", whichModelToUse, "demo"];

    console.log("[createImageTool] execute");

    if (whichModelToUse === "openai") {
      try {
        const openaiImageService = createOpenAIImageService({});
        const response = await openaiImageService.createImage(prompt);

        // Save the image to disk
        const outputDir = join(process.cwd(), "generated-images");
        const outputPath = join(outputDir, response.filename);

        // Create directory if it doesn't exist
        try {
          const { mkdirSync } = await import("fs");
          mkdirSync(outputDir, { recursive: true });
        } catch (error) {
          // Directory might already exist
        }

        // Write the image buffer to file
        writeFileSync(outputPath, response.image);

        const final = {
          message: `Image generated successfully using OpenAI`,
          model: "gpt-image-1",
          filename: response.filename,
          filepath: outputPath,
          size: response.image.length,
          mimeType: response.mimeType,
          extension: response.extension,
          success: true,
        };

        console.log("return this shit:");
        console.log(final);

        return final;
      } catch (error) {
        return {
          error: `Failed to generate image: ${
            error instanceof Error ? error.message : String(error)
          }`,
          model: "gpt-image-1",
          reasoningText,
          prompt,
          tags: imageTags,
          timestamp,
          success: false,
        };
      }
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

export const createImageTool: GridTool = {
  withExecute: createImageToolWithExecute,
  withoutExecute: createImageToolWithoutExecute,
  definition: toolDefinition,
};