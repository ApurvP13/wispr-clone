import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import Lottie from "lottie-react";
import recordingAnimation from "./assets/recordingAnimation.json";
import "./App.css";
import { LoaderCircle } from "lucide-react";
import { register, unregister } from "@tauri-apps/plugin-global-shortcut";
import { listen } from "@tauri-apps/api/event";
import { useVoiceRecording } from "./hooks/useVoiceRecording";

const DEEPGRAM_API_KEY = import.meta.env.VITE_DEEPGRAM_API_KEY as string;

function App() {
  const {
    isRecording,
    transcript,
    isProcessing,
    error,
    startRecording,
    stopRecording,
  } = useVoiceRecording(DEEPGRAM_API_KEY);

  useEffect(() => {
    const setup = async () => {
      console.log("=== SETUP STARTING ===");

      try {
        // Register Alt+Space hotkey for recording
        await register("Alt+Space", async () => {
          console.log("🔥 Alt+Space PRESSED! 🔥");
          try {
            // Show window
            await invoke("show_recording_pill");

            // Start recording
            await startRecording();
          } catch (e) {
            console.error("Failed:", e);
          }
        });

        // Keep Alt+Shift+Space for testing transcript UI
        await register("Alt+Shift+Space", async () => {
          console.log("🔥 Alt+Shift+Space PRESSED (Test) 🔥");
          try {
            await invoke("show_transcript_pill");
          } catch (e) {
            console.error("Failed:", e);
          }
        });

        await register("Escape", async () => {
          if (isRecording) {
            console.log("🚫 Recording cancelled by user");
            await stopRecording();
            await invoke("hide_recording_pill");
          }
        });

        console.log("✅ Hotkeys registered successfully!");
      } catch (error) {
        console.error("❌ Setup failed:", error);
      }
    };

    setup();

    // Cleanup: unregister hotkeys when component unmounts
    return () => {
      console.log("Cleanup: unregistering hotkeys...");
      unregister("Alt+Space").catch(console.error);
      unregister("Alt+Shift+Space").catch(console.error);
    };
  }, []); // Empty dependency array - run once on mount

  return (
    <div className="w-screen bg-transparent flex h-screen text-white items-center justify-center">
      {/* Recording Animation */}
      {isRecording && (
        <div className="flex flex-col items-center gap-3 bg-gradient-to-r from-red-500 to-pink-500 rounded-full px-8 py-5 shadow-2xl">
          <div className="flex items-center gap-3">
            <Lottie
              animationData={recordingAnimation}
              style={{ width: 40, height: 40 }}
              loop={true}
            />
            <span className="font-semibold text-lg">Listening...</span>
          </div>
          {transcript && (
            <p className="text-sm text-white/90 max-w-md text-center">
              {transcript}
            </p>
          )}
        </div>
      )}

      {/* Processing Loader */}
      {isProcessing && (
        <div className="flex items-center gap-3 bg-blue-500 rounded-full px-8 py-5 shadow-2xl">
          <div className="animate-spin">
            <LoaderCircle className="size-6" />
          </div>
          <span className="font-semibold">Processing...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-500 text-white rounded-full px-8 py-5 shadow-2xl">
          <span className="font-semibold">Error: {error}</span>
        </div>
      )}

      {/* Idle/Ready State */}
      {!isRecording && !isProcessing && !error && (
        <div className="bg-white text-gray-800 rounded-full px-8 py-5 shadow-2xl">
          <span className="font-semibold">Press Option+Space to speak</span>
        </div>
      )}
    </div>
  );
}

export default App;
