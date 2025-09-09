import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import type {
  AudioChunk,
  AudioFormat,
  AudioInput,
  AudioResult,
  TranscribeOptions,
  TranscriptionResult,
  Voice,
  VoiceOptions,
  VoiceService,
} from "../../types/voice.types.js";
import { VoiceError } from "../../types/voice.types.js";
import {
  type BaseVoiceServiceConfig,
  baseVoiceService,
} from "../base.voice.service.js";

export interface ElevenLabsVoiceServiceConfig extends BaseVoiceServiceConfig {
  apiKey?: string; // Optional since SDK can use env var
  defaultVoiceId?: string;
  defaultModel?: string;
  // ElevenLabs specific options
  outputFormat?:
    | "mp3_44100_128"
    | "mp3_44100_64"
    | "mp3_44100_32"
    | "pcm_16000"
    | "pcm_22050"
    | "pcm_24000"
    | "pcm_44100"
    | "ulaw_8000";
  applyTextNormalization?: "auto" | "on" | "off";
}

/**
 * ElevenLabs implementation of VoiceService
 */
export const elevenlabsVoiceService = (
  config: ElevenLabsVoiceServiceConfig,
): VoiceService => {
  const {
    apiKey,
    defaultVoiceId,
    // defaultModel = "eleven_multilingual_v2",
    defaultModel = "eleven_flash_v2_5", // the fastest and cheapest model
    outputFormat = "mp3_44100_128",
    applyTextNormalization = "auto",
  } = config;

  // Initialize ElevenLabs client
  const client = new ElevenLabsClient({ apiKey });

  client.speechToText.convert;

  // Get utilities from base service
  const utils = baseVoiceService(config);

  /**
   * Synthesize text to speech using ElevenLabs API
   */
  const synthesize = async (
    text: string,
    options?: VoiceOptions,
  ): Promise<AudioResult> => {
    await utils.rateLimit();
    utils.validateText(text);

    const mergedOptions = utils.mergeOptions(options);
    const voiceId = mergedOptions.voiceId || defaultVoiceId;

    if (!voiceId) {
      throw new VoiceError(
        "Voice ID is required for synthesis",
        "SYNTHESIS_FAILED",
      );
    }

    utils.emitProgress({
      type: "synthesis_start",
      timestamp: Date.now(),
    });

    try {
      const audio = await client.textToSpeech.convert(voiceId, {
        text,
        modelId: mergedOptions.model || defaultModel,
        outputFormat: outputFormat,
        applyTextNormalization: applyTextNormalization,
        voiceSettings: {
          stability: mergedOptions.stability ?? 0.5,
          similarityBoost: mergedOptions.similarityBoost ?? 0.5,
          style: mergedOptions.style ?? 0.0,
          useSpeakerBoost: mergedOptions.useSpeakerBoost ?? true,
        },
      });

      // Convert the response to ArrayBuffer
      const chunks: Uint8Array[] = [];
      for await (const chunk of audio) {
        chunks.push(chunk);
      }

      const audioData = new Uint8Array(
        chunks.reduce((acc, chunk) => acc + chunk.length, 0),
      );
      let offset = 0;
      for (const chunk of chunks) {
        audioData.set(chunk, offset);
        offset += chunk.length;
      }

      utils.emitProgress({
        type: "synthesis_complete",
        timestamp: Date.now(),
        data: { size: audioData.byteLength },
      });

      return {
        data: audioData,
        format: outputFormat.startsWith("mp3") ? "mp3" : ("pcm" as AudioFormat),
        size: audioData.byteLength,
        metadata: {
          voiceId,
          model: mergedOptions.model || defaultModel,
        },
      };
    } catch (error) {
      if (error instanceof VoiceError) {
        throw error;
      }
      throw new VoiceError(
        "Failed to synthesize speech with ElevenLabs",
        "SYNTHESIS_FAILED",
        error,
      );
    }
  };

  /**
   * Stream synthesis for real-time playback
   */
  const streamSynthesize = async function* (
    text: string,
    options?: VoiceOptions,
  ): AsyncGenerator<AudioChunk> {
    await utils.rateLimit();
    utils.validateText(text);

    const mergedOptions = utils.mergeOptions(options);
    const voiceId = mergedOptions.voiceId || defaultVoiceId;

    if (!voiceId) {
      throw new VoiceError(
        "Voice ID is required for synthesis",
        "SYNTHESIS_FAILED",
      );
    }

    utils.emitProgress({
      type: "synthesis_start",
      timestamp: Date.now(),
    });

    try {
      const audioStream = await client.textToSpeech.stream(voiceId, {
        text,
        modelId: mergedOptions.model || defaultModel,
        outputFormat: outputFormat,
        applyTextNormalization: applyTextNormalization,
        voiceSettings: {
          stability: mergedOptions.stability ?? 0.5,
          similarityBoost: mergedOptions.similarityBoost ?? 0.5,
          style: mergedOptions.style ?? 0.0,
          useSpeakerBoost: mergedOptions.useSpeakerBoost ?? true,
        },
        optimizeStreamingLatency: 0,
      });

      let chunkIndex = 0;
      for await (const chunk of audioStream) {
        yield {
          data: chunk,
          index: chunkIndex++,
          isFinal: false,
          timestamp: Date.now(),
        };

        utils.emitProgress({
          type: "synthesis_progress",
          progress: undefined,
          timestamp: Date.now(),
        });
      }

      utils.emitProgress({
        type: "synthesis_complete",
        timestamp: Date.now(),
      });
    } catch (error) {
      if (error instanceof VoiceError) {
        throw error;
      }
      throw new VoiceError(
        "Failed to stream synthesis with ElevenLabs",
        "SYNTHESIS_FAILED",
        error,
      );
    }
  };

  /**
   * Transcribe audio to text using ElevenLabs Scribe v1 model
   */
  const transcribe = async (
    audio: AudioInput,
    options?: TranscribeOptions,
  ): Promise<TranscriptionResult> => {
    await utils.rateLimit();

    utils.emitProgress({
      type: "transcription_start",
      timestamp: Date.now(),
    });

    try {
      // Prepare audio data
      const audioData = await utils.prepareAudioInput(audio);

      // Convert audio data to Blob for the API
      const audioBlob = new Blob([audioData], {
        type: `audio/${audio.format}`,
      });

      // Call ElevenLabs speech-to-text API
      const modelId = options?.model || "scribe_v1";

      const response = await client.speechToText.convert({
        file: audioBlob as any, // The API expects 'file' parameter
        modelId: modelId,
      });

      utils.emitProgress({
        type: "transcription_complete",
        timestamp: Date.now(),
      });

      // Format the response according to our TranscriptionResult interface
      // ElevenLabs returns { text: "transcribed text", ... }
      const resp: any = response as any;
      const transcribedText = resp.text || "";

      return {
        text: transcribedText,
        confidence: resp.confidence,
        language: resp.language || options?.language,
        duration: resp.duration,
        words: resp.words?.map((word: any) => ({
          word: word.text,
          start: word.start_time || word.start,
          end: word.end_time || word.end,
          confidence: word.confidence,
        })),
        alternatives: resp.alternatives?.map((alt: any) => ({
          text: alt.text,
          confidence: alt.confidence,
        })),
      };
    } catch (error) {
      if (error instanceof VoiceError) {
        throw error;
      }
      throw new VoiceError(
        `Failed to transcribe audio with ElevenLabs: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "TRANSCRIPTION_FAILED",
        error,
      );
    }
  };

  /**
   * List available voices
   */
  const listVoices = async (): Promise<Voice[]> => {
    await utils.rateLimit();

    try {
      const response = await client.voices.getAll();

      return response.voices.map((voice: any) => ({
        id: voice.voiceId || voice.voice_id,
        name: voice.name,
        description: voice.description || undefined,
        previewUrl: voice.previewUrl || voice.preview_url,
        labels: {
          ...voice.labels,
          category: voice.category,
        },
        isCustom:
          voice.category === "cloned" || voice.category === "professional",
      }));
    } catch (error) {
      if (error instanceof VoiceError) {
        throw error;
      }
      throw new VoiceError(
        "Failed to list voices from ElevenLabs",
        "SERVICE_UNAVAILABLE",
        error,
      );
    }
  };

  /**
   * Get specific voice details
   */
  const getVoice = async (voiceId: string): Promise<Voice | null> => {
    await utils.rateLimit();

    try {
      const voice = await client.voices.get(voiceId);

      return {
        id: voice.voiceId || (voice as any).voice_id,
        name: voice.name || "",
        description: voice.description || undefined,
        previewUrl: voice.previewUrl || (voice as any).preview_url,
        labels: {
          ...voice.labels,
          category: voice.category,
        },
        isCustom:
          voice.category === "cloned" || voice.category === "professional",
      };
    } catch (error: any) {
      // Handle 404 as null return
      if (error?.statusCode === 404 || error?.response?.status === 404) {
        return null;
      }

      if (error instanceof VoiceError) {
        throw error;
      }
      throw new VoiceError(
        "Failed to get voice from ElevenLabs",
        "SERVICE_UNAVAILABLE",
        error,
      );
    }
  };

  /**
   * Clone a voice (requires Pro subscription)
   */
  const cloneVoice = async (
    name: string,
    samples: AudioInput[],
  ): Promise<Voice> => {
    if (samples.length === 0) {
      throw new VoiceError(
        "At least one voice sample is required",
        "INVALID_AUDIO",
      );
    }

    await utils.rateLimit();

    try {
      // Process audio samples into File-like objects
      const files: File[] = [];

      for (let i = 0; i < samples.length; i++) {
        const audioData = await utils.prepareAudioInput(samples[i]);
        const blob = new Blob([audioData], {
          type: `audio/${samples[i].format}`,
        });
        // Create a File-like object
        const file = new File([blob], `sample_${i}.${samples[i].format}`, {
          type: `audio/${samples[i].format}`,
        });
        files.push(file);
      }

      // The SDK might use a different method name for adding voices
      // Let's use the create method if available, otherwise fallback to add
      const response =
        (await (client.voices as any).create?.({
          name,
          files,
        })) ||
        (await (client.voices as any).add?.({
          name,
          files,
        }));

      // Fetch the created voice details
      const voiceId = response.voiceId || (response as any).voice_id;
      if (!voiceId) {
        throw new VoiceError(
          "No voice ID returned from clone operation",
          "SERVICE_UNAVAILABLE",
        );
      }

      const voice = await getVoice(voiceId);
      if (!voice) {
        throw new VoiceError(
          "Failed to fetch cloned voice details",
          "SERVICE_UNAVAILABLE",
        );
      }

      return voice;
    } catch (error) {
      if (error instanceof VoiceError) {
        throw error;
      }
      throw new VoiceError(
        "Failed to clone voice with ElevenLabs",
        "SYNTHESIS_FAILED",
        error,
      );
    }
  };

  /**
   * Delete a custom voice
   */
  const deleteVoice = async (voiceId: string): Promise<boolean> => {
    await utils.rateLimit();

    try {
      await client.voices.delete(voiceId);
      return true;
    } catch (error: any) {
      // Handle 404 as false return
      if (error?.statusCode === 404 || error?.response?.status === 404) {
        return false;
      }

      if (error instanceof VoiceError) {
        throw error;
      }
      throw new VoiceError(
        "Failed to delete voice from ElevenLabs",
        "SERVICE_UNAVAILABLE",
        error,
      );
    }
  };

  /**
   * Check if service is available
   */
  const isAvailable = async (): Promise<boolean> => {
    try {
      await client.user.get();
      return true;
    } catch {
      return false;
    }
  };

  return {
    synthesize,
    streamSynthesize,
    transcribe,
    listVoices,
    getVoice,
    cloneVoice,
    deleteVoice,
    isAvailable,
  };
};
