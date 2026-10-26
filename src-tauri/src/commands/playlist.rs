use crate::commands::playback::normalize_path;
use crate::state::AppState;
use lumen_core::error::LumenError;
use lumen_core::models::MediaSource;
use lumen_core::playlist::{Playlist, PlaylistItem, RepeatMode};
use lumen_playback::MediaBackend;
use std::fs;
use tauri::State;

#[tauri::command]
pub async fn get_playlist(state: State<'_, AppState>) -> Result<Playlist, LumenError> {
    Ok(state.playlist.read().await.clone())
}

#[tauri::command]
pub async fn add_to_playlist(
    paths: Vec<String>,
    state: State<'_, AppState>,
) -> Result<Playlist, LumenError> {
    let mut pl = state.playlist.write().await;
    for p in paths {
        let clean = normalize_path(&p);
        pl.add(PlaylistItem::new(clean, None, None));
    }
    Ok(pl.clone())
}

#[tauri::command]
pub async fn play_playlist_index(
    index: usize,
    state: State<'_, AppState>,
) -> Result<(), LumenError> {
    let path = {
        let mut pl = state.playlist.write().await;
        if index < pl.items.len() {
            pl.current_index = Some(index);
            Some(pl.items[index].path.clone())
        } else {
            None
        }
    };

    if let Some(p) = path {
        let source = MediaSource::from_path_or_url(&p);
        state.backend.load(&source).await?;
        state.backend.play().await?;
    }

    Ok(())
}

#[tauri::command]
pub async fn remove_playlist_item(
    index: usize,
    state: State<'_, AppState>,
) -> Result<Playlist, LumenError> {
    let mut pl = state.playlist.write().await;
    let was_current = pl.current_index == Some(index);
    pl.remove(index);
    let cloned_pl = pl.clone();
    drop(pl);

    if was_current {
        if let Some(next_idx) = cloned_pl.current_index {
            if let Some(item) = cloned_pl.items.get(next_idx) {
                let source = MediaSource::from_path_or_url(&item.path);
                let _ = state.backend.load(&source).await;
                let _ = state.backend.play().await;
            }
        } else {
            let _ = state.backend.stop().await;
        }
    }

    Ok(cloned_pl)
}

#[tauri::command]
pub async fn clear_playlist(state: State<'_, AppState>) -> Result<Playlist, LumenError> {
    let mut pl = state.playlist.write().await;
    pl.clear();
    let cloned = pl.clone();
    drop(pl);
    state.backend.stop().await?;
    Ok(cloned)
}

#[tauri::command]
pub async fn set_shuffle(shuffle: bool, state: State<'_, AppState>) -> Result<(), LumenError> {
    let mut pl = state.playlist.write().await;
    pl.shuffle = shuffle;
    Ok(())
}

#[tauri::command]
pub async fn set_repeat(mode: RepeatMode, state: State<'_, AppState>) -> Result<(), LumenError> {
    let mut pl = state.playlist.write().await;
    pl.repeat_mode = mode;
    Ok(())
}

#[tauri::command]
pub async fn next_track(state: State<'_, AppState>) -> Result<(), LumenError> {
    let next_idx = {
        let pl = state.playlist.read().await;
        pl.next_index()
    };

    if let Some(idx) = next_idx {
        play_playlist_index(idx, state).await?;
    }
    Ok(())
}

#[tauri::command]
pub async fn prev_track(state: State<'_, AppState>) -> Result<(), LumenError> {
    let prev_idx = {
        let pl = state.playlist.read().await;
        pl.prev_index()
    };

    if let Some(idx) = prev_idx {
        play_playlist_index(idx, state).await?;
    }
    Ok(())
}

#[tauri::command]
pub async fn reorder_playlist_item(
    from: usize,
    to: usize,
    state: State<'_, AppState>,
) -> Result<Playlist, LumenError> {
    let mut pl = state.playlist.write().await;
    pl.reorder(from, to);
    Ok(pl.clone())
}

#[tauri::command]
pub async fn import_playlist(
    path: String,
    state: State<'_, AppState>,
) -> Result<Playlist, LumenError> {
    let content = fs::read_to_string(&path)
        .map_err(|e| LumenError::Io(format!("Failed to read playlist file: {}", e)))?;

    let new_pl = if path.ends_with(".pls") || content.contains("[playlist]") {
        Playlist::from_pls(&content)
    } else if path.ends_with(".xspf") || content.contains("<playlist") {
        Playlist::from_xspf(&content)
    } else {
        Playlist::from_m3u(&content)
    };

    let mut pl = state.playlist.write().await;
    *pl = new_pl;

    Ok(pl.clone())
}

#[tauri::command]
pub async fn export_playlist(
    path: String,
    format: String,
    state: State<'_, AppState>,
) -> Result<(), LumenError> {
    let pl = state.playlist.read().await;
    let content = match format.to_lowercase().as_str() {
        "pls" => pl.to_pls(),
        "xspf" => pl.to_xspf(),
        _ => pl.to_m3u(),
    };

    fs::write(&path, content)
        .map_err(|e| LumenError::Io(format!("Failed to write playlist file: {}", e)))?;

    Ok(())
}
