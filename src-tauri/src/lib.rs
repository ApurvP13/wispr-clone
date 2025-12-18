// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

use tauri::{AppHandle, Manager, Runtime};
use tauri_plugin_clipboard_manager::ClipboardExt;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

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
    
    // No need to emit events anymore
    Ok(())
}

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

#[tauri::command]
fn hide_recording_pill(app: tauri::AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "main window not found".to_string())?;

    window.hide().map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
async fn copy_and_paste_text(app: AppHandle, text: String) -> Result<(), String> {
    // Write to clipboard (Standard Tauri API)
    app.clipboard().write_text(text.clone())
        .map_err(|e| e.to_string())?;

    // 2. Use get_webview_window for Tauri v2
    // 3. Add <tauri::Wry> or use a generic R to help compiler infer the type
    if let Some(window) = app.get_webview_window("main") {
        window.hide().map_err(|e| e.to_string())?;
    }

    // Small delay to let focus shift back to the target app
    std::thread::sleep(std::time::Duration::from_millis(150));

    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
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

        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr).to_string());
        }
    }

    Ok(())
}

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
