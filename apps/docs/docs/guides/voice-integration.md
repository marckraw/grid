---
sidebar_position: 4
---

# Voice Integration Guide

This guide walks you through adding voice capabilities to your Grid agents, from basic setup to advanced features.

## Prerequisites

Before starting, ensure you have:

1. **Grid Core installed** with version 0.2.0 or higher
2. **ElevenLabs API Key** - Sign up at [elevenlabs.io](https://elevenlabs.io)
3. **Audio tools installed** (for terminal voice):
   - macOS: `brew install sox`
   - Linux: `sudo apt-get install sox libsox-fmt-all`
   - Windows: Download from [sox.sourceforge.net](http://sox.sourceforge.net)

## Quick Start

### 1. Set up your environment

```bash
# Add to your .env file
ELEVENLABS_API_KEY=your-api-key-here
```

### 2. Create a voice-enabled agent

```typescript
import { 
  createConfigurableAgent, 
  baseLLMService,
  elevenlabsVoiceService 
} from "@mrck-labs/grid-core";

// Initialize voice service
const voiceService = elevenlabsVoiceService({
  apiKey: process.env.ELEVENLABS_API_KEY,
  defaultVoiceId: "21m00Tcm4TlvDq8ikWAM", // Rachel voice
});

// Create agent with voice
const agent = createConfigurableAgent({
  llmService: baseLLMService({
    provider: "openai",
    apiKey: process.env.OPENAI_API_KEY,
  }),
  voiceService, // This enables voice capabilities!
  config: {
    id: "voice-assistant",
    prompts: {
      system: "You are a helpful voice assistant. Keep responses concise.",
    },
    voice: {
      enabled: true,
      autoSpeak: true, // Automatically speak responses
    },
  },
});

// Use voice features
if (agent.hasVoice()) {
  await agent.speak("Hello! I'm your voice assistant.");
}
```

### 3. Create a voice conversation

```typescript
import { createConversationLoop } from "@mrck-labs/grid-core";

const conversation = createConversationLoop({
  agent,
  onProgress: (update) => {
    if (update.type === "speaking_start") {
      console.log("🔊 Speaking:", update.content);
    }
  },
});

// Process text input (response will be spoken if autoSpeak is true)
const response = await conversation.sendMessage("Tell me a joke");
```

## Terminal Voice Setup

For CLI applications with voice input/output:

### 1. Install the terminal agent

```bash
npm install -g terminal-agent
# or in your project
npm install terminal-agent
```

### 2. Configure and run

```bash
# Set your API key
export ELEVENLABS_API_KEY=your-api-key

# Run the terminal agent
terminal-agent

# Select "🎙️ Voice Conversation" from the menu
```

### 3. Voice controls

- **SPACE**: Push-to-talk (hold to record)
- **Type normally**: Mix text and voice input
- **/voice on|off**: Toggle voice mode
- **/voice list**: Show available voices
- **Ctrl+C**: Exit conversation

## Voice Service Configuration

### Basic Configuration

```typescript
const voiceService = elevenlabsVoiceService({
  apiKey: process.env.ELEVENLABS_API_KEY,
  defaultVoiceId: "21m00Tcm4TlvDq8ikWAM",
  defaultOptions: {
    stability: 0.75,        // Voice consistency (0-1)
    similarityBoost: 0.75,  // Voice clarity (0-1)
    style: 0.5,            // Voice expressiveness (0-1)
    useSpeakerBoost: true,
  },
});
```

### Available Voices

```typescript
// List all available voices
const voices = await voiceService.listVoices();
voices.forEach(voice => {
  console.log(`${voice.name} (${voice.id})`);
  console.log(`  Labels: ${voice.labels}`);
  console.log(`  Preview: ${voice.previewUrl}`);
});

// Popular voices:
// - Rachel (21m00Tcm4TlvDq8ikWAM) - Calm, American
// - Domi (AZnzlk1XvdvUeBnXmlld) - Strong, American
// - Bella (EXAVITQu4vr4xnSDxMaL) - Soft, American
// - Antoni (ErXwobaYiN019PkySvjV) - Well-rounded, American
// - Josh (TxGEqnHWrfWFTfGW9XjX) - Deep, American
```

### Voice Settings

```typescript
// Per-request voice customization
await agent.speak("Important announcement!", {
  voiceId: "TxGEqnHWrfWFTfGW9XjX", // Josh's deep voice
  stability: 0.9,        // More consistent for announcements
  similarityBoost: 0.9,  // Clearer pronunciation
  style: 0.3,           // Less expressive, more formal
});

// Speed and pitch control
await agent.speak("Speaking slowly and clearly", {
  speed: 0.8,  // 80% speed
  pitch: -2,   // Slightly lower pitch
});
```

## Mixed Modality

Enable users to type and speak in the same conversation:

```typescript
import { VoiceProgressIndicator } from "@mrck-labs/grid-core";

const indicator = new VoiceProgressIndicator();
let isRecording = false;

// Handle keyboard input
process.stdin.on("keypress", (str, key) => {
  if (key.name === "space") {
    if (!isRecording) {
      isRecording = true;
      indicator.startListening();
      // Start recording audio
      startRecording();
    }
  }
});

process.stdin.on("keyup", (str, key) => {
  if (key.name === "space" && isRecording) {
    isRecording = false;
    indicator.stopListening();
    // Stop recording and process
    const audio = await stopRecording();
    const transcript = await voiceService.transcribe(audio);
    
    // Merge with any typed text
    const mergedInput = combineInputs(typedText, transcript.text);
    const response = await agent.act({ 
      messages: [{ role: "user", content: mergedInput }] 
    });
  }
});
```

## Streaming Voice

For faster response times, use streaming synthesis:

```typescript
// Stream synthesis for long responses
const streamVoiceResponse = async (text: string) => {
  const chunks = text.match(/[^.!?]+[.!?]+/g) || [text];
  
  for (const chunk of chunks) {
    // Start synthesizing next chunk while current plays
    const audioPromise = voiceService.synthesize(chunk);
    
    // Process current chunk
    const audio = await audioPromise;
    await playAudio(audio);
  }
};

// Or use the built-in streaming
const response = await agent.act({
  messages: [{ role: "user", content: "Tell me a story" }],
  stream: true,
});

for await (const chunk of response) {
  if (chunk.type === "content") {
    // Synthesize and play incrementally
    await streamVoiceResponse(chunk.content);
  }
}
```

## Voice Progress Indicators

Provide visual feedback for voice operations:

```typescript
import { VoiceProgressIndicator } from "@mrck-labs/grid-core";

const voiceUI = new VoiceProgressIndicator();

// Show listening state
voiceUI.startListening();
// Shows: 🎤 Listening... [████████████████████]

// Show speaking state
voiceUI.startSpeaking();
// Shows: 🔊 Speaking... [▓▓▓▓▓▓▓▓░░░░░░░░░░░░]

// Show processing
voiceUI.startProcessing();
// Shows: 🤔 Processing... [⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]
```

## Error Handling

Handle voice-specific errors gracefully:

```typescript
import { VoiceServiceError } from "@mrck-labs/grid-core";

try {
  await agent.speak(response);
} catch (error) {
  if (error instanceof VoiceServiceError) {
    switch (error.code) {
      case "VOICE_NOT_FOUND":
        // Fall back to default voice
        await agent.speak(response, { 
          voiceId: "21m00Tcm4TlvDq8ikWAM" // Use a known default voice ID
        });
        break;
        
      case "QUOTA_EXCEEDED":
        // Fall back to text
        console.log("Voice quota exceeded. Response:", response);
        break;
        
      case "AUDIO_PLAYBACK_FAILED":
        // Try alternative playback method
        console.log("Audio playback failed:", response);
        break;
        
      default:
        console.error("Voice error:", error.message);
    }
  }
}

// Always provide text fallback
const respondWithVoice = async (text: string) => {
  try {
    if (agent.hasVoice() && voiceService.isAvailable()) {
      await agent.speak(text);
    } else {
      console.log(text);
    }
  } catch (error) {
    // Fallback to text
    console.log(text);
  }
};
```

## Performance Optimization

### 1. Voice Caching

Cache frequently used phrases:

```typescript
import { createCachedVoiceService } from "@mrck-labs/grid-core";

const cachedVoice = createCachedVoiceService(voiceService, {
  maxSize: 100,
  ttl: 3600000, // 1 hour
});

// Common phrases are cached
await cachedVoice.synthesize("Welcome back!"); // API call
await cachedVoice.synthesize("Welcome back!"); // From cache
```

### 2. Preloading

Preload voices for faster first response:

```typescript
// Preload during initialization
const initializeVoice = async () => {
  const voiceService = elevenlabsVoiceService({ /* config */ });
  
  // Preload default voice
  await voiceService.listVoices();
  
  // Warm up with a test synthesis
  await voiceService.synthesize(".", { 
    voiceId: "21m00Tcm4TlvDq8ikWAM" 
  });
  
  return voiceService;
};
```

### 3. Parallel Processing

Process voice and compute in parallel:

```typescript
const processVoiceQuery = async (userAudio: AudioData) => {
  // Start transcription and prepare agent in parallel
  const [transcript, _] = await Promise.all([
    voiceService.transcribe(userAudio),
    agent.prepare(), // Preload models, tools, etc.
  ]);
  
  // Get response
  const response = await agent.act({
    messages: [{ role: "user", content: transcript.text }],
  });
  
  // Start synthesis while logging
  const [audio] = await Promise.all([
    voiceService.synthesize(response.content),
    logConversation(transcript, response),
  ]);
  
  return audio;
};
```

## Advanced Features

### Voice Cloning (Premium)

```typescript
// Clone a voice from samples (ElevenLabs Pro)
const clonedVoice = await voiceService.cloneVoice(
  "Custom Voice",
  [audioFile1, audioFile2, audioFile3]
);

// Use the cloned voice
await agent.speak("Hello from your custom voice!", {
  voiceId: clonedVoice.id,
});
```

### Multi-language Support

```typescript
// Configure for multiple languages
const multilingualAgent = createConfigurableAgent({
  llmService,
  voiceService,
  config: {
    voice: {
      languages: ["en", "es", "fr", "de"],
      autoDetectLanguage: true,
    },
  },
});

// Speak in different languages
await agent.speak("Hello!", { language: "en" });
await agent.speak("¡Hola!", { language: "es" });
await agent.speak("Bonjour!", { language: "fr" });
```

### Voice Analytics

```typescript
// Track voice usage
const analyticsVoice = withAnalytics(voiceService, {
  onSynthesize: (text, duration, cost) => {
    analytics.track("voice.synthesize", {
      textLength: text.length,
      duration,
      estimatedCost: cost,
    });
  },
  onTranscribe: (duration, confidence) => {
    analytics.track("voice.transcribe", {
      duration,
      confidence,
    });
  },
});
```

## Best Practices

### 1. Optimize for Speech

```typescript
// Configure prompts for voice
const voicePrompts = {
  system: `You are a voice assistant. Follow these rules:
    - Keep responses under 3 sentences
    - Use simple, conversational language
    - Avoid URLs, code, or technical jargon
    - Use natural speech patterns
    - Add appropriate pauses with commas`,
};
```

### 2. Handle Interruptions

```typescript
let currentSynthesis: AbortController | null = null;

const speakInterruptible = async (text: string) => {
  // Cancel previous speech
  if (currentSynthesis) {
    currentSynthesis.abort();
  }
  
  currentSynthesis = new AbortController();
  
  try {
    await voiceService.synthesize(text, {
      signal: currentSynthesis.signal,
    });
  } catch (error) {
    if (error.name === "AbortError") {
      console.log("Speech interrupted");
    }
  }
};
```

### 3. Voice-First Design

```typescript
// Design conversations for voice
const voiceFirstAgent = createConfigurableAgent({
  llmService,
  voiceService,
  config: {
    prompts: {
      system: "Respond as if speaking. Use 'um' and 'uh' naturally.",
    },
    tools: {
      // Voice-friendly tool responses
      custom: [
        createNamedTool({
          name: "weather",
          description: "Get weather information",
          parameters: z.object({ location: z.string() }),
          execute: async ({ location }) => {
            const weather = await getWeather(location);
            // Return voice-friendly format
            return `It's ${weather.temp} degrees and ${weather.condition} in ${location}`;
          },
        }),
      ],
    },
  },
});
```

## Troubleshooting

### Common Issues

1. **No audio output**
   - Check sox installation: `sox --version`
   - Verify audio permissions
   - Test with: `sox -n synth 1 sine 440`

2. **Voice not found**
   - Verify API key is correct
   - Check voice ID exists: `await voiceService.listVoices()`
   - Use default voice as fallback

3. **Slow response times**
   - Use streaming synthesis
   - Reduce voice quality settings
   - Implement caching

4. **Transcription errors**
   - Check audio quality
   - Ensure proper microphone setup
   - Increase recording duration

### Debug Mode

```typescript
// Enable debug logging
const debugVoice = elevenlabsVoiceService({
  apiKey: process.env.ELEVENLABS_API_KEY,
  debug: true, // Logs all API calls
  onError: (error) => {
    console.error("Voice error:", error);
    // Send to error tracking
  },
});
```

## Next Steps

- [Voice Services API Reference](/docs/sdk-reference/services/voice-service)
- [Terminal Voice Commands](/docs/guides/terminal-voice)
- [Voice Service Architecture](/docs/core-concepts/voice-services)
- [Example Voice Agents](https://github.com/mrck-labs/grid/tree/main/examples/voice)