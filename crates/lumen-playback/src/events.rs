use crate::backend::MpvBackend;
use crate::ffi::{MpvEventEndFile, MpvEventId, MpvEventProperty, MpvFormat};
use lumen_core::models::{Chapter, MediaTrack, PlaybackState, PlaybackStatus};
use serde::{Deserialize, Serialize};
use std::ffi::CStr;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;
use tokio::sync::mpsc::Sender;
use tracing::{debug, error, info};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload")]
pub enum LumenPlaybackEvent {
    #[serde(rename = "playback:state-changed")]
    StateChanged(PlaybackStatus),

    #[serde(rename = "playback:position-changed")]
    PositionChanged(f64),

    #[serde(rename = "playback:duration-changed")]
    DurationChanged(f64),

    #[serde(rename = "playback:tracks-changed")]
    TracksChanged(Vec<MediaTrack>),

    #[serde(rename = "playback:chapters-changed")]
    ChaptersChanged(Vec<Chapter>),

    #[serde(rename = "playback:buffering-changed")]
    BufferingChanged(f64),

    #[serde(rename = "playback:error")]
    Error(String),

    #[serde(rename = "playback:ended")]
    Ended,

    #[serde(rename = "playback:file-loaded")]
    FileLoaded,
}

pub struct MpvEventLoop {
    is_running: Arc<AtomicBool>,
}

impl MpvEventLoop {
    pub fn spawn(backend: Arc<MpvBackend>, tx: Sender<LumenPlaybackEvent>) -> Self {
        let is_running = Arc::new(AtomicBool::new(true));
        let running_flag = is_running.clone();

        thread::Builder::new()
            .name("mpv-event-loop".into())
            .spawn(move || {
                info!("mpv event worker loop started");
                let mpv = backend.mpv_instance();
                let status_lock = backend.status_ref();

                while running_flag.load(Ordering::Relaxed) {
                    let event_ptr = mpv.wait_event(0.05);
                    if event_ptr.is_null() {
                        continue;
                    }

                    let event = unsafe { &*event_ptr };
                    match event.event_id {
                        MpvEventId::None => {}

                        MpvEventId::Shutdown => {
                            info!("mpv shutdown event received");
                            break;
                        }

                        MpvEventId::FileLoaded => {
                            info!("mpv event: file-loaded");
                            let dur = mpv.get_property_double("duration").unwrap_or(0.0);
                            if let Ok(mut st) = status_lock.write() {
                                st.duration = dur;
                                st.state = PlaybackState::Playing;
                            }
                            if tx
                                .blocking_send(LumenPlaybackEvent::DurationChanged(dur))
                                .is_err()
                            {
                                break;
                            }

                            if let Ok(tracks) = backend.get_tracks_sync() {
                                if tx
                                    .blocking_send(LumenPlaybackEvent::TracksChanged(tracks))
                                    .is_err()
                                {
                                    break;
                                }
                            }

                            if let Ok(chaps) = backend.get_chapters_sync() {
                                if tx
                                    .blocking_send(LumenPlaybackEvent::ChaptersChanged(chaps))
                                    .is_err()
                                {
                                    break;
                                }
                            }

                            if tx.blocking_send(LumenPlaybackEvent::FileLoaded).is_err() {
                                break;
                            }

                            let current_status = backend.get_status_sync();
                            if tx
                                .blocking_send(LumenPlaybackEvent::StateChanged(current_status))
                                .is_err()
                            {
                                break;
                            }
                        }

                        MpvEventId::EndFile => {
                            let end_data = unsafe { &*(event.data as *const MpvEventEndFile) };
                            debug!("mpv end-file reason: {}", end_data.reason);

                            if end_data.reason == 0 {
                                // EOF reached normally
                                if let Ok(mut st) = status_lock.write() {
                                    st.state = PlaybackState::Ended;
                                }
                                if tx.blocking_send(LumenPlaybackEvent::Ended).is_err() {
                                    break;
                                }
                            } else if end_data.reason == 2 {
                                // Explicit stop requested
                                if let Ok(mut st) = status_lock.write() {
                                    st.state = PlaybackState::Stopped;
                                    st.path = None;
                                    st.title = None;
                                    st.position = 0.0;
                                    st.duration = 0.0;
                                    st.video_width = None;
                                    st.video_height = None;
                                }
                                let current_status = backend.get_status_sync();
                                if tx
                                    .blocking_send(LumenPlaybackEvent::StateChanged(current_status))
                                    .is_err()
                                {
                                    break;
                                }
                            } else if end_data.reason == 4 {
                                // Error occurred during playback
                                let err_msg = mpv.error_string(end_data.error);
                                error!("mpv end-file playback error: {}", err_msg);
                                if let Ok(mut st) = status_lock.write() {
                                    st.state = PlaybackState::Error;
                                    st.error_message = Some(err_msg.clone());
                                }
                                if tx
                                    .blocking_send(LumenPlaybackEvent::Error(err_msg))
                                    .is_err()
                                {
                                    break;
                                }
                            }
                        }

                        MpvEventId::PropertyChange => {
                            if event.data.is_null() {
                                continue;
                            }
                            let prop = unsafe { &*(event.data as *const MpvEventProperty) };
                            if prop.name.is_null() {
                                continue;
                            }
                            let name = unsafe { CStr::from_ptr(prop.name).to_string_lossy() };

                            match name.as_ref() {
                                "pause" => {
                                    if prop.format == MpvFormat::Flag && !prop.data.is_null() {
                                        let paused = unsafe { *(prop.data as *const i32) != 0 };
                                        if let Ok(mut st) = status_lock.write() {
                                            if st.state != PlaybackState::Loading
                                                && st.state != PlaybackState::Ended
                                            {
                                                st.state = if paused {
                                                    PlaybackState::Paused
                                                } else {
                                                    PlaybackState::Playing
                                                };
                                            }
                                        }
                                        let current_status = backend.get_status_sync();
                                        if tx
                                            .blocking_send(LumenPlaybackEvent::StateChanged(
                                                current_status,
                                            ))
                                            .is_err()
                                        {
                                            break;
                                        }
                                    }
                                }

                                "time-pos" => {
                                    if prop.format == MpvFormat::Double && !prop.data.is_null() {
                                        let pos = unsafe { *(prop.data as *const f64) };
                                        if let Ok(mut st) = status_lock.write() {
                                            st.position = pos;
                                        }
                                        if tx
                                            .blocking_send(LumenPlaybackEvent::PositionChanged(pos))
                                            .is_err()
                                        {
                                            break;
                                        }
                                    }
                                }

                                "duration" => {
                                    if prop.format == MpvFormat::Double && !prop.data.is_null() {
                                        let dur = unsafe { *(prop.data as *const f64) };
                                        if let Ok(mut st) = status_lock.write() {
                                            st.duration = dur;
                                        }
                                        if tx
                                            .blocking_send(LumenPlaybackEvent::DurationChanged(dur))
                                            .is_err()
                                        {
                                            break;
                                        }
                                    }
                                }

                                "demuxer-cache-duration" => {
                                    if prop.format == MpvFormat::Double && !prop.data.is_null() {
                                        let cache = unsafe { *(prop.data as *const f64) };
                                        if let Ok(mut st) = status_lock.write() {
                                            st.cache_seconds = cache;
                                        }
                                        if tx
                                            .blocking_send(LumenPlaybackEvent::BufferingChanged(
                                                cache,
                                            ))
                                            .is_err()
                                        {
                                            break;
                                        }
                                    }
                                }

                                "track-list" => {
                                    if let Ok(tracks) = backend.get_tracks_sync() {
                                        if tx
                                            .blocking_send(LumenPlaybackEvent::TracksChanged(
                                                tracks,
                                            ))
                                            .is_err()
                                        {
                                            break;
                                        }
                                    }
                                }

                                "chapter-list" => {
                                    if let Ok(chaps) = backend.get_chapters_sync() {
                                        if tx
                                            .blocking_send(LumenPlaybackEvent::ChaptersChanged(
                                                chaps,
                                            ))
                                            .is_err()
                                        {
                                            break;
                                        }
                                    }
                                }

                                "dwidth" => {
                                    if prop.format == MpvFormat::Int64 && !prop.data.is_null() {
                                        let w = unsafe { *(prop.data as *const i64) };
                                        if let Ok(mut st) = status_lock.write() {
                                            st.video_width = Some(w as u32);
                                        }
                                    }
                                }

                                "dheight" => {
                                    if prop.format == MpvFormat::Int64 && !prop.data.is_null() {
                                        let h = unsafe { *(prop.data as *const i64) };
                                        if let Ok(mut st) = status_lock.write() {
                                            st.video_height = Some(h as u32);
                                        }
                                    }
                                }

                                "hwdec-current" => {
                                    if let Ok(hw) = mpv.get_property_string("hwdec-current") {
                                        let active = !hw.is_empty() && hw != "no";
                                        if let Ok(mut st) = status_lock.write() {
                                            st.hwdec_active = active;
                                        }
                                    }
                                }

                                "volume"
                                    if prop.format == MpvFormat::Double && !prop.data.is_null() =>
                                {
                                    let vol = unsafe { *(prop.data as *const f64) };
                                    if let Ok(mut st) = status_lock.write() {
                                        st.volume = vol;
                                    }
                                    let current_status = backend.get_status_sync();
                                    if tx
                                        .blocking_send(LumenPlaybackEvent::StateChanged(
                                            current_status,
                                        ))
                                        .is_err()
                                    {
                                        break;
                                    }
                                }

                                "mute"
                                    if prop.format == MpvFormat::Flag && !prop.data.is_null() =>
                                {
                                    let muted = unsafe { *(prop.data as *const i32) != 0 };
                                    if let Ok(mut st) = status_lock.write() {
                                        st.muted = muted;
                                    }
                                    let current_status = backend.get_status_sync();
                                    if tx
                                        .blocking_send(LumenPlaybackEvent::StateChanged(
                                            current_status,
                                        ))
                                        .is_err()
                                    {
                                        break;
                                    }
                                }

                                "speed"
                                    if prop.format == MpvFormat::Double && !prop.data.is_null() =>
                                {
                                    let spd = unsafe { *(prop.data as *const f64) };
                                    if let Ok(mut st) = status_lock.write() {
                                        st.speed = spd;
                                    }
                                    let current_status = backend.get_status_sync();
                                    if tx
                                        .blocking_send(LumenPlaybackEvent::StateChanged(
                                            current_status,
                                        ))
                                        .is_err()
                                    {
                                        break;
                                    }
                                }

                                _ => {}
                            }
                        }

                        _ => {}
                    }
                }

                info!("mpv event worker loop cleanly exited");
            })
            .expect("Failed to spawn mpv event worker thread");

        Self { is_running }
    }

    pub fn stop(&self) {
        self.is_running.store(false, Ordering::SeqCst);
    }
}

impl Drop for MpvEventLoop {
    fn drop(&mut self) {
        self.stop();
    }
}
