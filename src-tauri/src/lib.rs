// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

use tauri::Manager;
use tauri::Emitter;


#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn show_recording_pill(app: tauri::AppHandle) -> Result<(), String> {
    println!("show_recording_pill called!"); // Debug log
    
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "main window not found".to_string())?;

    println!("Window found, resizing..."); // Debug log
    
    window
        .set_size(tauri::PhysicalSize::new(350, 70))
        .map_err(|e| e.to_string())?;

    window.center().map_err(|e| e.to_string())?;
    window.show().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())?;

    println!("Window shown!"); // Debug log
    
    app.emit("recording_started", true)
        .map_err(|e| e.to_string())?;

    Ok(())
}

// Add a hide command too
#[tauri::command]
fn hide_recording_pill(app: tauri::AppHandle) -> Result<(), String> {
    // let window = app
    //     .get_webview_window("main")
    //     .ok_or_else(|| "main window not found".to_string())?;

    // window.hide().map_err(|e| e.to_string())?;
    
    // // Notify frontend
    // app.emit("recording_stopped", false)
    //     .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn show_transcript_pill(app: tauri::AppHandle) -> Result<(), String> {
    // Find the main window or return an error if it doesn't exist
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "main window not found".to_string())?;

    // Resize the window and map any error to a String
    window
        .set_size(tauri::PhysicalSize::new(500, 120))
        .map_err(|e| e.to_string())?; // Bigger for text
    
    app.emit("recording_stopped", false)
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            greet, 
            show_recording_pill, 
            show_transcript_pill,
            hide_recording_pill  // Add this
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
