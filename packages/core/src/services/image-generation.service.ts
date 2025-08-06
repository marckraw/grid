export interface CreateImageGenerationServiceConfig {
  env?: {};
}

export interface LeoardoImageGenerationOptions {
  prompt: string;
  negative_prompt?: string;
  width?: number;
  height?: number;
  num_images?: number;
  num_inference_steps?: number;
  guidance_scale?: number;
  modelId?: string;
}

export interface LeonardoImageResponse {
  imageUrl: string;
  generationId: string;
}

export const createImageGenerationService = (
  config: CreateImageGenerationServiceConfig = {}
) => {
  const defaultEnv = {
    LEONARDO_API_KEY: process.env.LEONARDO_API_KEY || "",
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  };

  const mergedConfig = {
    env: { ...defaultEnv, ...config.env },
  };

  const { env } = mergedConfig;

  console.log("These are current configs to use: ");
  console.log(env);

  // Public methods
  const generateImage = async (
    options: LeoardoImageGenerationOptions
  ): Promise<LeonardoImageResponse> => {
    try {
      //   const response = await leonardoImageGenerator.createImageWithLeonardo({
      //     prompt: options.prompt,
      //     // @ts-ignore
      //     negative_prompt: options.negative_prompt || "",
      //     nsfw: true,
      //     num_images: options.num_images || 1,
      //     width: options.width || 1280,
      //     height: options.height || 1920,
      //     num_inference_steps: options.num_inference_steps || 10,
      //     contrast: 3.5,
      //     guidance_scale: options.guidance_scale || 15,
      //     sd_version: "PHOENIX",
      //     modelId: options.modelId || "6b645e3a-d64f-4341-a6d8-7a3690fbf042",
      //     presetStyle: "LEONARDO",
      //     scheduler: "LEONARDO",
      //     public: false,
      //     tiling: false,
      //     alchemy: true,
      //     highResolution: false,
      //     contrastRatio: 0.5,
      //     weighting: 0.75,
      //     highContrast: false,
      //     expandedDomain: false,
      //     photoReal: false,
      //     transparency: "disabled",
      //     styleUUID: "a5632c7c-ddbb-4e2f-ba34-8456ab3ac436",
      //     enhancePrompt: false,
      //     ultra: false,
      //   });

      const finalResponse = {
        // @ts-ignore
        imageUrl:
          "https://api.leonardo.ai/images/6b645e3a-d64f-4341-a6d8-7a3690fbf042/6b645e3a-d64f-4341-a6d8-7a3690fbf042",
        // @ts-ignore
        generationId: "6b645e3a-d64f-4341-a6d8-7a3690fbf042",
      };
      //   const final {
      //             // @ts-ignore
      //             imageUrl: response.imageUrl,
      //             // @ts-ignore
      //             generationId: response.generationId,
      //   }

      return finalResponse;
    } catch (error) {
      console.error("Error generating image with leonardo:", error);
      throw error;
    }
  };

  const generateImageWithLeonardo = generateImage;

  const generateImageWithDallE3 = async (options: { prompt: string }) => {
    // const response = await dallEImageGenerator.createImage({
    //   prompt: options.prompt,
    //   n: 1,
    //   model: "dall-e-3",
    //   response_format: "url",
    //   quality: "hd",
    //   size: "1024x1024",
    //   style: "natural",
    // });

    // const revisedPrompt = response.data[0]?.revised_prompt;
    // const imageUrl = response.data[0]?.url;

    // This is mocked response right now
    const finalResponse = {
      // @ts-ignore
      revisedPrompt: "A beautiful sunset over a calm ocean",
      // @ts-ignore
      imageUrl:
        "https://api.leonardo.ai/images/6b645e3a-d64f-4341-a6d8-7a3690fbf042/6b645e3a-d64f-4341-a6d8-7a3690fbf042",
    };

    return finalResponse;
  };

  return {
    generateImage,
    generateImageWithLeonardo,
    generateImageWithDallE3,
  };
};

export type ImageGenerationService = ReturnType<
  typeof createImageGenerationService
>;
export const imageGenerationService = createImageGenerationService();
