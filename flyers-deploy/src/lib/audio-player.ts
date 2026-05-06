/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private nextStartTime: number = 0;
  private sampleRate: number = 24000; // Gemini default for voice
  public playbackRate: number = 1.0;

  constructor(sampleRate: number = 24000) {
    this.sampleRate = sampleRate;
  }

  private init() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: this.sampleRate,
      });
      this.nextStartTime = this.audioContext.currentTime;
    }
  }

  async playChunk(base64Data: string) {
    this.init();
    if (!this.audioContext) return;

    try {
      const pcmData = this.base64To16BitPCM(base64Data);
      const floatData = this.pcmToFloat32(pcmData);
      
      const buffer = this.audioContext.createBuffer(1, floatData.length, this.sampleRate);
      buffer.getChannelData(0).set(floatData);

      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = this.playbackRate;
      source.connect(this.audioContext.destination);

      const startTime = Math.max(this.nextStartTime, this.audioContext.currentTime);
      source.start(startTime);
      this.nextStartTime = startTime + (buffer.duration / this.playbackRate);
    } catch (err) {
      console.error('Error playing audio chunk:', err);
    }
  }

  stop() {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
      this.nextStartTime = 0;
    }
  }

  private base64To16BitPCM(base64: string): Int16Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return new Int16Array(bytes.buffer);
  }

  private pcmToFloat32(pcm: Int16Array): Float32Array {
    const float32 = new Float32Array(pcm.length);
    for (let i = 0; i < pcm.length; i++) {
        float32[i] = pcm[i] / (pcm[i] < 0 ? 0x8000 : 0x7FFF);
    }
    return float32;
  }
}
