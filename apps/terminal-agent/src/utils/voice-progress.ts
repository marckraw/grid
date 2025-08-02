import pc from "picocolors";
import * as p from "@clack/prompts";

export type VoiceState = "idle" | "listening" | "processing" | "speaking";

/**
 * Voice progress indicators and visualizations
 */
export class VoiceProgressIndicator {
  private currentState: VoiceState = "idle";
  private animationInterval?: NodeJS.Timeout;
  private frameIndex = 0;

  /**
   * Update the voice state and display appropriate indicator
   */
  setState(state: VoiceState, message?: string): void {
    this.clearAnimation();
    this.currentState = state;

    switch (state) {
      case "listening":
        this.showListening(message);
        break;
      case "processing":
        this.showProcessing(message);
        break;
      case "speaking":
        this.showSpeaking(message);
        break;
      case "idle":
        this.showIdle();
        break;
    }
  }

  /**
   * Show listening indicator with animated microphone
   */
  private showListening(message?: string): void {
    const frames = ["🎤", "🎙️", "🎤", "🎙️"];
    const waves = ["▁", "▃", "▅", "▇", "▅", "▃"];
    
    this.animationInterval = setInterval(() => {
      const icon = frames[this.frameIndex % frames.length];
      const wave = waves.map((w, i) => 
        waves[(i + this.frameIndex) % waves.length]
      ).join("");
      
      process.stdout.write(`\r${icon} ${pc.cyan("Listening")} ${wave} ${message || "Press SPACE to stop"}${" ".repeat(20)}`);
      this.frameIndex++;
    }, 200);
  }

  /**
   * Show processing indicator
   */
  private showProcessing(message?: string): void {
    const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
    
    this.animationInterval = setInterval(() => {
      const spinner = frames[this.frameIndex % frames.length];
      process.stdout.write(`\r${spinner} ${pc.yellow("Processing")} ${message || "Transcribing audio..."}${" ".repeat(20)}`);
      this.frameIndex++;
    }, 80);
  }

  /**
   * Show speaking indicator with sound waves
   */
  private showSpeaking(message?: string): void {
    const frames = ["🔊", "🔉", "🔊", "🔉"];
    const waves = [")", "))", ")))", "))", ")"];
    
    this.animationInterval = setInterval(() => {
      const icon = frames[this.frameIndex % frames.length];
      const wave = waves[this.frameIndex % waves.length];
      
      process.stdout.write(`\r${icon} ${pc.green("Speaking")} ${wave} ${message || "Playing response..."}${" ".repeat(20)}`);
      this.frameIndex++;
    }, 150);
  }

  /**
   * Show idle state
   */
  private showIdle(): void {
    process.stdout.write(`\r${pc.dim("💬 Ready - Press SPACE to speak or type a message")}${" ".repeat(30)}\r`);
  }

  /**
   * Clear current animation
   */
  private clearAnimation(): void {
    if (this.animationInterval) {
      clearInterval(this.animationInterval);
      this.animationInterval = undefined;
    }
    this.frameIndex = 0;
    // Clear the line
    process.stdout.write("\r" + " ".repeat(80) + "\r");
  }

  /**
   * Show error state
   */
  showError(message: string): void {
    this.clearAnimation();
    p.log.error(pc.red(`❌ ${message}`));
    setTimeout(() => this.setState("idle"), 2000);
  }

  /**
   * Show success message
   */
  showSuccess(message: string): void {
    this.clearAnimation();
    p.log.success(pc.green(`✓ ${message}`));
  }

  /**
   * Show info message without changing state
   */
  showInfo(message: string): void {
    const currentStateBackup = this.currentState;
    this.clearAnimation();
    p.log.info(pc.blue(`ℹ ${message}`));
    
    // Restore previous state after a short delay
    setTimeout(() => this.setState(currentStateBackup), 100);
  }

  /**
   * Clean up
   */
  cleanup(): void {
    this.clearAnimation();
  }

  /**
   * Get current state
   */
  get state(): VoiceState {
    return this.currentState;
  }
}

/**
 * Display audio level meter
 */
export function showAudioLevel(level: number, maxLevel: number = 100): string {
  const normalizedLevel = Math.min(level / maxLevel, 1);
  const barLength = 20;
  const filledBars = Math.round(normalizedLevel * barLength);
  
  const bar = "█".repeat(filledBars) + "░".repeat(barLength - filledBars);
  const color = normalizedLevel > 0.8 ? pc.red : 
                 normalizedLevel > 0.5 ? pc.yellow : 
                 pc.green;
  
  return color(bar);
}

/**
 * Format transcription confidence
 */
export function formatConfidence(confidence?: number): string {
  if (confidence === undefined) return "";
  
  const percentage = Math.round(confidence * 100);
  const color = confidence > 0.9 ? pc.green :
                confidence > 0.7 ? pc.yellow :
                pc.red;
  
  return color(`${percentage}%`);
}