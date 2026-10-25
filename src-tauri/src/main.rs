//! The native shell of HLBINA (GAME_SPEC F6): one window with the web build inside. The game
//! keeps its saves in the web view's local storage, as in a browser.

// No console window next to the game on Windows release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("HLBINA could not start");
}
