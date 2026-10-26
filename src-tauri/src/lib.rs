pub mod commands;
pub mod events;
pub mod state;

use commands::*;
use events::start_event_forwarder;
use lumen_core::settings::AppSettings;
use lumen_library::MediaLibrary;
use lumen_playback::{MediaBackend, MpvBackend, MpvEventLoop};
use raw_window_handle::{HasWindowHandle, RawWindowHandle};
use state::AppState;
use std::sync::Arc;
use tauri::{Manager, WebviewWindow};
use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

pub fn run() {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,lumen_playback=debug,lumen_app=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    info!("Starting Lumen v2 Media Player application");

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let window: WebviewWindow = app
                .get_webview_window("main")
                .expect("Failed to get main window");

            // Extract native window ID for libmpv embedding
            let mut window_id: Option<i64> = None;
            if let Ok(wh) = window.window_handle() {
                match wh.as_raw() {
                    #[cfg(target_os = "windows")]
                    RawWindowHandle::Win32(h) => {
                        window_id = Some(h.hwnd.get() as i64);
                        info!("Acquired Windows HWND for mpv: {:?}", window_id);
                    }
                    #[cfg(target_os = "linux")]
                    RawWindowHandle::Xlib(h) => {
                        window_id = Some(h.window as i64);
                        info!("Acquired X11 Window ID for mpv: {:?}", window_id);
                    }
                    _ => {
                        info!("Platform window handle not attached to wid");
                    }
                }
            }

            // Load settings
            let settings_path = lumen_platform::get_settings_path();
            let settings = if settings_path.exists() {
                std::fs::read_to_string(&settings_path)
                    .ok()
                    .and_then(|s| serde_json::from_str(&s).ok())
                    .unwrap_or_default()
            } else {
                AppSettings::default()
            };

            // Initialize SQLite Media Library
            let db_path = lumen_platform::get_database_path();
            let library = Arc::new(
                MediaLibrary::new(&db_path).expect("Failed to initialize SQLite media library"),
            );

            // Initialize MpvBackend
            let backend = Arc::new(
                MpvBackend::new(window_id, Some(&settings.hwdec))
                    .expect("Failed to initialize libmpv media backend"),
            );

            // Log startup diagnostics
            let diag = backend.get_diagnostics_sync();
            info!(
                "Lumen v2 Startup Diagnostic: libmpv loaded successfully | Version: {} | VO: {} | Context: {} | HWDEC: {}",
                diag.mpv_version, diag.active_vo, diag.active_gpu_context, diag.hwdec_current
            );

            // Spawn mpv event loop with bounded channel
            let (tx, rx) = tokio::sync::mpsc::channel(128);
            let event_loop = MpvEventLoop::spawn(backend.clone(), tx);
            start_event_forwarder(app.handle().clone(), rx);

            // Spawn background task for saving resume position periodically
            let bg_backend = backend.clone();
            let bg_lib = library.clone();
            tauri::async_runtime::spawn(async move {
                let mut interval = tokio::time::interval(std::time::Duration::from_secs(5));
                loop {
                    interval.tick().await;
                    let st = bg_backend.get_status().await;
                    if let Some(path) = st.path {
                        if st.duration > 10.0 && st.position > 2.0 {
                            let title = st.title.unwrap_or_else(|| path.clone());
                            let _ = bg_lib.save_resume_position(
                                &path,
                                &title,
                                st.position,
                                st.duration,
                            );
                        }
                    }
                }
            });

            // Register state
            app.manage(AppState::new(backend, library, settings, event_loop));

            info!("Lumen v2 application setup complete");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            open_media,
            open_folder,
            open_url,
            play,
            pause,
            toggle_play,
            stop,
            seek,
            seek_relative,
            set_volume,
            set_muted,
            set_speed,
            set_audio_track,
            set_subtitle_track,
            load_external_subtitle,
            take_screenshot,
            get_playback_state,
            get_tracks,
            get_chapters,
            set_audio_delay,
            set_subtitle_delay,
            set_video_adjustments,
            set_equalizer,
            frame_step,
            get_playlist,
            add_to_playlist,
            play_playlist_index,
            remove_playlist_item,
            reorder_playlist_item,
            clear_playlist,
            set_shuffle,
            set_repeat,
            next_track,
            prev_track,
            import_playlist,
            export_playlist,
            get_recent_history,
            get_continue_watching,
            get_library_items,
            search_library,
            remove_library_item,
            scan_library_folder,
            get_settings,
            save_settings,
            get_diagnostics,
            open_file_dialog,
            open_folder_dialog,
            open_subtitle_dialog,
            toggle_fullscreen,
            toggle_mini_player
        ])
        .run(tauri::generate_context!())
        .expect("error while running Lumen v2 desktop application");
}
