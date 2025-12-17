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
        endpointing: 800, // 300ms pause for speech_final
        utterance_end_ms: 1500, // 1 second gap for UtteranceEnd
        punctuate: true,
        language: "en-US",
      });

      // Connection opened
      this.connection.on(LiveTranscriptionEvents.Open, () => {
        console.log("✅ Deepgram connection opened");
      });

      // Receiving transcripts
      this.connection.on(LiveTranscriptionEvents.Transcript, (data: any) => {
        const transcript = data.channel?.alternatives[0]?.transcript || "";

        if (!transcript) return;

        const isFinal = data.is_final;
        const speechFinal = data.speech_final;

        console.log({
          transcript,
          isFinal,
          speechFinal,
        });

        if (speechFinal) {
          // Check if we already processed speech_final
          if (this.hasSpeechFinal) {
            console.log(
              "⚠️ speech_final already processed, ignoring duplicate"
            );
            return;
          }

          console.log("✅ speech_final=true, closing connection");
          this.hasSpeechFinal = true;
          this.finalTranscript +=
            (this.finalTranscript ? " " : "") + transcript;

          this.callbacks.onTranscript(this.finalTranscript, true);

          // Close connection safely
          if (this.connection && this.connection.getReadyState() === 1) {
            try {
              this.connection.finish();
            } catch (err) {
              console.warn("Error closing connection:", err);
            }
          }

          this.callbacks.onSpeechEnd(this.finalTranscript);
          return;
        } else if (isFinal) {
          // Only process if we haven't ended yet
          if (this.hasSpeechFinal) return;

          this.finalTranscript +=
            (this.finalTranscript ? " " : "") + transcript;
          this.callbacks.onTranscript(this.finalTranscript, true);
        } else {
          // Only process interim if we haven't ended yet
          if (this.hasSpeechFinal) return;

          this.interimTranscript = transcript;
          const combined =
            this.finalTranscript +
            (this.finalTranscript ? " " : "") +
            this.interimTranscript;
          this.callbacks.onTranscript(combined, false);
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
