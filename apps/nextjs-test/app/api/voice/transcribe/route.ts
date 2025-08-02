import { NextRequest, NextResponse } from 'next/server';
import { elevenlabsVoiceService } from '@mrck-labs/grid-core';

export async function POST(request: NextRequest) {
  try {
    // Get the audio data from the request
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    
    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Initialize ElevenLabs voice service
    const voiceService = elevenlabsVoiceService({
      apiKey: process.env.ELEVENLABS_API_KEY,
    });

    // Convert File to ArrayBuffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const audioData = new Uint8Array(arrayBuffer);

    // Transcribe the audio
    const transcription = await voiceService.transcribe({
      data: audioData,
      format: 'webm', // Browser MediaRecorder typically outputs webm
      dataType: 'buffer',
    });

    return NextResponse.json({
      success: true,
      text: transcription.text,
      confidence: transcription.confidence,
    });

  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to transcribe audio',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}