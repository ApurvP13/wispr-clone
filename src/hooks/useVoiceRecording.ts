import { useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { DeepgramService, TranscriptionCallbacks } from "../services/deepgram";
import { AudioService } from "../services/audio";

export function useVoiceRecording(apiKey: string) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deepgramRef = useRef<DeepgramService | null>(null);
  const audioServiceRef = useRef<AudioService>(new AudioService());
  const hasEndedRef = useRef(false);
  const isStartingRef = useRef(false); // Prevent double-start

  const startRecording = async () => {
    // Prevent starting if already recording or starting
    if (isStartingRef.current || isRecording) {
      console.log("⚠️ Already recording or starting, ignoring");
      return;
    }

    isStartingRef.current = true;

    try {
      // Clean up any existing connections first
      if (deepgramRef.current) {
        console.log("🧹 Cleaning up old connection");
        await deepgramRef.current.stop();
        deepgramRef.current = null;
      }

      setError(null);
      setTranscript("");
      setIsRecording(true);
      hasEndedRef.current = false;

      const callbacks: TranscriptionCallbacks = {
        onTranscript: (text, isFinal) => {
          setTranscript(text);
          console.log("Transcript:", text, "Final:", isFinal);
        },

        onSpeechEnd: async (finalText) => {
          if (hasEndedRef.current) {
            console.log("⚠️ Speech end already handled, ignoring");
            return;
          }

          hasEndedRef.current = true;
          console.log("🎯 Speech ended, final text:", finalText);

          // Stop recording
          audioServiceRef.current.stopRecording();
          await deepgramRef.current?.stop();
          deepgramRef.current = null; // Clear reference

          setIsRecording(false);
          setIsProcessing(true);

          // Copy to clipboard and paste
          try {
            await invoke("copy_and_paste_text", { text: finalText });
            console.log("✅ Text copied and pasted!");

            // Wait a bit then hide window and reset
            setTimeout(async () => {
              await invoke("hide_recording_pill");
              setIsProcessing(false);
              setTranscript("");
              isStartingRef.current = false; // Allow next recording
            }, 1000);
          } catch (err) {
            console.error("Failed to copy/paste:", err);
            setError("Failed to paste text");
            setIsProcessing(false);
            isStartingRef.current = false;
          }
        },

        onError: (err) => {
          console.error("Recording error:", err);
          setError(err.message);
          setIsRecording(false);
          isStartingRef.current = false;
        },
      };

      deepgramRef.current = new DeepgramService(apiKey, callbacks);
      await deepgramRef.current.start();

      await audioServiceRef.current.startRecording((audioData) => {
        deepgramRef.current?.sendAudio(audioData);
      });

      isStartingRef.current = false;
    } catch (err) {
      console.error("Failed to start recording:", err);
      setError("Failed to start recording");
      setIsRecording(false);
      isStartingRef.current = false;
    }
  };

  const stopRecording = async () => {
    console.log("🛑 Manually stopping recording");
    audioServiceRef.current.stopRecording();
    await deepgramRef.current?.stop();
    deepgramRef.current = null;
    setIsRecording(false);
    hasEndedRef.current = false;
    isStartingRef.current = false;
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
