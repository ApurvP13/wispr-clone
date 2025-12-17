// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

use tauri::Manager;



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
    window.set_focus().map_err(|e| e.to_string())?;

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
    window.set_focus().map_err(|e| e.to_string())?;

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
async fn copy_and_paste_text(app: tauri::AppHandle, text: String) -> Result<(), String> {
    println!("📋 Copying text: {}", text);
    
    // Write to clipboard
    app.clipboard()
        .write_text(text)
        .map_err(|e| e.to_string())?;
    
    println!("✅ Text copied to clipboard");
    
    // Simulate Cmd+V (macOS) to paste
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        
        // Use osascript to simulate paste
        let script = r#"
            tell application "System Events"
                keystroke "v" using command down
            end tell
        "#;
        
        Command::new("osascript")
            .arg("-e")
            .arg(script)
            .output()
            .map_err(|e| format!("Failed to paste: {}", e))?;
        
        println!("✅ Paste command sent");
    }
    
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    println!("🚀 Tauri app starting...");
    
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
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
