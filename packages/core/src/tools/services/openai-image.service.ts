import { createOpenAI } from "@ai-sdk/openai";
import { experimental_generateImage as generateImage } from "ai";

export const createOpenAIImageService = ({ apiKey }: { apiKey?: string }) => {
  const openai = createOpenAI({
    apiKey: apiKey || process.env.OPENAI_API_KEY,
  });

  return {
    createImage: async (prompt: string) => {
      const response = await generateImage({
        model: openai.image("gpt-image-1"),
        size: "1024x1024",
        prompt,
      });

      const image_base64 = response.images[0].base64;
      if (!image_base64) {
        const error = "No image data returned from OpenAI";
        throw new Error(error);
      }

      // Get mimetype from response if available, otherwise default to PNG
      const mimeType = response.images[0].mimeType || "image/png";
      const extension = mimeType.split("/")[1] || "png";

      const buffer = Buffer.from(image_base64, "base64");
      const filename = `ai-image_openai_${Date.now()}.${extension}`;

      return {
        image: buffer,
        filename,
        mimeType,
        extension,
      };
    },
  };
};
