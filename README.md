# Wispr Clone

A macOS desktop application that provides voice-to-text transcription with automatic clipboard paste functionality, inspired by [Wispr](https://www.wispr.ai/). Press a global hotkey, speak, and your words are automatically transcribed and pasted into the active application.

## Features

- 🎤 **Voice Recording**: Global hotkey (Alt+Space) to start recording
- 🧠 **Real-time Transcription**: Live transcription using Deepgram's Nova-2 model
- 📋 **Automatic Paste**: Transcribed text is automatically copied to clipboard and pasted into the active application
- 🎨 **Minimal UI**: Floating pill window that appears only when recording
- ⚡ **Low Latency**: Optimized for quick, seamless voice-to-text workflow
- 🔒 **Privacy-First**: Audio is streamed directly to Deepgram, no local storage

## Architecture

### Technology Stack

- **Frontend**: React 19 + TypeScript + Vite + TailwindCSS
- **Backend**: Rust + Tauri 2.0
- **Transcription**: Deepgram SDK (Nova-2 model)
- **Audio**: Web Audio API (MediaRecorder)

### Project Structure

```
wispr-clone/
├── src/                          # Frontend React application
│   ├── App.tsx                   # Main application component & hotkey setup
│   ├── hooks/
│   │   └── useVoiceRecording.ts  # Voice recording state management hook
│   └── services/
│       ├── deepgram.ts          # Deepgram WebSocket client wrapper
│       └── audio.ts              # Audio capture service
├── src-tauri/                    # Rust backend (Tauri)
│   ├── src/
│   │   └── lib.rs                # Tauri commands & window management
│   ├── capabilities/
│   │   └── default.json          # Tauri permissions configuration
│   └── tauri.conf.json          # Tauri app configuration
└── README.md                     # This file
```

### Architectural Decisions

#### 1. **Tauri 2.0 for Desktop Framework**

**Decision**: Use Tauri instead of Electron  
**Rationale**:

- Significantly smaller bundle size (~5MB vs ~100MB+)
- Better performance (native Rust backend)
- Lower memory footprint
- Better security model with capability-based permissions
- Native system integration for clipboard and global shortcuts

#### 2. **Deepgram for Transcription**

**Decision**: Use Deepgram's WebSocket API with Nova-2 model  
**Rationale**:

- High accuracy with low latency
- Real-time streaming transcription (interim + final results)
- Smart formatting and punctuation
- Configurable endpointing for natural speech detection
- WebSocket API allows continuous audio streaming

#### 3. **React Hook Pattern for State Management**

**Decision**: Custom `useVoiceRecording` hook instead of Redux/Context  
**Rationale**:

- Simpler state management for single-purpose feature
- Encapsulates all recording logic in one place
- Easy to test and maintain
- No unnecessary complexity for this use case

#### 4. **Window Management Strategy**

**Decision**: Single floating window that shows/hides rather than multiple windows  
**Rationale**:

- Mimics Wispr's UX pattern
- Reduces complexity
- Better performance (no window creation overhead)
- Seamless user experience

#### 5. **macOS-Specific Paste Implementation**

**Decision**: Use `osascript` to simulate Cmd+V keystroke  
**Rationale**:

- Works reliably across all macOS applications
- No need for application-specific integrations
- Simple and maintainable
- Focus returns to previous app automatically

**Trade-off**: Currently macOS-only. Windows/Linux support would require platform-specific implementations.

#### 6. **Audio Configuration**

**Decision**: 16kHz sample rate, WebM format, 250ms chunks  
**Rationale**:

- 16kHz is optimal for speech recognition (balances quality vs bandwidth)
- WebM is well-supported by browsers
- 250ms chunks provide good balance between latency and efficiency
- Echo cancellation and noise suppression enabled for better quality

#### 7. **Speech End Detection**

**Decision**: Use Deepgram's `speech_final` event with `UtteranceEnd` fallback  
**Rationale**:

- `speech_final` provides natural pause detection (1 second)
- `UtteranceEnd` ensures we capture text even if `speech_final` doesn't fire
- Prevents duplicate callbacks with `hasEndedRef` guard
- Configurable endpointing allows tuning for different speaking styles

## Setup Instructions

### Prerequisites

- **Node.js** 18+ and **pnpm** (or npm/yarn)
- **Rust** 1.70+ ([Install Rust](https://www.rust-lang.org/tools/install))
- **macOS** (currently macOS-only due to paste implementation)
- **Deepgram API Key** ([Get one here](https://console.deepgram.com/signup))

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd wispr-clone
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   ```bash
   # Create .env file in project root
   echo "VITE_DEEPGRAM_API_KEY=your_api_key_here" > .env
   ```

4. **Build and run**

   ```bash
   pnpm tauri dev
   ```

   For production build:

   ```bash
   pnpm tauri build
   ```

### Development

- **Frontend dev server**: Runs on `http://localhost:1420` (configured in `tauri.conf.json`)
- **Hot reload**: Both frontend and Rust code hot-reload during development
- **Rust compilation**: First build may take a few minutes to compile dependencies

### Global Hotkeys

- **Alt+Space**: Start recording (shows recording pill)
- **Alt+Shift+Space**: Test transcript UI (development only)
- **Escape**: Cancel recording and hide window

## Known Limitations

### 1. **macOS-Only Paste Implementation**

The automatic paste functionality uses macOS-specific `osascript` commands. Windows and Linux support would require:

- Windows: `SendInput` API or similar
- Linux: `xdotool` or `xte` (X11) / `ydotool` (Wayland)

**Workaround**: On non-macOS systems, text is still copied to clipboard; users must manually paste (Cmd+V / Ctrl+V).

### 2. **Requires Microphone Permissions**

The app requires microphone access. On first launch, macOS will prompt for permission. If denied, recording will fail.

### 3. **Requires Internet Connection**

Deepgram transcription requires an active internet connection. No offline mode available.

### 4. **Single Window Limitation**

The app uses a single window that resizes for different states. This means:

- Only one recording session at a time
- Window state changes may cause brief visual flicker

### 5. **Focus Management**

The app hides itself before pasting to return focus to the previous application. There's a 150ms delay to ensure focus shift completes. On slower systems, this may need adjustment.

### 6. **Speech End Detection**

The `speech_final` event fires after ~1 second of silence. Very fast speakers or noisy environments may trigger early endings or miss endings.

**Mitigation**: The `UtteranceEnd` event (1.5 second gap) provides a fallback, but may feel slow for some users.

### 7. **No Error Recovery**

If Deepgram connection fails mid-recording, the app doesn't automatically retry. User must manually restart recording.

### 8. **No Transcript History**

Transcribed text is not saved or stored. Once pasted, it's gone unless the user copies it manually.

## Development Journey & Decisions

### Initial Challenges

1. **Tauri v2 Migration**: Early in development, we migrated from Tauri v1 to v2, which required:

   - Updating API calls (`get_window` → `get_webview_window`)
   - New permission system (capabilities-based)
   - Plugin API changes

2. **Clipboard Plugin Integration**:

   - Initially tried using Tauri's core clipboard API, but needed explicit permissions
   - Discovered `ClipboardExt` trait must be imported for `clipboard()` method
   - Fixed permission names (`clipboard-manager:allow-read-text` vs `clipboard-manager:allow-read`)

3. **Speech End Detection**:

   - First implementation used only `is_final` flag, which fired too frequently
   - Switched to `speech_final` event for natural pause detection
   - Added `UtteranceEnd` fallback after missing some transcriptions
   - Implemented `hasEndedRef` guard to prevent duplicate callbacks

4. **Window Focus Management**:

   - Initially tried to keep window visible while pasting, but focus issues caused paste to fail
   - Solution: Hide window before pasting, add small delay for focus shift
   - Tuned delay from 100ms to 150ms for reliability

5. **Double-Start Prevention**:
   - Hotkey could be pressed multiple times, causing multiple recording sessions
   - Added `isStartingRef` guard to prevent concurrent starts
   - Cleanup old connections before starting new ones

### Why These Decisions Matter

- **Tauri over Electron**: Enables native-like performance and smaller bundle size, critical for a utility app that runs in the background
- **Deepgram streaming**: Provides real-time feedback (interim transcripts) which improves UX significantly
- **Single window**: Simpler codebase, easier to maintain, better performance
- **macOS-first**: Focused on getting one platform right before expanding (YAGNI principle)

## Contributing

Contributions welcome! Areas for improvement:

- [ ] Windows/Linux paste support
- [ ] Offline transcription fallback
- [ ] Transcript history
- [ ] Customizable hotkeys
- [ ] Multiple language support
- [ ] Error recovery and retry logic
- [ ] Settings/preferences UI

## License

[Add your license here]

## Acknowledgments

- Inspired by [Wispr](https://www.wispr.ai/)
- Built with [Tauri](https://tauri.app/)
- Powered by [Deepgram](https://www.deepgram.com/)
