/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";
import { AudioRecorder } from "./audio-recorder";
import { AudioPlayer } from "./audio-player";

export interface LiveSessionConfig {
  voiceName?: string;
  topic?: string;
  playbackRate?: number;
  onTranscription?: (text: string, role: 'user' | 'model') => void;
  onStatusChange?: (status: 'disconnected' | 'connecting' | 'connected' | 'error') => void;
  onVolumeChange?: (volume: number) => void;
  onSpeaking?: (isSpeaking: boolean) => void;
}

export class GeminiLiveSession {
  private ai: GoogleGenAI;
  private session: any = null;
  private recorder: AudioRecorder | null = null;
  private player: AudioPlayer | null = null;
  private config: LiveSessionConfig;

  constructor(apiKey: string, config: LiveSessionConfig = {}) {
    this.ai = new GoogleGenAI({ apiKey });
    this.config = config;
  }

  async start() {
    this.config.onStatusChange?.('connecting');
    this.player = new AudioPlayer(24000);
    if (this.config.playbackRate) {
      this.player.playbackRate = this.config.playbackRate;
    }
    
    const topicInstruction = this.config.topic 
      ? `Start the conversation by focusing on the topic: ${this.config.topic}.` 
      : "Start by greeting them warmly and asking if they are ready to practice Part 4.";

    try {
      this.session = await this.ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        callbacks: {
          onopen: () => {
            this.config.onStatusChange?.('connected');
            this.startRecording();
          },
          onmessage: async (message: LiveServerMessage) => {
            // console.log('Live Message:', JSON.stringify(message)); // Deep log for debugging

            const content = message.serverContent;

            // Handle model output (audio and transcription)
            if (content?.modelTurn) {
              this.config.onSpeaking?.(true);
              if (content.modelTurn.parts) {
                for (const part of content.modelTurn.parts) {
                  if (part.inlineData?.data) {
                    this.player?.playChunk(part.inlineData.data);
                  }
                  if (part.text) {
                    this.config.onTranscription?.(part.text, 'model');
                  }
                }
              }
            }

            // Handle user transcription
            if ((content as any)?.userTurn) {
              if ((content as any).userTurn.parts) {
                for (const part of (content as any).userTurn.parts) {
                  if (part.text) {
                    this.config.onTranscription?.(part.text, 'user');
                  }
                }
              }
            }
            
            // Check for additional transcription fields that might exist in different API versions
            // @ts-ignore
            if (message.modelDraft?.parts) {
               // @ts-ignore
               for (const part of message.modelDraft.parts) {
                  if (part.text) {
                     this.config.onTranscription?.(part.text, 'model');
                  }
               }
            }

            // Fallback for legacy or different versions
            // @ts-ignore
            if ((content as any)?.modelTurn?.text) {
               this.config.onTranscription?.((content as any).modelTurn.text, 'model');
            }
            // @ts-ignore
            if ((content as any)?.userTurn?.text) {
               this.config.onTranscription?.((content as any).userTurn.text, 'user');
            }

            if (content?.turnComplete) {
              this.config.onSpeaking?.(false);
            }

            // Handle interruption
            if (content?.interrupted) {
              this.player?.stop();
              // Re-init player for next chunks
              this.player = new AudioPlayer(24000);
            }
          },
          onclose: () => {
            this.stop();
            this.config.onStatusChange?.('disconnected');
          },
          onerror: (err) => {
            console.error('Live API Error:', err);
            this.config.onStatusChange?.('error');
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { 
              prebuiltVoiceConfig: { voiceName: this.config.voiceName || "Zephyr" } 
            },
          },
          systemInstruction: `You are a supportive and professional Cambridge English: Flyers Speaking examiner for Part 4.
Your objective is to help students practice answering personal questions (A2 level).

EXAM RULES:
1. Ask one question at a time.
2. Questions should be personal: school, home, family, hobbies, holidays, friends.
3. **FEEDBACK LOOP (MANDATORY)**: After every student response, you MUST:
   a. Give a warm compliment or encouragement.
   b. Provide specific, gentle feedback based on the Flyers rubric for:
      - **Pronunciation**: Clarity and correct sounds.
      - **Vocabulary**: Choice of words.
      - **Grammar**: Sentence structure and tenses.
   c. Then, ask the next question or a follow-up.

FLYERS SPEAKING RUBRIC GUIDES:
- **Vocabulary & Grammar**: Encourage using full sentences (e.g., 'I like playing football' instead of just 'football'). Correct simple tense errors (present simple/past simple) gently.
- **Interaction/Detail**: If they give short answers, explain WHY it's better to give more info for the exam.
- **Pronunciation**: If a word is mispronounced, say it correctly and ask them to try saying it again if appropriate, or just model it in your praise.

${topicInstruction}
Greet them as their Flyers Speaking Buddy.`,
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
      });
    } catch (err) {
      console.error('Failed to connect to Live API:', err);
      this.config.onStatusChange?.('error');
      throw err;
    }
  }

  private startRecording() {
    this.recorder = new AudioRecorder((base64Data) => {
      if (this.session) {
        this.session.sendRealtimeInput({
          audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
        });
      }
    }, (volume) => {
      this.config.onVolumeChange?.(volume);
    });
    this.recorder.start();
  }

  stop() {
    if (this.recorder) {
      this.recorder.stop();
      this.recorder = null;
    }
    if (this.player) {
      this.player.stop();
      this.player = null;
    }
    if (this.session) {
      this.session.close();
      this.session = null;
    }
    this.config.onStatusChange?.('disconnected');
  }

  setPlaybackRate(rate: number) {
    if (this.player) {
      this.player.playbackRate = rate;
    }
  }
}
