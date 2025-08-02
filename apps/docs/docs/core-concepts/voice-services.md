---
sidebar_position: 7
---

# Voice Services

Grid's voice services bring natural language interaction to your agents through text-to-speech (TTS) and speech-to-text (STT) capabilities. Voice is implemented as a first-class service following Grid's closure-based architecture pattern.

## Architecture Overview

Voice services follow the same architectural principles as other Grid services:

```
┌─────────────────────────────────────────┐
│         Voice-Enabled Agents            │
│        (speak, listen methods)          │
└─────────────────────────────────────────┘
                    ↑
┌─────────────────────────────────────────┐
│         Voice Service Layer             │
│    (TTS, STT, Voice Management)         │
└─────────────────────────────────────────┘
                    ↑
┌─────────────────────────────────────────┐
│        Provider Implementations         │
│    (ElevenLabs, Azure, Google, etc)     │
└─────────────────────────────────────────┘
```

## Voice Service Interface

The voice service follows Grid's closure-based pattern:

```typescript
interface VoiceService {
  // Core capabilities
  synthesize(text: string, options?: VoiceOptions): Promise<AudioResult>;
  transcribe(audio: AudioData): Promise<TranscriptionResult>;
  
  // Streaming capabilities
  streamSynthesize(text: string, options?: VoiceOptions): AsyncGenerator<AudioChunk>;
  streamTranscribe(audioStream: AsyncGenerator<AudioData>): AsyncGenerator<TranscriptionChunk>;
  
  // Voice management
  listVoices(): Promise<Voice[]>;
  getVoice(voiceId: string): Promise<Voice | null>;
  
  // Voice cloning (if supported by provider)
  cloneVoice?(name: string, samples: AudioInput[]): Promise<Voice>;
  deleteVoice?(voiceId: string): Promise<boolean>;
}
```

## Creating Voice Services

Voice services are created by implementing the VoiceService interface. The `baseVoiceService` function provides utilities to help with common tasks:

```typescript
import { baseVoiceService, type VoiceService } from "@mrck-labs/grid-core";

// Get utilities from base voice service
const utils = baseVoiceService({
  apiKey: process.env.VOICE_API_KEY,
  defaultVoiceId: "default-voice",
  onProgress: (event) => console.log(event),
});

// Create your voice service implementation
const myVoiceService: VoiceService = {
  synthesize: async (text, options) => {
    // Use utilities for common tasks
    await utils.rateLimit();
    utils.validateText(text);
    const mergedOptions = utils.mergeOptions(options);
    
    // Provider-specific TTS implementation
    const audio = await providerAPI.textToSpeech(text, {
      voice: mergedOptions.voiceId,
      ...mergedOptions
    });
    
    return {
      audio,
      format: "mp3",
      sampleRate: 44100,
      size: audio.byteLength,
    };
  },
  
  transcribe: async (audio, options) => {
    await utils.rateLimit();
    utils.validateAudioInput(audio);
    
    // Use utility to prepare audio data
    const audioData = await utils.prepareAudioInput(audio);
    
    // Provider-specific STT implementation
    const result = await providerAPI.speechToText(audioData);
    
    return {
      text: result.transcript,
      confidence: result.confidence,
      language: result.detectedLanguage,
    };
  },
  
  listVoices: async () => {
    // Implementation
  },
  
  isAvailable: async () => {
    // Check if service is available
    return true;
  },
};
```

## ElevenLabs Integration

Grid includes a built-in ElevenLabs voice service implementation:

```typescript
import { elevenlabsVoiceService } from "@mrck-labs/grid-core";

const voiceService = elevenlabsVoiceService({
  apiKey: process.env.ELEVENLABS_API_KEY,
  defaultVoiceId: "21m00Tcm4TlvDq8ikWAM", // Rachel voice
  defaultOptions: {
    stability: 0.75,
    similarityBoost: 0.75,
    style: 0.5,
    useSpeakerBoost: true,
  },
});

// List available voices
const voices = await voiceService.listVoices();
console.log(voices.map(v => `${v.name} (${v.id})`));

// Synthesize speech
const audio = await voiceService.synthesize("Hello, I'm your AI assistant!", {
  voiceId: "21m00Tcm4TlvDq8ikWAM",
  stability: 0.8,
  similarityBoost: 0.7,
});

// Stream synthesis for faster response
for await (const chunk of voiceService.streamSynthesize("This is a longer response...")) {
  // Play audio chunks as they arrive
  await playAudioChunk(chunk);
}
```

## Voice-Enabled Agents

Agents become voice-enabled when provided with a voice service:

```typescript
import { createConfigurableAgent } from "@mrck-labs/grid-core";

const agent = createConfigurableAgent({
  llmService,
  voiceService, // Optional voice service
  config: {
    id: "voice-assistant",
    prompts: {
      system: "You are a helpful voice assistant. Keep responses concise for speech.",
    },
    voice: {
      enabled: true,
      voiceId: "21m00Tcm4TlvDq8ikWAM",
      autoSpeak: true, // Automatically speak responses
      interruptible: true, // Allow interruption mid-speech
    },
  },
});

// Agent now has voice methods
if (agent.hasVoice()) {
  // Listen for user input
  const transcript = await agent.listen();
  console.log("User said:", transcript.text);
  
  // Speak a response
  await agent.speak("I heard you say: " + transcript.text);
}

// Voice is integrated into the act method
const response = await agent.act({
  messages: [{ role: "user", content: "Hello!" }],
});
// If autoSpeak is true, the response is automatically spoken
```

## Voice Configuration

Voice behavior can be configured at multiple levels:

### Agent-Level Configuration

```typescript
const config = {
  voice: {
    enabled: true,              // Enable voice capabilities
    voiceId: "voice-id",       // Default voice for this agent
    autoSpeak: true,           // Automatically speak responses
    interruptible: true,       // Allow interruption
    speed: 1.0,               // Speed multiplier (0.5 to 2.0)
  },
};
```

### Per-Request Options

```typescript
// Override voice settings for specific requests
await agent.speak("Important announcement!", {
  voiceId: "different-voice-id",
  stability: 0.9,        // More consistent
  similarityBoost: 0.9,  // More similar to original voice
  style: 0.3,           // Less expressive,
  speed: 0.8,             // Slower for clarity
});
```

## Mixed Modality

Grid supports mixed voice and text interactions in the same conversation:

```typescript
const conversation = createConversationLoop({
  agent: voiceEnabledAgent,
  modality: {
    allowMixed: true,
    preferred: "voice",
  },
});

// User can speak or type
conversation.on("userSpeaking", (transcript) => {
  console.log("Voice input:", transcript);
});

conversation.on("userTyping", (text) => {
  console.log("Text input:", text);
});

// Agent responds in the appropriate modality
conversation.on("agentSpeaking", (audio) => {
  // Play audio response
});

conversation.on("agentTyping", (text) => {
  // Display text response
});
```

## Terminal Voice Support

Grid includes terminal voice capabilities for CLI applications:

```typescript
import { TerminalVoiceService } from "@mrck-labs/grid-core";

const terminalVoice = new TerminalVoiceService();

// Check if audio is available
if (await terminalVoice.checkAudioSupport()) {
  // Record audio from microphone
  const audio = await terminalVoice.recordAudio({
    duration: 5000, // Max 5 seconds
    onProgress: (level) => {
      console.log("Audio level:", level);
    },
  });
  
  // Play audio through speakers
  await terminalVoice.playAudio(audioBuffer);
}
```

## Voice Progress Events

Voice operations emit progress events for UI feedback:

```typescript
agent.on("voice:listening:start", () => {
  console.log("🎤 Listening...");
});

agent.on("voice:listening:end", (duration) => {
  console.log(`⏹️ Recording complete (${duration}ms)`);
});

agent.on("voice:transcribing", () => {
  console.log("📝 Transcribing...");
});

agent.on("voice:speaking:start", (text) => {
  console.log("🔊 Speaking:", text);
});

agent.on("voice:speaking:progress", (progress) => {
  console.log(`Speaking: ${(progress * 100).toFixed(0)}%`);
});

agent.on("voice:speaking:end", () => {
  console.log("✅ Finished speaking");
});
```

## Error Handling

Voice services include comprehensive error handling:

```typescript
try {
  await agent.speak("Hello world");
} catch (error) {
  if (error instanceof VoiceServiceError) {
    switch (error.code) {
      case "VOICE_NOT_FOUND":
        console.error("Selected voice is not available");
        break;
      case "QUOTA_EXCEEDED":
        console.error("Voice API quota exceeded");
        break;
      case "AUDIO_PLAYBACK_FAILED":
        console.error("Could not play audio");
        break;
      default:
        console.error("Voice error:", error.message);
    }
  }
}

// Graceful degradation
if (!agent.hasVoice() || !voiceService.isAvailable()) {
  // Fall back to text-only interaction
  console.log(response.content);
} else {
  await agent.speak(response.content);
}
```

## Performance Optimization

### Streaming Synthesis

For faster voice responses, use streaming:

```typescript
// Start speaking while still generating
const streamResponse = async (text: string) => {
  const chunks = text.match(/.{1,100}[.!?]?\s/g) || [text];
  
  for (const chunk of chunks) {
    // Synthesize and play each chunk immediately
    const audio = await voiceService.synthesize(chunk);
    playAudio(audio); // Non-blocking
  }
};
```

### Voice Caching

Cache commonly spoken phrases:

```typescript
const cachedVoiceService = withCache(voiceService, {
  maxSize: 100, // Cache up to 100 phrases
  ttl: 3600000, // 1 hour TTL
});

// Repeated phrases are served from cache
await cachedVoiceService.synthesize("Welcome back!"); // API call
await cachedVoiceService.synthesize("Welcome back!"); // From cache
```

### Parallel Processing

Process voice and LLM operations in parallel:

```typescript
const processVoiceQuery = async (audioInput: AudioData) => {
  // Start transcription and LLM warmup in parallel
  const [transcript, _] = await Promise.all([
    voiceService.transcribe(audioInput),
    agent.prepare(), // Pre-load models, tools, etc.
  ]);
  
  // Process transcribed text
  const response = await agent.act({
    messages: [{ role: "user", content: transcript.text }],
  });
  
  // Start synthesis while logging
  const [audio, _] = await Promise.all([
    voiceService.synthesize(response.content),
    logConversation(transcript, response),
  ]);
  
  return audio;
};
```

## Security Considerations

### API Key Management

```typescript
// Use environment variables
const voiceService = elevenlabsVoiceService({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

// Or use a key management service
const voiceService = elevenlabsVoiceService({
  apiKey: await keyVault.getSecret("elevenlabs-api-key"),
});
```

### Content Filtering

```typescript
// Filter inappropriate content before synthesis
const safeVoiceService = withContentFilter(voiceService, {
  filterProfanity: true,
  maxLength: 500, // Prevent abuse with long texts
});
```

### Rate Limiting

```typescript
// Prevent abuse with rate limiting
const rateLimitedVoice = withRateLimit(voiceService, {
  maxRequests: 100,
  windowMs: 60000, // 100 requests per minute
});
```

## Testing Voice Services

Mock voice services for testing:

```typescript
const mockVoiceService = createMockVoiceService({
  voices: [
    { id: "test-1", name: "Test Voice 1" },
    { id: "test-2", name: "Test Voice 2" },
  ],
  synthesizeDelay: 100, // Simulate API delay
  transcribeResult: { text: "Mock transcription", confidence: 0.95 },
});

// Use in tests
const testAgent = createConfigurableAgent({
  llmService: mockLLMService,
  voiceService: mockVoiceService,
  config: { /* ... */ },
});

// Test voice capabilities
expect(testAgent.hasVoice()).toBe(true);
const audio = await testAgent.speak("Test message");
expect(audio).toBeDefined();
```

## Best Practices

1. **Keep responses concise** - Speech is slower than reading
2. **Use appropriate voices** - Match voice to agent personality
3. **Handle interruptions gracefully** - Users may want to stop long responses
4. **Provide visual feedback** - Show speaking/listening states
5. **Test fallback behavior** - Ensure text-only mode works
6. **Monitor API usage** - Voice APIs can be expensive
7. **Cache when possible** - Reduce API calls for common phrases
8. **Use streaming** - Start playback before synthesis completes
9. **Handle errors gracefully** - Fall back to text when voice fails
10. **Respect user preferences** - Allow disabling voice features

## Next Steps

- [Voice Integration Guide](/docs/guides/voice-integration) - Step-by-step setup
- [Terminal Voice Setup](/docs/guides/terminal-voice) - CLI voice features
- [Voice Service API](/docs/sdk-reference/services/voice-service) - Detailed API reference