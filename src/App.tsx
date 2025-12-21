/**
 * Wispr Clone - Main Application Component
 *
 * This is the root React component for the Wispr Clone application.
 * It handles global hotkey registration, UI state management, and
 * coordinates between the voice recording hook and Tauri backend.
 *
 * # Features
 *
 * - Global hotkey registration (Alt+Space to start recording)
 * - Visual feedback during recording (animation + transcript)
 * - Processing state indicator
 * - Error handling and display
 *
 * # Architecture
 *
 * The component uses a custom hook (`useVoiceRecording`) to manage
 * all recording logic, keeping this component focused on UI and
 * hotkey coordination. Window management is handled by Tauri commands
 * called via `invoke()`.
 *
 * # Hotkeys
 *
 * - **Alt+Space**: Start recording (shows window and begins transcription)
 * - **Alt+Shift+Space**: Test transcript UI (development only)
 * - **Escape**: Cancel recording and hide window
 *
 * @module App
 */

import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import Lottie from "lottie-react";
import recordingAnimation from "./assets/recordingAnimation.json";
import "./App.css";
import { LoaderCircle } from "lucide-react";
import { register, unregister } from "@tauri-apps/plugin-global-shortcut";
import { useVoiceRecording } from "./hooks/useVoiceRecording";

// Deepgram API key from environment variables
// Must be set in .env file: VITE_DEEPGRAM_API_KEY=your_key_here
const DEEPGRAM_API_KEY = import.meta.env.VITE_DEEPGRAM_API_KEY as string;

/**
 * Main application component.
 *
 * Sets up global hotkeys on mount and manages the UI state based on
 * recording status. The component renders different UI states:
 *
 * - Recording: Shows animation and live transcript
 * - Processing: Shows loading spinner after speech ends
 * - Error: Shows error message
 * - Idle: Shows instruction text
 *
 * @returns {JSX.Element} The rendered application UI
 */
function App() {
  const {
    isRecording,
    transcript,
    isProcessing,
    error,
    startRecording,
    stopRecording,
  } = useVoiceRecording(DEEPGRAM_API_KEY);

  /**
   * Effect hook: Register global hotkeys on component mount.
   *
   * Sets up three global hotkeys:
   * 1. Alt+Space: Primary recording trigger
   * 2. Alt+Shift+Space: Test transcript UI (dev only)
   * 3. Escape: Cancel recording
   *
   * Hotkeys are registered asynchronously and unregistered on unmount
   * to prevent memory leaks and ensure clean teardown.
   *
   * # Architecture Decision
   *
   * We register hotkeys in useEffect rather than at app startup because:
   * - React component lifecycle ensures proper cleanup
   * - Hotkeys can be re-registered if component remounts
   * - Easier to test and debug
   *
   * Empty dependency array ensures this runs only once on mount.
   */
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

        // Development hotkey: Alt+Shift+Space to test transcript UI
        // Useful for testing the transcript pill appearance without recording
        await register("Alt+Shift+Space", async () => {
          console.log("🔥 Alt+Shift+Space PRESSED (Test) 🔥");
          try {
            await invoke("show_transcript_pill");
          } catch (e) {
            console.error("Failed:", e);
          }
        });

        // Cancel hotkey: Escape to stop recording and hide window
        // Only active when recording is in progress
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

    // Cleanup: Unregister all hotkeys when component unmounts
    // This prevents hotkeys from persisting after app closes
    return () => {
      console.log("Cleanup: unregistering hotkeys...");
      unregister("Alt+Space").catch(console.error);
      unregister("Alt+Shift+Space").catch(console.error);
      unregister("Escape").catch(console.error);
    };
  }, []); // Empty dependency array - run once on mount

  /**
   * Render the application UI based on current state.
   *
   * The UI has four distinct states:
   * 1. Recording: Shows animation (if no transcript) or live transcript
   * 2. Processing: Shows spinner after speech ends, before paste
   * 3. Error: Shows error message in red pill
   * 4. Idle: Shows instruction text (hidden when window is hidden)
   *
   * The window is transparent by default (configured in tauri.conf.json)
   * and only shows content when recording or processing.
   */
  return (
    <div className="w-screen bg-transparent flex h-screen text-white items-center justify-center">
      {/* Recording State: Shows animation or live transcript */}
      {isRecording && (
        <div className="flex flex-col items-center gap-3 w-full bg-neutral-900 px-8 py-5 shadow-2xl">
          {/* Show animation only when no transcript is available yet */}
          {!transcript && (
            <div className="flex items-center gap-3">
              <Lottie
                animationData={recordingAnimation}
                style={{ width: 80, height: 80 }}
                loop={true}
              />
            </div>
          )}
          {/* Show live transcript as it's being transcribed */}
          {transcript && (
            <p className="text-sm text-neutral-700 overflow-hidden text-balance w-full text-center">
              {transcript}
            </p>
          )}
        </div>
      )}

      {/* Processing State: Shown after speech ends, before paste */}
      {isProcessing && (
        <div className="flex items-center gap-3 bg-blue-500 rounded-full px-8 py-5 shadow-2xl">
          <div className="animate-spin">
            <LoaderCircle className="size-6" />
          </div>
          <span className="font-semibold">Processing...</span>
        </div>
      )}

      {/* Error State: Shows error message */}
      {error && (
        <div className="bg-red-500 text-white rounded-full px-8 py-5 shadow-2xl">
          <span className="font-semibold">Error: {error}</span>
        </div>
      )}

      {/* Idle State: Instruction text (typically hidden when window is hidden) */}
      {!isRecording && !isProcessing && !error && (
        <div className="bg-white text-gray-800 rounded-full px-8 py-5 shadow-2xl">
          <span className="font-semibold">Press Option+Space to speak</span>
        </div>
      )}
    </div>
  );
}

export default App;
