import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import Lottie from "lottie-react";
import recordingAnimation from "./assets/recordingAnimation.json";
import "./App.css";
import { LoaderCircle } from "lucide-react";
import { register, unregister } from "@tauri-apps/plugin-global-shortcut";
import { listen } from "@tauri-apps/api/event";

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // Changed to false

  useEffect(() => {
    let unlistenStart: (() => void) | undefined;
    let unlistenStop: (() => void) | undefined;

    const setup = async () => {
      console.log("=== SETUP STARTING ===");

      try {
        // Listen for recording started
        unlistenStart = await listen<boolean>("recording_started", () => {
          console.log("Recording started event received");
          setIsRecording(true);
          setIsProcessing(false);
        });

        // Listen for recording stopped
        unlistenStop = await listen<boolean>("recording_stopped", () => {
          console.log("Recording stopped event received");
          setIsRecording(false);
          setIsProcessing(true);
        });

        console.log("Event listeners set up");

        // Register hotkey
        console.log("Attempting to register hotkey Alt+Shift+Space...");
        await register("Alt+Space", async () => {
          console.log("🔥 HOTKEY PRESSED! 🔥");
          try {
            await invoke("show_recording_pill");
            console.log("Show Invoke successful");
          } catch (e) {
            console.error("Invoke failed:", e);
          }
        });

        await register("Alt+Shift+Space", async () => {
          console.log("🔥 HOTKEY PRESSED! 🔥");
          try {
            await invoke("show_transcript_pill");
            console.log("Transcript Invoke successful");
          } catch (e) {
            console.error("Invoke failed:", e);
          }
        });

        console.log("✅ Hotkey registered successfully!");
      } catch (error) {
        console.error("❌ Setup failed:", error);
      }
    };

    setup();

    return () => {
      console.log("Cleanup running...");
      if (unlistenStart) unlistenStart();
      if (unlistenStop) unlistenStop();
      unregister("Alt+Shift+Space").catch((e) => {
        console.error("Unregister failed:", e);
      });
    };
  }, []);

  return (
    <div className="w-screen bg-transparent flex h-screen text-white items-center justify-center">
      {/* Recording Animation */}
      {isRecording && (
        <div className="flex items-center justify-center gap-2 bg-red-500 rounded-full px-6 py-4">
          <Lottie
            animationData={recordingAnimation}
            style={{ width: 50, height: 50 }}
          />
          <span className="font-semibold">Recording...</span>
        </div>
      )}

      {/* Processing Loader */}
      {isProcessing && (
        <div className="flex items-center justify-evenly w-full h-full gap-2 bg-blue-500  px-6 py-4">
          <div className="animate-spin">
            <LoaderCircle className="size-6" />
          </div>
          <span className="font-semibold">Processing...</span>
        </div>
      )}

      {/* Idle State */}
      {!isRecording && !isProcessing && (
        <div className="bg-white w-full h-full text-gray-800 rounded-full px-6 py-4">
          <span className="font-semibold">Press Option+Space</span>
        </div>
      )}
    </div>
  );
}

export default App;
