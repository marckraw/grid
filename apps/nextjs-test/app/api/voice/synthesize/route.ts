import { NextRequest, NextResponse } from 'next/server';
import { elevenlabsVoiceService } from '@mrck-labs/grid-core';

export async function POST(request: NextRequest) {
  try {
    const { text, voiceId, options } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // Initialize ElevenLabs voice service
    const voiceService = elevenlabsVoiceService({
      apiKey: process.env.ELEVENLABS_API_KEY,
      defaultVoiceId: voiceId || '21m00Tcm4TlvDq8ikWAM', // Rachel voice
    });

    // Synthesize the text
    const audioResult = await voiceService.synthesize(text, {
      voiceId: voiceId,
      ...options,
    });

    // Convert audio data to base64 for transmission
    const base64Audio = Buffer.from(audioResult.data as Uint8Array).toString('base64');

    return NextResponse.json({
      success: true,
      audio: base64Audio,
      format: audioResult.format,
      metadata: audioResult.metadata,
    });

  } catch (error) {
    console.error('Synthesis error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to synthesize speech',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// List available voices
export async function GET() {
  try {
    const voiceService = elevenlabsVoiceService({
      apiKey: process.env.ELEVENLABS_API_KEY,
    });

    const voices = await voiceService.listVoices();

    return NextResponse.json({
      success: true,
      voices: voices.map(voice => ({
        id: voice.id,
        name: voice.name,
        description: voice.description,
        previewUrl: voice.previewUrl,
        labels: voice.labels,
      })),
    });

  } catch (error) {
    console.error('Error listing voices:', error);
    return NextResponse.json(
      { 
        error: 'Failed to list voices',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}