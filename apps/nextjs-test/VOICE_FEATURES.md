# Voice Features in Next.js Test App

This Next.js app now includes voice capabilities powered by ElevenLabs, allowing users to interact with the AI assistant using both text and voice.

## Setup

1. **Environment Variables**
   Add your ElevenLabs API key to `.env.local`:
   ```
   ELEVENLABS_API_KEY=your-elevenlabs-api-key-here
   ```

2. **Run the App**
   ```bash
   pnpm --filter nextjs-test dev
   ```

## Features

### Voice Input
- **Push-to-Talk**: Hold the microphone button or press and hold SPACE to record
- **Automatic Transcription**: Voice is transcribed to text using ElevenLabs
- **Mixed Input**: Seamlessly switch between typing and speaking

### Voice Output  
- **Text-to-Speech**: AI responses can be spoken aloud
- **Auto-Speak Toggle**: Enable/disable automatic speech for responses
- **High-Quality Voices**: Uses ElevenLabs' Rachel voice by default

### Visual Feedback
- **Recording Indicator**: Pulsing red microphone while recording
- **Processing State**: Shows when audio is being processed
- **Speaking Indicator**: Shows when AI is speaking

## How to Use

1. **Voice Input**:
   - Click and hold the microphone button to record
   - OR hold the SPACE key while the input field is focused
   - Release to stop recording and send the message

2. **Text Input**:
   - Type normally in the input field
   - Press Enter or click Send to submit

3. **Voice Output**:
   - Toggle "Auto-speak responses" in the header
   - When enabled, AI responses will be spoken automatically

## Technical Implementation

- **Web Audio API**: For browser-based audio recording
- **MediaRecorder**: Captures microphone input in webm format
- **ElevenLabs API**: Handles both speech-to-text and text-to-speech
- **Server-Side Processing**: Audio processing happens in API routes
- **Base64 Encoding**: Audio data transmitted as base64 strings

## API Endpoints

- `/api/voice/transcribe` - Converts audio to text
- `/api/voice/synthesize` - Converts text to speech
- `/api/conversation` - Main conversation endpoint with voice support

## Browser Compatibility

- Works best in Chrome, Edge, and Firefox
- Requires microphone permissions
- HTTPS required for microphone access in production