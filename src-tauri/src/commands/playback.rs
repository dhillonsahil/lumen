use crate::state::AppState;
use lumen_core::error::LumenError;
use lumen_core::models::{
    Chapter, EqualizerState, MediaSource, MediaTrack, PlaybackStatus, VideoAdjustments,
};
use lumen_core::playlist::{Playlist, PlaylistItem};
use lumen_playback::MediaBackend;
use std::path::Path;
use std::time::Duration;
use tauri::State;
use tauri_plugin_dialog::DialogExt;
use tracing::info;

pub fn normalize_path(raw: &str) -> String {
    let mut s = raw.trim().to_string();
    if let Some(stripped) = s.strip_prefix("file:///") {
        s = stripped.to_string();
    } else if let Some(stripped) = s.strip_prefix("file://") {
        s = stripped.to_string();
    }
    if let Some(stripped) = s.strip_prefix(r"\\?\") {
        s = stripped.to_string();
    }
    #[cfg(target_os = "windows")]
    {
        s = s.replace('/', "\\");
    }
    s
}

fn file_path_to_string(fp: tauri_plugin_dialog::FilePath) -> String {
    let raw = match fp {
        tauri_plugin_dialog::FilePath::Path(p) => p.to_string_lossy().to_string(),
        tauri_plugin_dialog::FilePath::Url(u) => {
            if let Ok(p) = u.to_file_path() {
                p.to_string_lossy().to_string()
            } else {
                u.to_string()
            }
        }
    };
    normalize_path(&raw)
}

async fn save_current_resume(state: &AppState) {
    let st = state.backend.get_status().await;
    if let Some(path) = st.path {
        if st.position > 3.0 && st.duration > 0.0 {
            let title = st.title.unwrap_or_else(|| path.clone());
            let _ = state
                .library
                .save_resume_position(&path, &title, st.position, st.duration);
        }
    }
}

#[tauri::command]
pub async fn open_media(
    paths: Vec<String>,
    state: State<'_, AppState>,
) -> Result<Playlist, LumenError> {
    if paths.is_empty() {
        return Ok(state.playlist.read().await.clone());
    }

    // Save position of previously playing file before switching
    save_current_resume(&state).await;

    let mut playlist = state.playlist.write().await;
    playlist.clear();

    for p in &paths {
        let clean = normalize_path(p);
        let item = PlaylistItem::new(clean, None, None);
        playlist.add(item);
    }

    let cloned_pl = playlist.clone();
    drop(playlist);

    if let Some(first_item) = cloned_pl.items.first() {
        let source = MediaSource::from_path_or_url(&first_item.path);
        state.backend.load(&source).await?;
        state.backend.play().await?;

        // Check resume position
        if let Some(resume_pos) = state.library.get_resume_position(&first_item.path) {
            info!("Resuming {} at {}s", first_item.path, resume_pos);
            let _ = state
                .backend
                .seek(Duration::from_secs_f64(resume_pos))
                .await;
        }
    }

    Ok(cloned_pl)
}

#[tauri::command]
pub async fn open_folder(path: String, state: State<'_, AppState>) -> Result<Playlist, LumenError> {
    let clean = normalize_path(&path);
    let items = state.library.scan_folder(Path::new(&clean))?;
    if items.is_empty() {
        return Ok(state.playlist.read().await.clone());
    }

    let mut playlist = state.playlist.write().await;
    playlist.clear();

    for item in &items {
        playlist.add(PlaylistItem::new(
            item.path.clone(),
            Some(item.title.clone()),
            Some(item.duration),
        ));
    }

    let cloned_pl = playlist.clone();
    drop(playlist);

    if let Some(first) = cloned_pl.items.first() {
        let source = MediaSource::from_path_or_url(&first.path);
        state.backend.load(&source).await?;
        state.backend.play().await?;
    }

    Ok(cloned_pl)
}

#[tauri::command]
pub async fn open_url(url: String, state: State<'_, AppState>) -> Result<(), LumenError> {
    let source = MediaSource::Url(url.clone());
    let mut playlist = state.playlist.write().await;
    playlist.clear();
    playlist.add(PlaylistItem::new(url, None, None));

    state.backend.load(&source).await?;
    state.backend.play().await?;
    Ok(())
}

#[tauri::command]
pub async fn play(state: State<'_, AppState>) -> Result<(), LumenError> {
    state.backend.play().await?;
    Ok(())
}

#[tauri::command]
pub async fn pause(state: State<'_, AppState>) -> Result<(), LumenError> {
    save_current_resume(&state).await;
    state.backend.pause().await?;
    Ok(())
}

#[tauri::command]
pub async fn toggle_play(state: State<'_, AppState>) -> Result<(), LumenError> {
    save_current_resume(&state).await;
    state.backend.toggle_play().await?;
    Ok(())
}

#[tauri::command]
pub async fn stop(state: State<'_, AppState>) -> Result<(), LumenError> {
    save_current_resume(&state).await;
    state.backend.stop().await?;
    Ok(())
}

#[tauri::command]
pub async fn seek(position_seconds: f64, state: State<'_, AppState>) -> Result<(), LumenError> {
    state
        .backend
        .seek(Duration::from_secs_f64(position_seconds))
        .await?;
    Ok(())
}

#[tauri::command]
pub async fn seek_relative(seconds: f64, state: State<'_, AppState>) -> Result<(), LumenError> {
    state.backend.seek_relative(seconds).await?;
    Ok(())
}

#[tauri::command]
pub async fn set_volume(volume: f64, state: State<'_, AppState>) -> Result<(), LumenError> {
    state.backend.set_volume(volume).await?;
    Ok(())
}

#[tauri::command]
pub async fn set_muted(muted: bool, state: State<'_, AppState>) -> Result<(), LumenError> {
    state.backend.set_muted(muted).await?;
    Ok(())
}

#[tauri::command]
pub async fn set_speed(speed: f64, state: State<'_, AppState>) -> Result<(), LumenError> {
    state.backend.set_speed(speed).await?;
    Ok(())
}

#[tauri::command]
pub async fn set_audio_track(
    track_id: Option<i64>,
    state: State<'_, AppState>,
) -> Result<(), LumenError> {
    if let Some(id) = track_id {
        let tracks = state.backend.get_tracks().await?;
        if !tracks
            .iter()
            .any(|t| t.id == id && t.track_type == lumen_core::models::TrackType::Audio)
        {
            return Err(LumenError::Track(format!("Invalid audio track ID: {}", id)));
        }
    }
    state.backend.set_audio_track(track_id).await?;
    Ok(())
}

#[tauri::command]
pub async fn set_subtitle_track(
    track_id: Option<i64>,
    state: State<'_, AppState>,
) -> Result<(), LumenError> {
    if let Some(id) = track_id {
        let tracks = state.backend.get_tracks().await?;
        if !tracks
            .iter()
            .any(|t| t.id == id && t.track_type == lumen_core::models::TrackType::Subtitle)
        {
            return Err(LumenError::Track(format!(
                "Invalid subtitle track ID: {}",
                id
            )));
        }
    }
    state.backend.set_subtitle_track(track_id).await?;
    Ok(())
}

#[tauri::command]
pub async fn load_external_subtitle(
    path: String,
    state: State<'_, AppState>,
) -> Result<Vec<MediaTrack>, LumenError> {
    let p = Path::new(&path);
    if !p.exists() {
        return Err(LumenError::Io(format!(
            "Subtitle file does not exist: {}",
            path
        )));
    }
    state.backend.add_external_subtitle(p).await?;
    let tracks = state.backend.get_tracks().await?;
    Ok(tracks)
}

#[tauri::command]
pub async fn take_screenshot(path: String, state: State<'_, AppState>) -> Result<(), LumenError> {
    state.backend.screenshot(Path::new(&path)).await?;
    Ok(())
}

#[tauri::command]
pub async fn get_playback_state(state: State<'_, AppState>) -> Result<PlaybackStatus, LumenError> {
    Ok(state.backend.get_status().await)
}

#[tauri::command]
pub async fn get_tracks(state: State<'_, AppState>) -> Result<Vec<MediaTrack>, LumenError> {
    Ok(state.backend.get_tracks().await?)
}

#[tauri::command]
pub async fn get_chapters(state: State<'_, AppState>) -> Result<Vec<Chapter>, LumenError> {
    Ok(state.backend.get_chapters().await?)
}

#[tauri::command]
pub async fn set_audio_delay(seconds: f64, state: State<'_, AppState>) -> Result<(), LumenError> {
    state.backend.set_audio_delay(seconds).await?;
    Ok(())
}

#[tauri::command]
pub async fn set_subtitle_delay(
    seconds: f64,
    state: State<'_, AppState>,
) -> Result<(), LumenError> {
    state.backend.set_subtitle_delay(seconds).await?;
    Ok(())
}

#[tauri::command]
pub async fn set_video_adjustments(
    adjustments: VideoAdjustments,
    state: State<'_, AppState>,
) -> Result<(), LumenError> {
    state.backend.set_video_adjustments(&adjustments).await?;
    Ok(())
}

#[tauri::command]
pub async fn set_equalizer(
    equalizer: EqualizerState,
    state: State<'_, AppState>,
) -> Result<(), LumenError> {
    state.backend.set_equalizer(&equalizer).await?;
    Ok(())
}

#[tauri::command]
pub async fn frame_step(forward: bool, state: State<'_, AppState>) -> Result<(), LumenError> {
    state.backend.frame_step(forward).await?;
    Ok(())
}

#[tauri::command]
pub async fn get_diagnostics(
    state: State<'_, AppState>,
) -> Result<lumen_core::models::MpvDiagnostics, LumenError> {
    Ok(state.backend.get_diagnostics_sync())
}

#[tauri::command]
pub async fn open_file_dialog(app: tauri::AppHandle) -> Result<Vec<String>, LumenError> {
    let files = app
        .dialog()
        .file()
        .add_filter(
            "Media Files",
            &[
                "mp4", "mkv", "webm", "avi", "mov", "ts", "flv", "mp3", "flac", "aac", "wav",
                "ogg", "opus", "m4a",
            ],
        )
        .blocking_pick_files();

    match files {
        Some(list) => Ok(list.into_iter().map(file_path_to_string).collect()),
        None => Ok(Vec::new()),
    }
}

#[tauri::command]
pub async fn open_folder_dialog(app: tauri::AppHandle) -> Result<Option<String>, LumenError> {
    let folder = app.dialog().file().blocking_pick_folder();
    match folder {
        Some(f) => Ok(Some(file_path_to_string(f))),
        None => Ok(None),
    }
}

#[tauri::command]
pub async fn open_subtitle_dialog(app: tauri::AppHandle) -> Result<Option<String>, LumenError> {
    let file = app
        .dialog()
        .file()
        .add_filter("Subtitle Files", &["srt", "ass", "ssa", "vtt", "sub"])
        .blocking_pick_file();

    match file {
        Some(f) => Ok(Some(file_path_to_string(f))),
        None => Ok(None),
    }
}

#[tauri::command]
pub async fn toggle_fullscreen(window: tauri::WebviewWindow) -> Result<bool, LumenError> {
    let is_fs = window
        .is_fullscreen()
        .map_err(|e| LumenError::Platform(e.to_string()))?;
    let next = !is_fs;
    window
        .set_fullscreen(next)
        .map_err(|e| LumenError::Platform(e.to_string()))?;
    info!("Toggled fullscreen: {}", next);
    Ok(next)
}

#[tauri::command]
pub async fn toggle_mini_player(window: tauri::WebviewWindow) -> Result<bool, LumenError> {
    let is_top = window
        .is_always_on_top()
        .map_err(|e| LumenError::Platform(e.to_string()))?;
    if !is_top {
        let _ = window.set_always_on_top(true);
        let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize {
            width: 480.0,
            height: 270.0,
        }));
        info!("Activated mini player mode");
        Ok(true)
    } else {
        let _ = window.set_always_on_top(false);
        let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize {
            width: 1280.0,
            height: 720.0,
        }));
        info!("Deactivated mini player mode");
        Ok(false)
    }
}
