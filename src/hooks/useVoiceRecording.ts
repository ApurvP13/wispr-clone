import { useState, useRef } from "react";
import { DeepgramService, TranscriptionCallbacks } from "../services/deepgram";
import { AudioService } from "../services/audio";

export function useVoiceRecording(apiKey: string) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deepgramRef = useRef<DeepgramService | null>(null);
  const audioServiceRef = useRef<AudioService>(new AudioService());
  const hasEndedRef = useRef(false); // Add this to prevent double-ending

  const startRecording = async () => {
    try {
      setError(null);
      setTranscript("");
      setIsRecording(true);
      hasEndedRef.current = false; // Reset the flag

      // Setup callbacks
      const callbacks: TranscriptionCallbacks = {
        onTranscript: (text, isFinal) => {
          setTranscript(text);
          console.log("Transcript:", text, "Final:", isFinal);
        },

        onSpeechEnd: async (finalText) => {
          // Prevent duplicate calls
          if (hasEndedRef.current) {
            console.log("⚠️ Speech end already handled, ignoring");
            return;
          }

          hasEndedRef.current = true;
          console.log("🎯 Speech ended, final text:", finalText);

          // IMPORTANT: Stop recording immediately
          audioServiceRef.current.stopRecording();
          await deepgramRef.current?.stop();

          setIsRecording(false);
          setIsProcessing(true);

          // Here you would:
          // 1. Copy to clipboard
          // 2. Paste into active window
          // 3. Hide the pill window

          setTimeout(() => {
            setIsProcessing(false);
            // Cleanup after processing
          }, 1000);
        },

        onError: (err) => {
          setError(err.message);
          setIsRecording(false);
        },
      };

      // Initialize Deepgram
      deepgramRef.current = new DeepgramService(apiKey, callbacks);
      await deepgramRef.current.start();

      // Start audio recording
      await audioServiceRef.current.startRecording((audioData) => {
        deepgramRef.current?.sendAudio(audioData);
      });
    } catch (err) {
      console.error("Failed to start recording:", err);
      setError("Failed to start recording");
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    console.log("🛑 Manually stopping recording");
    audioServiceRef.current.stopRecording();
    await deepgramRef.current?.stop();
    setIsRecording(false);
    hasEndedRef.current = false;
  };

  return {
    isRecording,
    transcript,
    isProcessing,
    error,
    startRecording,
    stopRecording,
  };
}
