---
sidebar_position: 6
---

# Voice Service

The Voice Service provides text-to-speech (TTS) and speech-to-text (STT) capabilities for Grid agents, enabling natural voice interactions.

## Overview

Voice services in Grid follow the closure-based pattern and provide:
- Text-to-speech synthesis
- Speech-to-text transcription
- Voice management
- Streaming capabilities
- Provider abstraction

## Interface

```typescript
interface VoiceService {
  // Core synthesis and transcription
  synthesize(text: string, options?: VoiceOptions): Promise<AudioResult>;
  transcribe(audio: AudioInput, options?: TranscribeOptions): Promise<TranscriptionResult>;
  
  // Streaming variants
  streamSynthesize?(text: string, options?: VoiceOptions): AsyncGenerator<AudioChunk>;
  streamTranscribe?(audio: AsyncGenerator<AudioChunk>, options?: TranscribeOptions): AsyncGenerator<TranscriptionResult>;
  
  // Voice management
  listVoices(): Promise<Voice[]>;
  getVoice?(voiceId: string): Promise<Voice | null>;
  
  // Voice cloning (if supported)
  cloneVoice?(name: string, samples: AudioInput[]): Promise<Voice>;
  deleteVoice?(voiceId: string): Promise<boolean>;
  
  // Utility
  isAvailable(): Promise<boolean>;
}
```

## Types

### VoiceOptions

```typescript
interface VoiceOptions {
  voiceId?: string;
  language?: string;
  stability?: number;        // 0 to 1 (ElevenLabs specific)
  similarityBoost?: number;  // 0 to 1 (ElevenLabs specific)
  style?: number;           // 0 to 1 (ElevenLabs specific)
  useSpeakerBoost?: boolean; // ElevenLabs specific
  speed?: number;           // 0.5 to 2.0
  pitch?: number;           // -20 to 20
  model?: string;           // Model to use for synthesis
  outputFormat?: AudioFormat; // Preferred output format
  stream?: boolean;         // Enable streaming
  signal?: AbortSignal;     // For cancellation
}
```


### AudioResult

```typescript
interface AudioResult {
  data: Buffer | ArrayBuffer;
  format: "mp3" | "wav" | "pcm" | "ogg";
  sampleRate: number;
  channels?: number;
  duration?: number;
}
```

### TranscriptionResult

```typescript
interface TranscriptionResult {
  text: string;
  confidence?: number;
  language?: string;
  segments?: TranscriptionSegment[];
  metadata?: Record<string, any>;
}
```

### Voice

```typescript
interface Voice {
  id: string;
  name: string;
  labels?: string[];
  description?: string;
  previewUrl?: string;
}
```

## Creating Voice Services

### Base Voice Service Utilities

The `baseVoiceService` function provides utilities for implementing voice services:

```typescript
import { baseVoiceService } from "@mrck-labs/grid-core";

// Get utilities
const utils = baseVoiceService({
  apiKey: process.env.API_KEY,
  defaultVoiceId: "default-voice",
  defaultOptions: {
    stability: 0.75,
    similarityBoost: 0.75,
  },
  onProgress: (event) => {
    console.log(`Voice event: ${event.type}`);
  },
});

// Utilities available:
// - mergeOptions(options): Merge with defaults
// - emitProgress(event): Emit progress events
// - validateText(text): Validate input text
// - validateAudioInput(audio): Validate audio input
// - prepareAudioInput(audio): Convert audio to usable format
// - rateLimit(): Apply rate limiting
// - loadAudioFromPath(path): Load audio file
// - loadAudioFromUrl(url): Fetch audio from URL
// - decodeBase64(base64): Decode base64 audio

// Use utilities in your implementation
const myVoiceService: VoiceService = {
  synthesize: async (text, options) => {
    await utils.rateLimit();
    utils.validateText(text);
    const mergedOptions = utils.mergeOptions(options);
    
    utils.emitProgress({
      type: "synthesis_start",
      timestamp: Date.now(),
    });
    
    // Your provider-specific implementation
    const result = await myProvider.synthesize(text, mergedOptions);
    
    utils.emitProgress({
      type: "synthesis_complete",
      timestamp: Date.now(),
    });
    
    return result;
  },
  
  // ... other methods
};
```

### ElevenLabs Voice Service

Grid includes a built-in ElevenLabs implementation:

```typescript
import { elevenlabsVoiceService } from "@mrck-labs/grid-core";

const voiceService = elevenlabsVoiceService({
  apiKey: process.env.ELEVENLABS_API_KEY!,
  defaultVoiceId: "21m00Tcm4TlvDq8ikWAM",
  defaultModel: "eleven_multilingual_v2", // or "eleven_monolingual_v1"
  defaultOptions: {
    stability: 0.75,
    similarityBoost: 0.75,
    style: 0.5,
    useSpeakerBoost: true,
  },
  outputFormat: "mp3_44100_128",
  applyTextNormalization: "auto", // "auto", "on", or "off"
});
```

## Usage Examples

### Basic Synthesis

```typescript
// Simple synthesis
const audio = await voiceService.synthesize("Hello, world!");

// With options
const audio = await voiceService.synthesize("Important message", {
  voiceId: "21m00Tcm4TlvDq8ikWAM",
  stability: 0.9,
  similarityBoost: 0.8,
  speed: 0.9,
});

// Play the audio (implementation-specific)
await playAudio(audio);
```

### Streaming Synthesis

```typescript
// Stream synthesis for long text
const text = "This is a very long text that should be streamed...";

for await (const chunk of voiceService.streamSynthesize(text)) {
  // Play chunks as they arrive
  await playAudioChunk(chunk);
}

// With sentence-based streaming
const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

for (const sentence of sentences) {
  const audio = await voiceService.synthesize(sentence);
  playAudio(audio); // Non-blocking
}
```

### Transcription

```typescript
// Basic transcription
const audioData = await recordAudio(); // Implementation-specific
const result = await voiceService.transcribe(audioData);

console.log("Transcript:", result.text);
console.log("Confidence:", result.confidence);

// With streaming transcription
const audioStream = createAudioStream(); // Microphone stream

for await (const chunk of voiceService.streamTranscribe(audioStream)) {
  console.log("Partial:", chunk.text);
  
  if (chunk.isFinal) {
    console.log("Final:", chunk.text);
  }
}
```

### Voice Management

```typescript
// List available voices
const voices = await voiceService.listVoices();

console.log("Available voices:");
voices.forEach(voice => {
  console.log(`- ${voice.name} (${voice.id})`);
  if (voice.labels) {
    console.log(`  Tags: ${voice.labels.join(", ")}`);
  }
});

// Get specific voice details
const voice = await voiceService.getVoice("21m00Tcm4TlvDq8ikWAM");
if (voice) {
  console.log(`Voice: ${voice.name}`);
  console.log(`Preview: ${voice.preview_url}`);
}
```

## Integration with Agents

### Adding Voice to Agents

```typescript
const agent = createConfigurableAgent({
  llmService,
  voiceService, // Enables voice capabilities
  config: {
    id: "voice-agent",
    voice: {
      enabled: true,
      voiceId: "21m00Tcm4TlvDq8ikWAM",
      autoSpeak: true,
      interruptible: true,
    },
  },
});

// Agent now has voice methods
if (agent.hasVoice()) {
  await agent.speak("Hello!");
  const transcript = await agent.listen();
}
```

### Voice in Conversation Loops

```typescript
const conversation = createConversationLoop({
  agent: voiceEnabledAgent,
  onProgress: (update) => {
    switch (update.type) {
      case "listening_start":
        console.log("🎤 Listening...");
        break;
      case "speaking_start":
        console.log("🔊 Speaking:", update.content);
        break;
      case "speaking_progress":
        console.log(`Progress: ${update.progress * 100}%`);
        break;
    }
  },
});

// Responses are automatically spoken if autoSpeak is true
await conversation.sendMessage("Tell me about the weather");
```

## Advanced Features

### Caching

```typescript
import { createCachedVoiceService } from "@mrck-labs/grid-core";

// Wrap any voice service with caching
const cachedVoice = createCachedVoiceService(voiceService, {
  maxSize: 100,     // Cache up to 100 phrases
  ttl: 3600000,     // 1 hour TTL
  keyGenerator: (text, options) => {
    // Custom cache key generation
    return `${text}-${options?.voiceId || "default"}`;
  },
});

// Repeated synthesis is cached
await cachedVoice.synthesize("Welcome!"); // API call
await cachedVoice.synthesize("Welcome!"); // From cache
```

### Rate Limiting

```typescript
import { withRateLimit } from "@mrck-labs/grid-core";

// Add rate limiting to prevent abuse
const rateLimitedVoice = withRateLimit(voiceService, {
  synthesize: {
    maxRequests: 100,
    windowMs: 60000, // 100 requests per minute
  },
  transcribe: {
    maxRequests: 50,
    windowMs: 60000, // 50 requests per minute
  },
});
```

### Error Handling

```typescript
import { VoiceServiceError } from "@mrck-labs/grid-core";

// Wrap voice service with error handling
const resilientVoice = {
  ...voiceService,
  
  synthesize: async (text, options) => {
    try {
      return await voiceService.synthesize(text, options);
    } catch (error) {
      if (error instanceof VoiceServiceError) {
        switch (error.code) {
          case "VOICE_NOT_FOUND":
            // Try with default voice
            return await voiceService.synthesize(text, {
              ...options,
              voiceId: "21m00Tcm4TlvDq8ikWAM", // Use fallback voice ID
            });
            
          case "QUOTA_EXCEEDED":
            // Log and throw
            console.error("Voice quota exceeded");
            throw error;
            
          default:
            throw error;
        }
      }
      throw error;
    }
  },
};
```

### Cancellation

```typescript
// Support cancellation with AbortController
const controller = new AbortController();

// Start synthesis
const synthesisPromise = voiceService.synthesize("Long text...", {
  signal: controller.signal,
});

// Cancel if needed
setTimeout(() => {
  controller.abort();
}, 1000);

try {
  const audio = await synthesisPromise;
} catch (error) {
  if (error.name === "AbortError") {
    console.log("Synthesis cancelled");
  }
}
```

## Testing

### Mock Voice Service

```typescript
import { createMockVoiceService } from "@mrck-labs/grid-core";

const mockVoice = createMockVoiceService({
  voices: [
    { id: "test-1", name: "Test Voice 1" },
    { id: "test-2", name: "Test Voice 2" },
  ],
  synthesizeDelay: 100,
  synthesizeResult: {
    audio: Buffer.from("mock audio"),
    format: "mp3",
    sampleRate: 44100,
  },
  transcribeDelay: 200,
  transcribeResult: {
    text: "Mock transcription",
    confidence: 0.95,
  },
});

// Use in tests
describe("Voice Agent", () => {
  it("should speak responses", async () => {
    const agent = createConfigurableAgent({
      llmService: mockLLMService,
      voiceService: mockVoice,
      config: { voice: { enabled: true } },
    });
    
    const audio = await agent.speak("Hello");
    expect(audio).toBeDefined();
    expect(audio.format).toBe("mp3");
  });
});
```

### Testing Patterns

```typescript
// Test voice availability
it("should check voice availability", () => {
  expect(voiceService.isAvailable()).toBe(true);
});

// Test voice listing
it("should list voices", async () => {
  const voices = await voiceService.listVoices();
  expect(voices.length).toBeGreaterThan(0);
  expect(voices[0]).toHaveProperty("id");
  expect(voices[0]).toHaveProperty("name");
});

// Test synthesis
it("should synthesize text", async () => {
  const audio = await voiceService.synthesize("Test");
  expect(audio.audio).toBeInstanceOf(Buffer);
  expect(audio.format).toBe("mp3");
  expect(audio.sampleRate).toBe(44100);
});

// Test error handling
it("should handle invalid voice ID", async () => {
  await expect(
    voiceService.synthesize("Test", { voiceId: "invalid" })
  ).rejects.toThrow(VoiceServiceError);
});
```

## Performance Considerations

### Optimization Strategies

1. **Use streaming for long text** - Start playback before synthesis completes
2. **Cache common phrases** - Reduce API calls and latency
3. **Preload voices** - Initialize during startup, not first use
4. **Batch short phrases** - Combine multiple short texts into one request
5. **Use appropriate quality** - Balance quality vs. speed/cost

### Benchmarking

```typescript
import { benchmarkVoiceService } from "@mrck-labs/grid-core";

const results = await benchmarkVoiceService(voiceService, {
  texts: [
    "Short text",
    "Medium length text with more words",
    "Long text with multiple sentences...",
  ],
  iterations: 10,
});

console.log("Average synthesis time:", results.avgSynthesisTime);
console.log("Average transcription time:", results.avgTranscriptionTime);
console.log("Cache hit rate:", results.cacheHitRate);
```

## Best Practices

1. **Always provide fallbacks** - Voice may not be available
2. **Keep text concise** - Speech is slower than reading
3. **Handle interruptions** - Users may want to stop playback
4. **Monitor costs** - Voice APIs can be expensive
5. **Test with real voices** - Mock services don't capture voice quality
6. **Consider accessibility** - Provide text alternatives
7. **Respect user preferences** - Allow disabling voice
8. **Use appropriate voices** - Match voice to use case
9. **Handle errors gracefully** - Network issues are common
10. **Optimize for latency** - Use streaming and caching

## See Also

- [Voice Services Concepts](/docs/core-concepts/voice-services)
- [Voice Integration Guide](/docs/guides/voice-integration)
- [ElevenLabs API Docs](https://docs.elevenlabs.io/api-reference/text-to-speech)