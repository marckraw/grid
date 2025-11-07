import { spawn } from "child_process";
import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { randomBytes } from "crypto";
import type { AudioInput, AudioResult } from "@mrck-labs/grid-core";

export interface TerminalVoiceConfig {
  recordingDevice?: string; // Optional specific recording device
  playbackCommand?: string; // Override default playback command
  sampleRate?: number; // Audio sample rate (default: 16000)
  channels?: number; // Audio channels (default: 1 for mono)
}

/**
 * Terminal voice service for handling audio I/O in the terminal
 */
export class TerminalVoiceService {
  private config: TerminalVoiceConfig;
  private isRecording = false;
  private recordingProcess?: any;
  private tempFiles: string[] = [];

  constructor(config: TerminalVoiceConfig = {}) {
    this.config = {
      sampleRate: 16000,
      channels: 1,
      ...config,
    };
  }

  /**
   * Start recording audio from microphone
   * Returns a promise that resolves with the recorded audio when stopped
   */
  async startRecording(): Promise<{ stop: () => Promise<AudioInput> }> {
    if (this.isRecording) {
      throw new Error("Already recording");
    }

    this.isRecording = true;
    const tempFile = join(tmpdir(), `recording-${randomBytes(8).toString("hex")}.wav`);
    this.tempFiles.push(tempFile);

    // Use sox to record audio (cross-platform)
    const args = [
      "-d", // Default audio device
      "-r", this.config.sampleRate!.toString(), // Sample rate
      "-c", this.config.channels!.toString(), // Channels
      "-t", "wav", // Output format
      tempFile, // Output file
    ];

    if (this.config.recordingDevice) {
      args.unshift("-t", this.config.recordingDevice);
    }

    this.recordingProcess = spawn("sox", args);

    this.recordingProcess.on("error", (error: Error) => {
      console.error("Recording error:", error);
      this.isRecording = false;
    });

    // Return control object
    return {
      stop: async (): Promise<AudioInput> => {
        if (!this.isRecording || !this.recordingProcess) {
          throw new Error("Not recording");
        }

        // Stop recording
        this.recordingProcess.kill("SIGTERM");
        this.isRecording = false;
        this.recordingProcess = undefined; // Clear the process reference

        // Wait a bit for file to be written
        await new Promise(resolve => setTimeout(resolve, 500)); // Increased wait time
        
        console.log(`Audio file saved to: ${tempFile}`);

        // Return audio input pointing to the file
        return {
          data: tempFile,
          format: "wav",
          dataType: "filepath",
          sampleRate: this.config.sampleRate,
          channels: this.config.channels,
        };
      },
    };
  }

  /**
   * Play audio result through speakers
   */
  async playAudio(audio: AudioResult): Promise<void> {
    const tempFile = join(tmpdir(), `playback-${randomBytes(8).toString("hex")}.${audio.format}`);
    this.tempFiles.push(tempFile);

    // Write audio data to temp file
    let buffer: Buffer;
    const dataAny = audio.data as unknown;
    if (Buffer.isBuffer(dataAny)) {
      buffer = dataAny as Buffer;
    } else if (dataAny instanceof Uint8Array) {
      buffer = Buffer.from(dataAny as Uint8Array);
    } else if (dataAny instanceof ArrayBuffer) {
      buffer = Buffer.from(new Uint8Array(dataAny as ArrayBuffer));
    } else if (typeof dataAny === "string") {
      buffer = Buffer.from(dataAny as string);
    } else {
      throw new Error("Unsupported audio data type for playback");
    }
    await writeFile(tempFile, buffer);

    // Determine playback command based on platform
    let command: string;
    let args: string[];

    if (this.config.playbackCommand) {
      // Use custom command
      const parts = this.config.playbackCommand.split(" ");
      command = parts[0];
      args = [...parts.slice(1), tempFile];
    } else if (process.platform === "darwin") {
      // macOS
      command = "afplay";
      args = [tempFile];
    } else if (process.platform === "win32") {
      // Windows
      command = "powershell";
      args = ["-c", `(New-Object Media.SoundPlayer "${tempFile}").PlaySync()`];
    } else {
      // Linux/Unix - try multiple options
      command = "play"; // Sox play command
      args = [tempFile];
    }

    return new Promise((resolve, reject) => {
      const playProcess = spawn(command, args);

      playProcess.on("error", (error) => {
        // If 'play' fails on Linux, try 'aplay'
        if (process.platform === "linux" && command === "play") {
          const aplayProcess = spawn("aplay", [tempFile]);
          
          aplayProcess.on("error", reject);
          aplayProcess.on("close", (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Audio playback failed with code ${code}`));
          });
        } else {
          reject(error);
        }
      });

      playProcess.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Audio playback failed with code ${code}`));
      });
    });
  }

  /**
   * Check if recording is available
   */
  async isRecordingAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const checkProcess = spawn("sox", ["--version"]);
      
      checkProcess.on("error", () => resolve(false));
      checkProcess.on("close", (code) => resolve(code === 0));
    });
  }

  /**
   * Check if playback is available
   */
  async isPlaybackAvailable(): Promise<boolean> {
    // Just check if we can determine a playback command
    if (this.config.playbackCommand) return true;
    
    if (process.platform === "darwin" || process.platform === "win32") {
      return true; // Built-in commands
    }
    
    // Check for play command on Linux
    return new Promise((resolve) => {
      const checkProcess = spawn("which", ["play"]);
      checkProcess.on("error", () => resolve(false));
      checkProcess.on("close", (code) => resolve(code === 0));
    });
  }

  /**
   * Clean up temporary files
   */
  async cleanup(): Promise<void> {
    // Stop recording if active
    if (this.isRecording && this.recordingProcess) {
      this.recordingProcess.kill("SIGTERM");
      this.isRecording = false;
    }

    // Delete temp files
    for (const file of this.tempFiles) {
      try {
        await unlink(file);
      } catch (error) {
        // Ignore errors, file might already be deleted
      }
    }
    this.tempFiles = [];
  }

  /**
   * Get recording status
   */
  get recording(): boolean {
    return this.isRecording;
  }
}