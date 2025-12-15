// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

use tauri::Manager;


#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn show_recording_pill(app: tauri::AppHandle) -> Result<(), String> {
    // Find the main window or return an error if it doesn't exist
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "main window not found".to_string())?;

    // Resize the window and map any error to a String
    window
        .set_size(tauri::PhysicalSize::new(350, 70))
        .map_err(|e| e.to_string())?; // Small pill

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

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, show_recording_pill, show_transcript_pill])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
