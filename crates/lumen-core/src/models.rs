use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum MediaSource {
    File(PathBuf),
    Url(String),
}

impl MediaSource {
    pub fn from_path_or_url(s: &str) -> Self {
        if s.starts_with("http://") || s.starts_with("https://") {
            MediaSource::Url(s.to_string())
        } else {
            MediaSource::File(PathBuf::from(s))
        }
    }

    pub fn as_str(&self) -> String {
        match self {
            MediaSource::File(p) => p.to_string_lossy().to_string(),
            MediaSource::Url(u) => u.clone(),
        }
    }

    pub fn display_name(&self) -> String {
        match self {
            MediaSource::File(p) => p
                .file_name()
                .map(|s| s.to_string_lossy().to_string())
                .unwrap_or_else(|| p.to_string_lossy().to_string()),
            MediaSource::Url(u) => u.clone(),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TrackType {
    Video,
    Audio,
    Subtitle,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TrackInfo {
    pub id: i64,
    pub track_type: TrackType,
    pub title: Option<String>,
    #[serde(alias = "lang")]
    pub language: Option<String>,
    pub codec: Option<String>,
    #[serde(default)]
    pub default_track: bool,
    #[serde(default)]
    pub forced_track: bool,
    #[serde(default)]
    pub dependent_track: bool,
    #[serde(default)]
    pub selected: bool,
    #[serde(default)]
    pub external: bool,
    pub external_filename: Option<String>,
    pub audio_channels: Option<u32>,
    pub audio_samplerate: Option<u32>,
}

pub type MediaTrack = TrackInfo;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Chapter {
    pub index: i64,
    pub title: String,
    pub time: f64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PlaybackState {
    Idle,
    Loading,
    Playing,
    Paused,
    Stopped,
    Ended,
    Error,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PlaybackStatus {
    pub state: PlaybackState,
    pub path: Option<String>,
    pub title: Option<String>,
    pub position: f64,
    pub duration: f64,
    pub volume: f64,
    pub muted: bool,
    pub speed: f64,
    pub current_audio_track: Option<i64>,
    pub current_sub_track: Option<i64>,
    pub video_width: Option<u32>,
    pub video_height: Option<u32>,
    pub hwdec_active: bool,
    pub cache_seconds: f64,
    pub seeking: bool,
    pub error_message: Option<String>,
}

impl Default for PlaybackStatus {
    fn default() -> Self {
        Self {
            state: PlaybackState::Idle,
            path: None,
            title: None,
            position: 0.0,
            duration: 0.0,
            volume: 100.0,
            muted: false,
            speed: 1.0,
            current_audio_track: None,
            current_sub_track: None,
            video_width: None,
            video_height: None,
            hwdec_active: false,
            cache_seconds: 0.0,
            seeking: false,
            error_message: None,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct EqualizerState {
    pub enabled: bool,
    pub preset: String,
    // 10 bands from 31Hz to 16kHz (-12.0 dB to +12.0 dB)
    pub bands: [f64; 10],
}

impl Default for EqualizerState {
    fn default() -> Self {
        Self {
            enabled: false,
            preset: "Flat".to_string(),
            bands: [0.0; 10],
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct VideoAdjustments {
    pub brightness: i32, // -100 to 100
    pub contrast: i32,   // -100 to 100
    pub saturation: i32, // -100 to 100
    pub hue: i32,        // -100 to 100
    pub gamma: i32,      // -100 to 100
    pub rotation: u32,   // 0, 90, 180, 270
    pub flip_h: bool,
    pub flip_v: bool,
    pub aspect_ratio: String, // "auto", "16:9", "4:3", "21:9", etc.
    pub zoom: f64,            // 0.5 to 3.0
    pub pan_x: f64,
    pub pan_y: f64,
    pub deinterlace: bool,
}

impl Default for VideoAdjustments {
    fn default() -> Self {
        Self {
            brightness: 0,
            contrast: 0,
            saturation: 0,
            hue: 0,
            gamma: 0,
            rotation: 0,
            flip_h: false,
            flip_v: false,
            aspect_ratio: "auto".to_string(),
            zoom: 1.0,
            pan_x: 0.0,
            pan_y: 0.0,
            deinterlace: false,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Default)]
pub struct ABLoop {
    pub point_a: Option<f64>,
    pub point_b: Option<f64>,
    pub enabled: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct MpvDiagnostics {
    pub libmpv_loaded: bool,
    pub mpv_version: String,
    pub active_vo: String,
    pub active_gpu_context: String,
    pub hwdec_current: String,
    pub current_file: Option<String>,
    pub current_audio_track: Option<MediaTrack>,
    pub current_sub_track: Option<MediaTrack>,
    pub recent_error: Option<String>,
}
