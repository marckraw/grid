---
slug: voice-integration-launch
title: Introducing Voice Capabilities in Grid 🎙️
authors: [grid-team]
tags: [release, voice, elevenlabs, features]
---

# Introducing Voice Capabilities in Grid 🎙️

We're excited to announce that Grid now supports voice interactions! This major update brings natural speech synthesis and recognition to your AI agents, enabling more intuitive and accessible conversations.

<!-- truncate -->

## What's New

Grid agents can now:
- **Speak** their responses using natural-sounding voices
- **Listen** to voice input (speech-to-text)
- **Mix modalities** - seamlessly blend voice and text in the same conversation
- **Stream audio** for faster response times

## Powered by ElevenLabs

Our initial implementation leverages ElevenLabs' industry-leading voice technology, providing:
- High-quality, natural-sounding voices
- Multiple voice options with different personalities
- Real-time streaming synthesis
- Multi-language support
- Voice cloning capabilities (Pro accounts)

## Quick Example

Making your agents speak is as simple as adding a voice service:

```typescript
import { 
  createConfigurableAgent,
  elevenlabsVoiceService 
} from "@mrck-labs/grid-core";

// Create voice service
const voiceService = elevenlabsVoiceService({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

// Create voice-enabled agent
const agent = createConfigurableAgent({
  llmService,
  voiceService, // That's it!
  config: {
    voice: {
      enabled: true,
      autoSpeak: true, // Automatically speak responses
    }
  }
});

// Agent responses are now spoken automatically
await agent.act("Tell me about the weather");
```

## Terminal Voice Experience

We've also built a complete voice conversation experience for the terminal:

```bash
# Install dependencies
brew install sox  # macOS
# or
sudo apt-get install sox libsox-fmt-all  # Linux

# Run terminal agent
npx terminal-agent

# Select "🎙️ Voice Conversation"
# Press SPACE to talk!
```

Features include:
- Push-to-talk with the SPACE key
- Beautiful ASCII animations for voice states
- Mixed modality - type while the assistant speaks
- Voice selection from available ElevenLabs voices
- Built-in voice commands (/voice on|off|list)

## Key Features

### 1. Service-Based Architecture

Voice follows Grid's established patterns - it's just another service:

```typescript
const agent = createConfigurableAgent({
  llmService,      // Required
  toolExecutor,    // Required
  voiceService,    // Optional - enables voice!
  config: { /* ... */ }
});
```

### 2. Graceful Degradation

Voice features degrade gracefully when unavailable:

```typescript
if (agent.hasVoice()) {
  await agent.speak("Hello!");
} else {
  console.log("Hello!");
}
```

### 3. Streaming Support

Stream synthesis for faster responses:

```typescript
for await (const chunk of voiceService.streamSynthesize(text)) {
  await playAudioChunk(chunk);
}
```

### 4. Mixed Modality

Users can type and speak in the same conversation, inspired by ElevenLabs' own interface:

- Speak naturally for most content
- Type while speaking for URLs, technical terms, names
- System intelligently merges both inputs

## Use Cases

### Customer Support
```typescript
const supportAgent = createConfigurableAgent({
  voiceService,
  config: {
    prompts: {
      system: "You are a friendly customer support agent..."
    },
    voice: {
      voiceId: "21m00Tcm4TlvDq8ikWAM", // Warm, friendly voice
      defaultOptions: {
        stability: 0.8,
        style: 0.6, // More expressive
      }
    }
  }
});
```

### Educational Assistants
```typescript
const tutorAgent = createConfigurableAgent({
  voiceService,
  config: {
    prompts: {
      system: "You are a patient tutor. Speak slowly and clearly..."
    },
    voice: {
      defaultOptions: {
        speed: 0.9, // Slower pace
        stability: 0.9, // Clearer pronunciation
      }
    }
  }
});
```

### Accessibility
Voice enables Grid agents to be more accessible to users with:
- Visual impairments
- Mobility limitations
- Dyslexia or reading difficulties
- Preferences for audio learning

## Architecture Highlights

The implementation follows Grid's architectural principles:

1. **Closure-based services** - No classes, just functions
2. **Provider abstraction** - Easy to add more voice providers
3. **Type-safe** - Full TypeScript support
4. **Testable** - Mock voice services for testing
5. **Observable** - Integrated with Grid's telemetry

## Performance Optimization

We've implemented several optimizations:

- **Voice caching** for repeated phrases
- **Parallel processing** of voice and compute
- **Streaming synthesis** for long responses
- **Smart chunking** for natural speech flow

## What's Next

This is just the beginning! Our roadmap includes:

- Additional voice providers (Azure, Google, AWS)
- Voice activity detection (VAD) for hands-free interaction
- Emotion and tone analysis
- Voice-based authentication
- Multi-speaker conversations
- Ambient listening mode
- Real-time translation

## Getting Started

Ready to add voice to your agents? Check out:

- [Voice Integration Guide](/docs/guides/voice-integration) - Step-by-step setup
- [Voice Services Docs](/docs/core-concepts/voice-services) - Architecture details
- [API Reference](/docs/sdk-reference/services/voice-service) - Complete API docs
- [Example Code](https://github.com/mrck-labs/grid/tree/main/examples/voice) - Working examples

## Feedback Welcome!

We'd love to hear about your voice use cases and experiences. Please:

- [Open an issue](https://github.com/mrck-labs/grid/issues) for bugs or features
- [Join our Discord](https://discord.gg/grid-community) to discuss voice features
- [Share your voice agents](https://github.com/mrck-labs/grid/discussions) with the community

## Special Thanks

A huge thank you to:
- The ElevenLabs team for their amazing voice API
- Our early testers who provided invaluable feedback
- The community for inspiring this feature

Happy voice coding! 🎙️✨