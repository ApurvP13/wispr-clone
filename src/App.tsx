import { useState } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

function App() {
  const [isRecording, setIsRecording] = useState(true);

  async function show_recording() {
    await invoke("show_recording_pill");
  }

  async function show_transcript() {
    await invoke("show_transcript_pill");
  }

  return (
    <div className="w-screen bg-zinc-950 flex flex-col rounded-full h-screen text-white  items-center justify-center">
      {isRecording && (
        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
      )}
    </div>
  );
}

export default App;
