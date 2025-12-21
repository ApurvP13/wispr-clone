//! Wispr Clone - Tauri Backend
//!
//! This module provides the Rust backend for the Wispr Clone application.
//! It handles window management, clipboard operations, and system-level integrations
//! required for the voice-to-text workflow.
//!
//! # Architecture
//!
//! The backend uses Tauri 2.0's command system to expose functionality to the
//! React frontend. Key responsibilities:
//!
//! - Window lifecycle management (show/hide/resize)
//! - Clipboard operations (copy text)
//! - System integration (macOS paste simulation)
//!
//! # Plugins
//!
//! - `tauri-plugin-opener`: For opening URLs/files
//! - `tauri-plugin-global-shortcut`: For registering global hotkeys
//! - `tauri-plugin-clipboard-manager`: For clipboard read/write operations

use tauri::{AppHandle, Manager};
use tauri_plugin_clipboard_manager::ClipboardExt;

/// Test command to verify Tauri communication
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// Shows the recording pill window in its initial state.
///
/// This command is called when the user presses the global hotkey (Alt+Space)
/// to start recording. The window is resized to 400x100px, centered on screen,
/// and made visible.
///
/// # Errors
///
/// Returns an error if the main window cannot be found or if any window
/// operation fails.
#[tauri::command]
fn show_recording_pill(app: tauri::AppHandle) -> Result<(), String> {
    println!("show_recording_pill called!");
    
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "main window not found".to_string())?;

    window
        .set_size(tauri::PhysicalSize::new(400, 100))
        .map_err(|e| e.to_string())?;

    window.center().map_err(|e| e.to_string())?;
    window.show().map_err(|e| e.to_string())?;

    println!("Window shown!");
    Ok(())
}

/// Shows the transcript pill window in its expanded state.
///
/// This command is used for testing the transcript UI. The window is resized
/// to 600x150px to accommodate longer transcript text, centered, and shown.
///
/// # Errors
///
/// Returns an error if the main window cannot be found or if any window
/// operation fails.
#[tauri::command]
fn show_transcript_pill(app: tauri::AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "main window not found".to_string())?;

    window
        .set_size(tauri::PhysicalSize::new(600, 150))
        .map_err(|e| e.to_string())?;

    window.center().map_err(|e| e.to_string())?;
    window.show().map_err(|e| e.to_string())?;

    Ok(())
}

/// Hides the recording pill window.
///
/// Called after transcription is complete and text has been pasted, or when
/// the user cancels recording (Escape key). The window is hidden but not
/// destroyed, allowing it to be shown again quickly.
///
/// # Errors
///
/// Returns an error if the main window cannot be found or if hiding fails.
#[tauri::command]
fn hide_recording_pill(app: tauri::AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "main window not found".to_string())?;

    window.hide().map_err(|e| e.to_string())?;
    
    Ok(())
}

/// Copies text to clipboard and automatically pastes it into the active application.
///
/// This is the core "Wispr-style" functionality. The function:
///
/// 1. Writes the transcribed text to the system clipboard
/// 2. Hides the Tauri window to return focus to the previously active app
/// 3. Waits 150ms for the OS to register the focus shift
/// 4. On macOS, simulates Cmd+V keystroke using AppleScript
///
/// # Architecture Decision
///
/// We hide the window before pasting because:
/// - The paste keystroke must be sent to the previously focused application
/// - Keeping our window focused would cause paste to fail
/// - The 150ms delay ensures macOS completes the focus transition
///
/// # Platform Support
///
/// Currently macOS-only. The paste simulation uses `osascript` which is
/// macOS-specific. Windows/Linux support would require platform-specific
/// implementations (SendInput API on Windows, xdotool on Linux).
///
/// # Errors
///
/// Returns an error if:
/// - Clipboard write fails
/// - Window hide fails
/// - macOS paste simulation fails (on macOS)
#[tauri::command]
async fn copy_and_paste_text(app: AppHandle, text: String) -> Result<(), String> {
    // Step 1: Write to clipboard using Tauri's clipboard plugin
    // The ClipboardExt trait must be imported for the clipboard() method
    app.clipboard()
        .write_text(text.clone())
        .map_err(|e| e.to_string())?;

    // Step 2: Hide the window to return focus to the previous application
    // This is crucial - the paste keystroke must go to the app that was
    // focused before our window appeared, not to our window
    if let Some(window) = app.get_webview_window("main") {
        window.hide().map_err(|e| e.to_string())?;
    }

    // Step 3: Small delay to ensure the OS registers the clipboard change
    // and completes the focus shift. Without this, paste may fail.
    // Tuned to 150ms based on testing - may need adjustment on slower systems
    std::thread::sleep(std::time::Duration::from_millis(150));

    // Step 4: Simulate Cmd+V keystroke (macOS only)
    // Uses AppleScript via osascript command to send keystroke to System Events
    // This works reliably across all macOS applications
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        
        // AppleScript to simulate Cmd+V
        // System Events is the macOS accessibility framework that handles
        // keyboard/mouse simulation
        let script = r#"
            tell application "System Events"
                keystroke "v" using command down
            end tell
        "#;
        
        let output = Command::new("osascript")
            .arg("-e")
            .arg(script)
            .output()
            .map_err(|e| format!("Process error: {}", e))?;

        // Check if osascript command succeeded
        // If not, return the error message from stderr
        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr).to_string());
        }
    }

    Ok(())
}

/// Main entry point for the Tauri application.
///
/// Initializes all plugins and registers command handlers. This function
/// is called by Tauri when the application starts.
///
/// # Plugins
///
/// - `tauri-plugin-opener`: Allows opening URLs/files from the frontend
/// - `tauri-plugin-global-shortcut`: Enables global hotkey registration
/// - `tauri-plugin-clipboard-manager`: Provides clipboard read/write capabilities
///
/// # Panics
///
/// Panics if Tauri application initialization fails. This should never happen
/// in normal operation and indicates a critical configuration error.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    println!("🚀 Tauri app starting...");
    
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            show_recording_pill,
            show_transcript_pill,
            hide_recording_pill,
            copy_and_paste_text
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
