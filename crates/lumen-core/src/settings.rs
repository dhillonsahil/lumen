use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SubtitleStyle {
    pub font: String,
    pub font_size: u32,
    pub color: String,
    pub border_color: String,
    pub border_size: f64,
    pub shadow_offset: f64,
    pub background_color: String,
    pub pos_y_percent: u32,
}

impl Default for SubtitleStyle {
    fn default() -> Self {
        Self {
            font: "sans-serif".to_string(),
            font_size: 48,
            color: "#FFFFFF".to_string(),
            border_color: "#000000".to_string(),
            border_size: 2.5,
            shadow_offset: 1.0,
            background_color: "#00000000".to_string(),
            pos_y_percent: 92,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AppSettings {
    #[serde(default = "default_theme")]
    pub theme: String,
    #[serde(default = "default_accent")]
    pub accent_color: String,
    pub preferred_audio_lang: String,
    pub preferred_subtitle_lang: String,
    pub hwdec: String, // "auto-safe", "auto", "no"
    pub resume_playback: bool,
    #[serde(default = "default_true")]
    pub autoplay_next: bool,
    #[serde(default)]
    pub watched_folders: Vec<String>,
    pub seek_step_short: f64, // 10.0
    pub seek_step_long: f64,  // 60.0
    pub volume_step: f64,     // 5.0
    pub audio_delay: f64,
    pub subtitle_delay: f64,
    pub channel_mode: String, // "stereo", "mono", "left", "right"
    pub auto_load_subtitles: bool,
    pub subtitle_style: SubtitleStyle,
    pub shortcuts: HashMap<String, String>,
}

fn default_theme() -> String {
    "dark".to_string()
}

fn default_accent() -> String {
    "#6366f1".to_string()
}

fn default_true() -> bool {
    true
}

impl Default for AppSettings {
    fn default() -> Self {
        let mut shortcuts = HashMap::new();
        shortcuts.insert("toggle_play".to_string(), "Space".to_string());
        shortcuts.insert("seek_forward".to_string(), "ArrowRight".to_string());
        shortcuts.insert("seek_backward".to_string(), "ArrowLeft".to_string());
        shortcuts.insert("volume_up".to_string(), "ArrowUp".to_string());
        shortcuts.insert("volume_down".to_string(), "ArrowDown".to_string());
        shortcuts.insert("toggle_mute".to_string(), "m".to_string());
        shortcuts.insert("toggle_fullscreen".to_string(), "f".to_string());
        shortcuts.insert("exit_fullscreen".to_string(), "Escape".to_string());
        shortcuts.insert("open_file".to_string(), "Control+o".to_string());
        shortcuts.insert("open_url".to_string(), "Control+u".to_string());
        shortcuts.insert("open_folder".to_string(), "Control+Shift+O".to_string());
        shortcuts.insert("screenshot".to_string(), "s".to_string());
        shortcuts.insert("next_item".to_string(), "n".to_string());
        shortcuts.insert("prev_item".to_string(), "p".to_string());
        shortcuts.insert("next_chapter".to_string(), "Control+ArrowRight".to_string());
        shortcuts.insert("prev_chapter".to_string(), "Control+ArrowLeft".to_string());
        shortcuts.insert("playlist".to_string(), "q".to_string());
        shortcuts.insert("library".to_string(), "Control+b".to_string());

        Self {
            theme: "dark".to_string(),
            accent_color: "#6366f1".to_string(),
            preferred_audio_lang: "eng".to_string(),
            preferred_subtitle_lang: "eng".to_string(),
            hwdec: "auto-safe".to_string(),
            resume_playback: true,
            autoplay_next: true,
            watched_folders: Vec::new(),
            seek_step_short: 10.0,
            seek_step_long: 60.0,
            volume_step: 5.0,
            audio_delay: 0.0,
            subtitle_delay: 0.0,
            channel_mode: "stereo".to_string(),
            auto_load_subtitles: true,
            subtitle_style: SubtitleStyle::default(),
            shortcuts,
        }
    }
}
