use crate::state::AppState;
use lumen_core::error::LumenError;
use lumen_core::settings::AppSettings;
use lumen_platform::get_settings_path;
use std::fs;
use tauri::State;

#[tauri::command]
pub async fn get_settings(state: State<'_, AppState>) -> Result<AppSettings, LumenError> {
    Ok(state.settings.read().await.clone())
}

#[tauri::command]
pub async fn save_settings(
    new_settings: AppSettings,
    state: State<'_, AppState>,
) -> Result<(), LumenError> {
    let settings_path = get_settings_path();
    if let Some(parent) = settings_path.parent() {
        let _ = fs::create_dir_all(parent);
    }

    let json = serde_json::to_string_pretty(&new_settings)
        .map_err(|e| LumenError::Io(format!("Failed to serialize settings: {}", e)))?;

    fs::write(&settings_path, json)
        .map_err(|e| LumenError::Io(format!("Failed to save settings: {}", e)))?;

    let mut st = state.settings.write().await;
    *st = new_settings;
    Ok(())
}
