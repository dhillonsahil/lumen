use std::path::PathBuf;

pub fn get_app_config_dir() -> PathBuf {
    dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("Lumen")
}

pub fn get_app_data_dir() -> PathBuf {
    dirs::data_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("Lumen")
}

pub fn get_database_path() -> PathBuf {
    get_app_data_dir().join("library.db")
}

pub fn get_settings_path() -> PathBuf {
    get_app_config_dir().join("settings.json")
}

#[cfg(target_os = "windows")]
pub fn extract_hwnd(raw_hwnd: isize) -> i64 {
    raw_hwnd as i64
}

#[cfg(not(target_os = "windows"))]
pub fn extract_hwnd(_raw: isize) -> i64 {
    0
}
