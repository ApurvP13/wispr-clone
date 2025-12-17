export class AudioService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;

  async startRecording(
    onAudioData: (data: ArrayBuffer) => void
  ): Promise<void> {
    try {
      // Get microphone access
      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000, // Deepgram works well with 16kHz
        },
      });

      // Create MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.audioStream, {
        mimeType: "audio/webm",
      });

      // Send audio chunks as they become available
      this.mediaRecorder.addEventListener("dataavailable", async (event) => {
        if (event.data.size > 0) {
          const arrayBuffer = await event.data.arrayBuffer();
          onAudioData(arrayBuffer);
        }
      });

      // Start recording in chunks (250ms intervals)
      this.mediaRecorder.start(250);

      console.log("🎤 Recording started");
    } catch (error) {
      console.error("Failed to start recording:", error);
      throw error;
    }
  }

  stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
      console.log("🎤 Recording stopped");
    }

    if (this.audioStream) {
      this.audioStream.getTracks().forEach((track) => track.stop());
      this.audioStream = null;
    }

    this.mediaRecorder = null;
  }
}
