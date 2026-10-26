use lumen_playback::LumenPlaybackEvent;
use tauri::{AppHandle, Emitter};
use tokio::sync::mpsc::Receiver;
use tracing::info;

pub fn start_event_forwarder(app: AppHandle, mut rx: Receiver<LumenPlaybackEvent>) {
    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                LumenPlaybackEvent::StateChanged(status) => {
                    let _ = app.emit("playback:state-changed", status);
                }
                LumenPlaybackEvent::PositionChanged(pos) => {
                    let _ = app.emit("playback:position-changed", pos);
                }
                LumenPlaybackEvent::DurationChanged(dur) => {
                    let _ = app.emit("playback:duration-changed", dur);
                }
                LumenPlaybackEvent::TracksChanged(tracks) => {
                    let _ = app.emit("playback:tracks-changed", tracks);
                }
                LumenPlaybackEvent::ChaptersChanged(chapters) => {
                    let _ = app.emit("playback:chapters-changed", chapters);
                }
                LumenPlaybackEvent::BufferingChanged(cache) => {
                    let _ = app.emit("playback:buffering-changed", cache);
                }
                LumenPlaybackEvent::Error(err) => {
                    let _ = app.emit("playback:error", err);
                }
                LumenPlaybackEvent::Ended => {
                    let _ = app.emit("playback:ended", ());
                }
                LumenPlaybackEvent::FileLoaded => {
                    let _ = app.emit("playback:file-loaded", ());
                }
            }
        }
        info!("Tauri event forwarder task terminated");
    });
}
