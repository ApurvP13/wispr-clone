import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";

export interface TranscriptionCallbacks {
  onTranscript: (text: string, isFinal: boolean) => void;
  onSpeechEnd: (finalText: string) => void;
  onError: (error: Error) => void;
}

export class DeepgramService {
  private connection: any = null;
  private apiKey: string;
  private finalTranscript: string = "";
  private interimTranscript: string = "";
  private callbacks: TranscriptionCallbacks;
  private hasSpeechFinal: boolean = false;

  constructor(apiKey: string, callbacks: TranscriptionCallbacks) {
    this.apiKey = apiKey;
    this.callbacks = callbacks;
  }

  async start() {
    try {
      const deepgram = createClient(this.apiKey);

      // Create WebSocket connection
      this.connection = deepgram.listen.live({
        model: "nova-2",
        interim_results: true,
        smart_format: true,
        endpointing: 1000, // 300ms pause for speech_final
        utterance_end_ms: 1500, // 1 second gap for UtteranceEnd
        punctuate: true,
        language: "en-US",
      });

      // Connection opened
      this.connection.on(LiveTranscriptionEvents.Open, () => {
        console.log("✅ Deepgram connection opened");
      });

      // Receiving transcripts
      // Receiving transcripts
      this.connection.on(LiveTranscriptionEvents.Transcript, (data: any) => {
        const transcript = data.channel?.alternatives[0]?.transcript || "";
        if (!transcript) return;

        const isFinal = data.is_final;
        const speechFinal = data.speech_final;

        // 1. If it's a FINAL chunk, commit it to our permanent record
        if (isFinal) {
          this.finalTranscript +=
            (this.finalTranscript ? " " : "") + transcript;
          this.interimTranscript = ""; // Clear interim because it's now final
          this.callbacks.onTranscript(this.finalTranscript, true);
        } else {
          // 2. Otherwise, it's INTERIM (predictive). Show it but don't save it.
          this.interimTranscript = transcript;
          const displayResult =
            this.finalTranscript +
            (this.finalTranscript ? " " : "") +
            this.interimTranscript;
          this.callbacks.onTranscript(displayResult, false);
        }

        // 3. speech_final is just our "Trigger" to finish the UX flow
        if (speechFinal && !this.hasSpeechFinal) {
          console.log("🎯 Sentence complete, finishing up...");
          this.hasSpeechFinal = true;

          // Crucial: Use the current state of finalTranscript
          this.callbacks.onSpeechEnd(this.finalTranscript);
          this.stop();
        }
      });

      // UtteranceEnd event - backup for speech_final
      this.connection.on(LiveTranscriptionEvents.UtteranceEnd, () => {
        console.log("🔚 UtteranceEnd detected");

        // Only use UtteranceEnd if we didn't get speech_final
        if (!this.hasSpeechFinal && this.finalTranscript) {
          this.callbacks.onSpeechEnd(this.finalTranscript);
        }
      });

      // Error handling
      this.connection.on(LiveTranscriptionEvents.Error, (error: any) => {
        console.error("Deepgram error:", error);
        this.callbacks.onError(new Error(error.message || "Deepgram error"));
      });

      // Connection closed
      this.connection.on(LiveTranscriptionEvents.Close, () => {
        console.log("❌ Deepgram connection closed");
      });
    } catch (error) {
      console.error("Failed to start Deepgram:", error);
      this.callbacks.onError(error as Error);
    }
  }

  // Send audio data to Deepgram
  sendAudio(audioData: ArrayBuffer) {
    if (this.connection && this.connection.getReadyState() === 1) {
      this.connection.send(audioData);
    }
  }

  // Stop recording and close connection
  async stop() {
    if (this.connection && this.connection.getReadyState() === 1) {
      try {
        this.connection.finish();
      } catch (err) {
        console.warn("Error finishing connection:", err);
      }
    }

    this.connection = null;

    // Reset state
    this.finalTranscript = "";
    this.interimTranscript = "";
    this.hasSpeechFinal = false;
  }

  reset() {
    this.finalTranscript = "";
    this.interimTranscript = "";
    this.hasSpeechFinal = false;
  }
}
