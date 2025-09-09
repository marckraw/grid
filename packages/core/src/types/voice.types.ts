/**
 * Voice-related types for Grid
 * Designed to be interface-agnostic - works with terminal, web, mobile, etc.
 */

/**
 * Supported audio formats across different interfaces
 */
export type AudioFormat = "mp3" | "wav" | "pcm" | "ogg" | "webm" | "flac";

/**
 * Audio data that can work in both Node.js and browser environments
 */
export interface AudioData {
  /**
   * Raw audio data - Buffer in Node.js, ArrayBuffer in browser
   */
  data: Buffer | ArrayBuffer | Uint8Array;

  /**
   * Audio format
   */
  format: AudioFormat;

  /**
   * Sample rate in Hz (e.g., 44100, 48000)
   */
  sampleRate?: number;

  /**
   * Number of audio channels (1 for mono, 2 for stereo)
   */
  channels?: number;

  /**
   * Bit depth (e.g., 16, 24)
   */
  bitDepth?: number;
}

/**
 * Result from audio synthesis
 */
export interface AudioResult extends AudioData {
  /**
   * Duration in seconds
   */
  duration?: number;

  /**
   * Size in bytes
   */
  size: number;

  /**
   * Optional metadata
   */
  metadata?: {
    voiceId?: string;
    language?: string;
    model?: string;
    [key: string]: any;
  };
}

/**
 * Input audio for transcription - flexible to accept various sources
 */
export interface AudioInput {
  /**
   * Audio data - can be Buffer, ArrayBuffer, base64 string, or file path
   */
  data: Buffer | ArrayBuffer | Uint8Array | string;

  /**
   * Format of the audio
   */
  format: AudioFormat;

  /**
   * Type of the data field
   */
  dataType: "buffer" | "base64" | "filepath" | "url";

  /**
   * Optional audio properties
   */
  sampleRate?: number;
  channels?: number;
}

/**
 * Options for voice synthesis
 */
export interface VoiceOptions {
  /**
   * Voice ID to use (provider-specific)
   */
  voiceId?: string;

  /**
   * Language code (e.g., 'en-US', 'es-ES')
   */
  language?: string;

  /**
   * Voice stability (0.0 to 1.0) - ElevenLabs specific
   */
  stability?: number;

  /**
   * Voice similarity boost (0.0 to 1.0) - ElevenLabs specific
   */
  similarityBoost?: number;

  /**
   * Speaking style (0.0 to 1.0) - ElevenLabs specific
   */
  style?: number;

  /**
   * Use speaker boost - ElevenLabs specific
   */
  useSpeakerBoost?: boolean;

  /**
   * Speaking rate/speed (0.5 to 2.0)
   */
  speed?: number;

  /**
   * Voice pitch (-20 to 20)
   */
  pitch?: number;

  /**
   * Output format preference
   */
  outputFormat?: AudioFormat;

  /**
   * Enable streaming generation
   */
  stream?: boolean;

  /**
   * Model to use for synthesis
   */
  model?: string;
}

/**
 * Options for speech transcription
 */
export interface TranscribeOptions {
  /**
   * Language code for transcription
   */
  language?: string;

  /**
   * Enable automatic language detection
   */
  detectLanguage?: boolean;

  /**
   * Include word-level timestamps
   */
  timestamps?: boolean;

  /**
   * Include punctuation
   */
  punctuate?: boolean;

  /**
   * Model to use (e.g., 'whisper-large', 'whisper-medium')
   */
  model?: string;

  /**
   * Temperature for sampling (0.0 to 1.0)
   */
  temperature?: number;
}

/**
 * Result from speech transcription
 */
export interface TranscriptionResult {
  /**
   * Transcribed text
   */
  text: string;

  /**
   * Confidence score (0.0 to 1.0)
   */
  confidence?: number;

  /**
   * Detected or specified language
   */
  language?: string;

  /**
   * Duration of the audio in seconds
   */
  duration?: number;

  /**
   * Word-level details if requested
   */
  words?: Array<{
    word: string;
    start: number;
    end: number;
    confidence?: number;
  }>;

  /**
   * Alternative transcriptions
   */
  alternatives?: Array<{
    text: string;
    confidence: number;
  }>;
}

/**
 * Available voice information
 */
export interface Voice {
  /**
   * Unique voice identifier
   */
  id: string;

  /**
   * Display name
   */
  name: string;

  /**
   * Voice description
   */
  description?: string;

  /**
   * Preview URL if available
   */
  previewUrl?: string;

  /**
   * Supported languages
   */
  languages?: string[];

  /**
   * Voice characteristics
   */
  labels?: {
    accent?: string;
    age?: string;
    gender?: string;
    useCase?: string[];
    [key: string]: any;
  };

  /**
   * Whether this is a custom/cloned voice
   */
  isCustom?: boolean;
}

/**
 * Audio chunk for streaming
 */
export interface AudioChunk {
  /**
   * Chunk data
   */
  data: Uint8Array;

  /**
   * Chunk index
   */
  index: number;

  /**
   * Is this the final chunk?
   */
  isFinal: boolean;

  /**
   * Timestamp of this chunk
   */
  timestamp: number;
}

/**
 * Voice service interface - must work across all environments
 */
export interface VoiceService {
  /**
   * Synthesize text to speech
   */
  synthesize(text: string, options?: VoiceOptions): Promise<AudioResult>;

  /**
   * Stream synthesis for real-time playback
   */
  streamSynthesize?(
    text: string,
    options?: VoiceOptions,
  ): AsyncGenerator<AudioChunk>;

  /**
   * Transcribe audio to text
   */
  transcribe(
    audio: AudioInput,
    options?: TranscribeOptions,
  ): Promise<TranscriptionResult>;

  /**
   * Stream transcription for real-time processing
   */
  streamTranscribe?(
    audio: AsyncGenerator<AudioChunk>,
    options?: TranscribeOptions,
  ): AsyncGenerator<TranscriptionResult>;

  /**
   * List available voices
   */
  listVoices(): Promise<Voice[]>;

  /**
   * Get specific voice details
   */
  getVoice?(voiceId: string): Promise<Voice | null>;

  /**
   * Clone a voice (if supported)
   */
  cloneVoice?(name: string, samples: AudioInput[]): Promise<Voice>;

  /**
   * Delete a custom voice
   */
  deleteVoice?(voiceId: string): Promise<boolean>;

  /**
   * Check if service is available
   */
  isAvailable(): Promise<boolean>;
}

/**
 * Voice configuration for agents
 */
export interface VoiceConfig {
  /**
   * Enable voice capabilities
   */
  enabled: boolean;

  /**
   * Default voice ID
   */
  voiceId?: string;

  /**
   * Default voice options
   */
  defaultOptions?: Partial<VoiceOptions>;

  /**
   * Automatically speak responses
   */
  autoSpeak?: boolean;

  /**
   * Automatically listen after speaking
   */
  autoListen?: boolean;

  /**
   * Allow interruption while speaking
   */
  allowInterruption?: boolean;

  /**
   * Mixed modality settings
   */
  mixedModality?: {
    enabled: boolean;
    mergeStrategy: "temporal" | "contextual" | "append";
  };
}

/**
 * Voice error types
 */
export class VoiceError extends Error {
  constructor(
    message: string,
    public code:
      | "SYNTHESIS_FAILED"
      | "TRANSCRIPTION_FAILED"
      | "VOICE_NOT_FOUND"
      | "QUOTA_EXCEEDED"
      | "INVALID_AUDIO"
      | "SERVICE_UNAVAILABLE",
    public details?: any,
  ) {
    super(message);
    this.name = "VoiceError";
  }
}

/**
 * Progress event for voice operations
 */
export interface VoiceProgressEvent {
  type:
    | "synthesis_start"
    | "synthesis_progress"
    | "synthesis_complete"
    | "transcription_start"
    | "transcription_progress"
    | "transcription_complete"
    | "listening_start"
    | "listening_stop"
    | "speaking_start"
    | "speaking_stop";

  /**
   * Progress percentage (0-100)
   */
  progress?: number;

  /**
   * Associated data
   */
  data?: any;

  /**
   * Timestamp
   */
  timestamp: number;
}
