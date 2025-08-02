/**
 * Audio utility functions for converting and processing audio data
 */

/**
 * Convert a webm audio blob to WAV format for better compatibility
 * This is needed because ElevenLabs works better with WAV files
 */
export async function convertWebmToWav(webmBlob: Blob): Promise<Blob> {
  // For now, we'll pass through the webm blob as ElevenLabs also accepts it
  // In a production app, you might want to use a library like lamejs or ffmpeg.wasm
  // to do actual conversion
  return webmBlob;
}

/**
 * Convert audio blob to base64 string for transmission
 */
export async function audioToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      // Remove data URL prefix to get just the base64 content
      const base64Content = base64.split(',')[1];
      resolve(base64Content);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert base64 string back to audio blob
 */
export function base64ToAudio(base64: string, mimeType: string = 'audio/mp3'): Blob {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return new Blob([bytes], { type: mimeType });
}

/**
 * Get audio duration from a blob
 */
export async function getAudioDuration(blob: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const objectUrl = URL.createObjectURL(blob);
    
    audio.addEventListener('loadedmetadata', () => {
      URL.revokeObjectURL(objectUrl);
      resolve(audio.duration);
    });
    
    audio.addEventListener('error', () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load audio'));
    });
    
    audio.src = objectUrl;
  });
}