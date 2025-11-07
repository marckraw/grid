import type {
  VoiceService,
  VoiceOptions,
  TranscribeOptions,
  AudioResult,
  AudioInput,
  TranscriptionResult,
  Voice,
  AudioChunk,
  VoiceProgressEvent,
  AudioFormat,
} from "../types/voice.types.js";
import { VoiceError } from "../types/voice.types.js";

export interface BaseVoiceServiceConfig {
  apiKey?: string;
  defaultVoiceId?: string;
  defaultModel?: string;
  defaultOptions?: Partial<VoiceOptions>;
  baseUrl?: string;
  timeout?: number;
  onProgress?: (event: VoiceProgressEvent) => void;
}

/**
 * Voice service utilities for providers to use when implementing VoiceService
 */
export interface VoiceServiceUtils {
  mergeOptions: (options?: VoiceOptions) => VoiceOptions;
  emitProgress: (event: VoiceProgressEvent) => void;
  convertAudioFormat: (
    data: Buffer | ArrayBuffer | Uint8Array,
    fromFormat: AudioFormat,
    toFormat: AudioFormat
  ) => Promise<Buffer | ArrayBuffer>;
  validateAudioInput: (audio: AudioInput) => void;
  validateText: (text: string) => void;
  loadAudioFromPath: (filepath: string) => Promise<Buffer>;
  loadAudioFromUrl: (url: string) => Promise<ArrayBuffer>;
  decodeBase64: (base64: string) => ArrayBuffer;
  prepareAudioInput: (audio: AudioInput) => Promise<ArrayBuffer | Buffer>;
  rateLimit: () => Promise<void>;
}

/**
 * Base voice service with common utilities
 * This returns utilities that providers can use when implementing VoiceService
 */
export const baseVoiceService = (
  config: BaseVoiceServiceConfig = {}
): VoiceServiceUtils => {
  const {
    defaultVoiceId,
    defaultModel,
    defaultOptions = {},
    onProgress,
  } = config;

  // Rate limiting state
  let lastRequestTime = 0;
  const minRequestInterval = 100; // milliseconds

  // Utility methods
  const mergeOptions = (options?: VoiceOptions): VoiceOptions => {
    return {
      ...defaultOptions,
      ...options,
      voiceId: options?.voiceId || defaultVoiceId,
      model: options?.model || defaultModel,
    };
  };

  const emitProgress = (event: VoiceProgressEvent): void => {
    if (onProgress) {
      onProgress(event);
    }
  };

  const convertAudioFormat = async (
    data: Buffer | ArrayBuffer | Uint8Array,
    fromFormat: AudioFormat,
    toFormat: AudioFormat
  ): Promise<Buffer | ArrayBuffer> => {
    // Basic implementation - providers can override with actual conversion
    if (fromFormat === toFormat) {
      if (data instanceof Uint8Array) {
        return Buffer.from(data);
      }
      return data;
    }

    // Providers should implement actual format conversion
    throw new VoiceError(
      `Audio format conversion from ${fromFormat} to ${toFormat} not implemented`,
      "SERVICE_UNAVAILABLE"
    );
  };

  const validateAudioInput = (audio: AudioInput): void => {
    if (!audio.data) {
      throw new VoiceError("Audio input data is required", "INVALID_AUDIO");
    }

    if (!audio.format) {
      throw new VoiceError("Audio format is required", "INVALID_AUDIO");
    }

    if (!audio.dataType) {
      throw new VoiceError("Audio data type is required", "INVALID_AUDIO");
    }
  };

  const validateText = (text: string): void => {
    if (!text || text.trim().length === 0) {
      throw new VoiceError("Text cannot be empty", "SYNTHESIS_FAILED");
    }

    // Basic length validation - providers can override
    if (text.length > 5000) {
      throw new VoiceError(
        "Text exceeds maximum length of 5000 characters",
        "SYNTHESIS_FAILED"
      );
    }
  };

  const loadAudioFromPath = async (filepath: string): Promise<Buffer> => {
    const fs = await import("fs/promises");
    try {
      return await fs.readFile(filepath);
    } catch (error) {
      throw new VoiceError(
        `Failed to load audio from path: ${filepath}`,
        "INVALID_AUDIO",
        error
      );
    }
  };

  const loadAudioFromUrl = async (url: string): Promise<ArrayBuffer> => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.arrayBuffer();
    } catch (error) {
      throw new VoiceError(
        `Failed to load audio from URL: ${url}`,
        "INVALID_AUDIO",
        error
      );
    }
  };

  const decodeBase64 = (base64: string): ArrayBuffer => {
    try {
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes.buffer;
    } catch (error) {
      throw new VoiceError(
        "Failed to decode base64 audio data",
        "INVALID_AUDIO",
        error
      );
    }
  };

  const prepareAudioInput = async (
    audio: AudioInput
  ): Promise<ArrayBuffer | Buffer> => {
    validateAudioInput(audio);

    switch (audio.dataType) {
      case "buffer":
        // Handle Uint8Array by converting to ArrayBuffer
        if (audio.data instanceof Uint8Array) {
          return audio.data.buffer as ArrayBuffer;
        }
        return audio.data as Buffer | ArrayBuffer;

      case "base64":
        return decodeBase64(audio.data as string);

      case "filepath":
        return await loadAudioFromPath(audio.data as string);

      case "url":
        return await loadAudioFromUrl(audio.data as string);

      default:
        throw new VoiceError(
          `Unsupported audio data type: ${audio.dataType}`,
          "INVALID_AUDIO"
        );
    }
  };

  const rateLimit = async (): Promise<void> => {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;

    if (timeSinceLastRequest < minRequestInterval) {
      const delay = minRequestInterval - timeSinceLastRequest;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    lastRequestTime = Date.now();
  };

  // Return just the utility methods
  return {
    mergeOptions,
    emitProgress,
    convertAudioFormat,
    validateAudioInput,
    validateText,
    loadAudioFromPath,
    loadAudioFromUrl,
    decodeBase64,
    prepareAudioInput,
    rateLimit,
  };
};
