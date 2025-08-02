/**
 * Web Audio Player for browser-based audio playback
 */

export class WebAudioPlayer {
  private audioContext: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private isPlaying = false;

  constructor() {
    // Initialize AudioContext on first user interaction
    if (typeof window !== 'undefined' && window.AudioContext) {
      this.audioContext = new AudioContext();
    }
  }

  /**
   * Play audio from a blob
   */
  async play(audioBlob: Blob): Promise<void> {
    if (!this.audioContext) {
      throw new Error('AudioContext not available');
    }

    // Stop any currently playing audio
    this.stop();

    try {
      // Convert blob to ArrayBuffer
      const arrayBuffer = await audioBlob.arrayBuffer();
      
      // Decode audio data
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      // Create source node
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      
      // Set up event handlers
      source.onended = () => {
        this.isPlaying = false;
        this.currentSource = null;
      };
      
      // Start playback
      source.start(0);
      this.currentSource = source;
      this.isPlaying = true;
      
      // Resume context if it was suspended
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      throw new Error('Failed to play audio');
    }
  }

  /**
   * Play audio from base64 string
   */
  async playBase64(base64Audio: string, mimeType: string = 'audio/mp3'): Promise<void> {
    // Convert base64 to blob
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const audioBlob = new Blob([bytes], { type: mimeType });
    return this.play(audioBlob);
  }

  /**
   * Stop currently playing audio
   */
  stop(): void {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch (error) {
        // Ignore error if already stopped
      }
      this.currentSource = null;
      this.isPlaying = false;
    }
  }

  /**
   * Check if audio is currently playing
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// Singleton instance
let audioPlayerInstance: WebAudioPlayer | null = null;

/**
 * Get or create the audio player instance
 */
export function getAudioPlayer(): WebAudioPlayer {
  if (!audioPlayerInstance) {
    audioPlayerInstance = new WebAudioPlayer();
  }
  return audioPlayerInstance;
}