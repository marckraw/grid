# ElevenLabs Voice Integration for Grid

> A comprehensive exploration of adding voice capabilities to Grid's agent primitives using ElevenLabs API

## Vision

Imagine Grid agents that can:
- **Listen** to voice input (speech-to-text)
- **Think** using LLMs (existing capability)
- **Speak** their responses (text-to-speech via ElevenLabs)
- Have actual **conversations** with natural voice interactions
- **Mix modalities** - seamlessly blend voice and text in the same conversation

## Architecture Overview

### Current Flow
```
User Input (text) → Agent → LLM → Response (text)
```

### With Voice Integration
```
Voice Input → STT → Agent → LLM → Response → TTS → Voice Output
     ↓                  ↑                          ↑
Text Input  ─────────────┘                        │
     ↓                                            │
Mixed Modality ──────────────────────────────────┘
```

## Integration Patterns

### Option A: Agent-Level Integration
```typescript
// Voice capabilities directly on agents
const agent = createConfigurableAgent({
  // ... existing config
  voice: {
    enabled: true,
    voiceId: 'eleven-labs-voice-id',
    service: elevenlabsVoiceService
  }
});

await agent.listen();   // Start listening
await agent.speak(text); // Speak response
```

### Option B: Service Layer (Recommended)
```typescript
// Create VoiceService similar to LLMService
interface VoiceService {
  // Core capabilities
  synthesize(text: string, options: VoiceOptions): Promise<AudioStream>;
  transcribe(audio: AudioStream): Promise<TranscriptionResult>;
  
  // Streaming capabilities
  streamSynthesize(text: string, options: VoiceOptions): AsyncGenerator<AudioChunk>;
  streamTranscribe(audioStream: AudioStream): AsyncGenerator<TranscriptionChunk>;
  
  // Voice management
  listVoices(): Promise<Voice[]>;
  cloneVoice?(audioSamples: AudioData[]): Promise<Voice>;
  
  // Real-time features
  detectSpeechEnd?(audio: AudioStream): Promise<boolean>;
  detectInterruption?(audio: AudioStream): Promise<boolean>;
}

// Base implementation
export const baseVoiceService = (config: BaseVoiceServiceConfig): VoiceService => {
  // Implementation using ElevenLabs API
};
```

### Option C: Wrapper/Decorator Pattern
```typescript
// Enhance existing agents with voice
const voiceAgent = agent.withVoice({
  voiceId: 'eleven-labs-voice-id',
  voiceService: elevenlabsVoiceService,
  features: {
    allowInterruption: true,
    detectEndOfSpeech: true,
    mixedModalityMerge: true,
  }
});
```

## Mixed Modality Design

### The ElevenLabs Approach
ElevenLabs brilliantly allows users to:
1. Speak naturally for most content
2. Type while speaking for URLs, technical terms, names
3. Seamlessly merge both inputs into coherent messages

### Message Structure for Mixed Modality
```typescript
interface MultiModalMessage {
  role: 'user' | 'assistant';
  content: string;           // The final merged content
  modality: 'text' | 'voice' | 'mixed';
  segments?: Array<{
    type: 'text' | 'voice';
    content: string;
    timestamp: number;
    confidence?: number;    // for voice transcription
  }>;
  audio?: {
    url?: string;          // for playback
    duration?: number;
    voiceId?: string;
  };
}
```

### Example Mixed Modality Flow
1. User starts speaking: "Can you help me debug this error on..."
2. User types while speaking: "github.com/marckraw/grid"
3. User continues speaking: "...in the agent flow service?"
4. System merges: "Can you help me debug this error on github.com/marckraw/grid in the agent flow service?"

## State Management

```typescript
interface VoiceConversationState {
  // Voice state
  isListening: boolean;
  isSpeaking: boolean;
  isTyping: boolean;
  
  // Current message composition
  currentComposition: {
    voiceBuffer: string;      // Current voice transcription
    textBuffer: string;       // Current typed text
    mergeStrategy: 'append' | 'replace' | 'smart';
    lastActivityTime: number;
  };
  
  // Audio state
  audioQueue: AudioChunk[];
  currentPlaybackPosition?: number;
  
  // Interruption handling
  wasInterrupted: boolean;
  interruptionPoint?: number;
}
```

## Implementation Concepts

### Voice-Enabled Conversation Loop
```typescript
const voiceConversation = createVoiceConversation({
  agent,
  voiceService: elevenlabsVoiceService,
  voice: {
    id: "eleven-labs-voice-id",
    settings: {
      stability: 0.7,
      similarity_boost: 0.8,
      style: 0.5,
    }
  },
  stt: {
    provider: "whisper", // or browser native
    language: "en",
  },
  features: {
    mixedModality: true,
    allowInterruption: true,
    autoDetectSpeechEnd: true,
  }
});

// Start real-time conversation
voiceConversation.start();

// Events
voiceConversation.on('userSpeaking', (transcript) => { });
voiceConversation.on('userTyping', (text) => { });
voiceConversation.on('agentSpeaking', (text) => { });
voiceConversation.on('interrupted', (at) => { });
```

### Progress Updates for Voice
```typescript
// Enhanced progress updates
sendUpdate({
  type: 'listening',
  content: 'Listening...',
  audioLevel: 0.7,        // Current audio input level
  voiceActivity: true,    // Is voice detected
});

sendUpdate({
  type: 'transcribing',
  content: 'Converting speech to text...',
  partial: 'Can you help me with...',  // Partial transcription
});

sendUpdate({
  type: 'speaking', 
  content: 'Let me help you with that...',
  progress: 0.45,         // How much has been spoken
  wordTimings: [...],     // For visual highlighting
  audioUrl: 'https://...', // For playback control
});
```

## Smart Merging Strategies

### Temporal Merging
- Insert typed text at the current speech position
- Maintain chronological order of inputs

### Contextual Merging
- Use AI to understand optimal placement
- Consider grammar and sentence structure

### Example Scenarios
```typescript
// Scenario 1: URL insertion
Voice: "Check out the documentation at"
Type: "docs.grid.ai/voice"
Voice: "for more details"
Result: "Check out the documentation at docs.grid.ai/voice for more details"

// Scenario 2: Technical terms
Voice: "The error is in the"
Type: "createConfigurableAgent"
Voice: "factory function"
Result: "The error is in the createConfigurableAgent factory function"

// Scenario 3: Mixed language
Voice: "The German word"
Type: "Schadenfreude"
Voice: "means joy from others' misfortune"
Result: "The German word Schadenfreude means joy from others' misfortune"
```

## Key Features & Possibilities

### 1. Accessibility First
- Voice for users with typing difficulties
- Text for quiet environments or hearing impairments
- Perfect hybrid for all users

### 2. Enhanced Tool Calling
```typescript
// Voice + Text for complex tool calls
Voice: "Calculate twenty-three times"
Type: "47.5"
Voice: "and round to nearest integer"

// Agent understands: calculator({ expression: "23 * 47.5", round: true })
```

### 3. Emotional Context
- Detect emotion/tone in voice
- Adjust agent response style
- More empathetic interactions

### 4. Multi-language Support
- Switch languages mid-conversation
- Translate in real-time
- Preserve voice characteristics across languages

### 5. Voice Memory
- Remember how things were said
- Recognize speech patterns
- Personalize responses based on voice data

## Technical Considerations

### Performance
- **Latency**: Stream audio while generating
- **Buffering**: Handle network fluctuations
- **Caching**: Common phrases, voice profiles
- **Compression**: Optimize audio data transfer

### Privacy & Security
- **Local vs Cloud**: Where does processing happen?
- **Data Storage**: Voice samples and transcriptions
- **User Consent**: Clear privacy policies
- **Encryption**: Secure audio transmission

### Error Handling
```typescript
// Graceful degradation
if (voiceService.isAvailable()) {
  await agent.speak(response);
} else {
  // Fallback to text
  display(response);
}

// Network resilience
try {
  const audio = await voiceService.synthesize(text);
} catch (error) {
  if (error.code === 'NETWORK_ERROR') {
    // Queue for later or use cached version
  }
}
```

### Browser Compatibility
- WebRTC for real-time streaming
- Web Audio API for playback control
- MediaRecorder API for voice input
- Fallbacks for older browsers

## Future Enhancements

### 1. Voice Cloning
- Users can create custom voices
- Brand-specific agent voices
- Personalized interactions

### 2. Ambient Sound Integration
- Background music for context
- Sound effects for actions
- Spatial audio for immersion

### 3. Voice-First Workflows
```typescript
const phoneAgent = createPhoneAgent({
  agent: customerServiceAgent,
  phoneNumber: '+1-555-GRID-AI',
  voiceService: elevenlabsVoiceService,
});
```

### 4. Real-time Translation
- Speak in one language
- Agent responds in another
- Preserve voice characteristics

## Implementation Roadmap

### Phase 1: Core Voice Service
- [ ] Define VoiceService interface
- [ ] Implement ElevenLabs adapter
- [ ] Basic TTS functionality
- [ ] Basic STT integration

### Phase 2: Agent Integration
- [ ] Add voice methods to agents
- [ ] Implement voice state management
- [ ] Create voice-enabled conversation loop
- [ ] Handle interruptions

### Phase 3: Mixed Modality
- [ ] Implement merge strategies
- [ ] Build unified message format
- [ ] Create UI components
- [ ] Test edge cases

### Phase 4: Advanced Features
- [ ] Voice cloning support
- [ ] Emotion detection
- [ ] Multi-language handling
- [ ] Performance optimization

## Example Use Cases

### Customer Support
```typescript
const supportAgent = createVoiceEnabledAgent({
  // ... config
  voice: {
    personality: 'friendly',
    pace: 'moderate',
    emphasis: 'empathetic',
  }
});
```

### Educational Assistant
```typescript
const tutorAgent = createVoiceEnabledAgent({
  // ... config
  voice: {
    personality: 'encouraging',
    pace: 'slow',
    pronunciation: 'clear',
  }
});
```

### Coding Assistant
```typescript
const codingAgent = createVoiceEnabledAgent({
  // ... config
  voice: {
    personality: 'professional',
    pace: 'dynamic', // Faster for code, slower for explanations
    terminology: 'technical',
  }
});
```

## Conclusion

Integrating ElevenLabs voice capabilities into Grid would transform agents from text-based assistants into truly conversational partners. The mixed modality approach, inspired by ElevenLabs' own interface, provides the best of both worlds - natural speech for fluid communication and text input for precision.

This integration would make Grid agents more:
- **Accessible**: Supporting users regardless of their preferred input method
- **Natural**: Enabling human-like conversations with emotion and context
- **Powerful**: Combining the strengths of voice and text interactions
- **Flexible**: Adapting to different use cases and environments

The future of agent interaction is multi-modal, and Grid is perfectly positioned to lead this evolution.