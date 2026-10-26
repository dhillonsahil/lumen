use crate::state::AppState;
use lumen_core::error::LumenError;
use lumen_library::{HistoryItem, LibraryItem};
use std::path::Path;
use tauri::State;

#[tauri::command]
pub async fn get_recent_history(
    limit: Option<usize>,
    state: State<'_, AppState>,
) -> Result<Vec<HistoryItem>, LumenError> {
    state.library.get_recent_history(limit.unwrap_or(50))
}

#[tauri::command]
pub async fn get_library_items(state: State<'_, AppState>) -> Result<Vec<LibraryItem>, LumenError> {
    state.library.get_all_library_items()
}

#[tauri::command]
pub async fn scan_library_folder(
    path: String,
    state: State<'_, AppState>,
) -> Result<Vec<LibraryItem>, LumenError> {
    state.library.scan_folder(Path::new(&path))
}

#[tauri::command]
pub async fn search_library(
    query: String,
    state: State<'_, AppState>,
) -> Result<Vec<LibraryItem>, LumenError> {
    state.library.search_library(&query)
}

#[tauri::command]
pub async fn remove_library_item(id: i64, state: State<'_, AppState>) -> Result<(), LumenError> {
    state.library.remove_library_item(id)
}

#[tauri::command]
pub async fn get_continue_watching(
    state: State<'_, AppState>,
) -> Result<Vec<HistoryItem>, LumenError> {
    state.library.get_continue_watching()
}
