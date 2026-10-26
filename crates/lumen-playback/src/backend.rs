use crate::ffi::{LibMpvApi, MpvFormat};
use crate::mpv::MpvInstance;
use async_trait::async_trait;
use lumen_core::error::PlaybackError;
use lumen_core::models::{
    Chapter, EqualizerState, MediaSource, MediaTrack, MpvDiagnostics, PlaybackState,
    PlaybackStatus, TrackType, VideoAdjustments,
};
use serde::Deserialize;
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, RwLock};
use std::time::Duration;
use tracing::{debug, info};

#[async_trait]
pub trait MediaBackend: Send + Sync {
    async fn load(&self, source: &MediaSource) -> Result<(), PlaybackError>;
    async fn play(&self) -> Result<(), PlaybackError>;
    async fn pause(&self) -> Result<(), PlaybackError>;
    async fn toggle_play(&self) -> Result<(), PlaybackError>;
    async fn stop(&self) -> Result<(), PlaybackError>;
    async fn seek(&self, position: Duration) -> Result<(), PlaybackError>;
    async fn seek_relative(&self, seconds: f64) -> Result<(), PlaybackError>;
    async fn set_volume(&self, volume: f64) -> Result<(), PlaybackError>;
    async fn set_muted(&self, muted: bool) -> Result<(), PlaybackError>;
    async fn set_speed(&self, speed: f64) -> Result<(), PlaybackError>;
    async fn set_audio_track(&self, track_id: Option<i64>) -> Result<(), PlaybackError>;
    async fn set_subtitle_track(&self, track_id: Option<i64>) -> Result<(), PlaybackError>;
    async fn add_external_subtitle(&self, path: &Path) -> Result<(), PlaybackError>;
    async fn screenshot(&self, output_path: &Path) -> Result<(), PlaybackError>;
    async fn shutdown(&self) -> Result<(), PlaybackError>;

    // Extended controls
    async fn get_status(&self) -> PlaybackStatus;
    async fn get_tracks(&self) -> Result<Vec<MediaTrack>, PlaybackError>;
    async fn get_chapters(&self) -> Result<Vec<Chapter>, PlaybackError>;
    async fn set_audio_delay(&self, seconds: f64) -> Result<(), PlaybackError>;
    async fn set_subtitle_delay(&self, seconds: f64) -> Result<(), PlaybackError>;
    async fn set_video_adjustments(&self, adj: &VideoAdjustments) -> Result<(), PlaybackError>;
    async fn set_equalizer(&self, eq: &EqualizerState) -> Result<(), PlaybackError>;
    async fn frame_step(&self, forward: bool) -> Result<(), PlaybackError>;
    async fn cycle_ab_loop(&self) -> Result<(), PlaybackError>;
    async fn clear_ab_loop(&self) -> Result<(), PlaybackError>;
}

pub struct MpvBackend {
    pub(crate) mpv: Arc<MpvInstance>,
    status: Arc<RwLock<PlaybackStatus>>,
    is_shutting_down: AtomicBool,
}

#[derive(Debug, Deserialize)]
struct MpvRawTrack {
    id: i64,
    #[serde(rename = "type")]
    track_type: String,
    title: Option<String>,
    lang: Option<String>,
    codec: Option<String>,
    #[serde(default)]
    default: bool,
    #[serde(default)]
    forced: bool,
    #[serde(default)]
    dependent: bool,
    #[serde(default)]
    selected: bool,
    #[serde(default)]
    external: bool,
    #[serde(rename = "external-filename")]
    external_filename: Option<String>,
    #[serde(rename = "audio-channels")]
    audio_channels: Option<u32>,
    #[serde(rename = "audio-samplerate")]
    audio_samplerate: Option<u32>,
}

#[derive(Debug, Deserialize)]
struct MpvRawChapter {
    #[serde(default)]
    title: Option<String>,
    time: f64,
}

impl MpvBackend {
    pub fn new(window_id: Option<i64>, hwdec: Option<&str>) -> Result<Self, PlaybackError> {
        let api = LibMpvApi::load()?;
        let mpv = Arc::new(MpvInstance::new(api)?);

        // Core mpv initialization options
        mpv.set_option_string("terminal", "no")?;
        mpv.set_option_string("keep-open", "yes")?;
        mpv.set_option_string("idle", "yes")?;
        mpv.set_option_string("audio-client-name", "Lumen v2")?;
        mpv.set_option_string("volume-max", "200")?;
        mpv.set_option_string("osc", "no")?; // We render our own modern glassmorphism UI
        mpv.set_option_string("input-default-bindings", "no")?;
        mpv.set_option_string("input-vo-keyboard", "no")?;

        // Network streaming & HLS/DASH/Direct URL protocol options
        let _ = mpv.set_option_string(
            "user-agent",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        );
        let _ = mpv.set_option_string("tls-verify", "no");
        let _ = mpv.set_option_string("demuxer-max-bytes", "150MiB");
        let _ = mpv.set_option_string("demuxer-max-back-bytes", "50MiB");
        let _ = mpv.set_option_string("stream-buffer-size", "4MiB");
        let _ = mpv.set_option_string("ytdl", "yes");

        // Hardware decoding
        let hwdec_mode = hwdec.unwrap_or("auto-safe");
        mpv.set_option_string("hwdec", hwdec_mode)?;

        // Video output embedding
        if let Some(wid) = window_id {
            info!("Embedding libmpv into window wid: {}", wid);
            mpv.set_option_string("wid", &wid.to_string())?;
            #[cfg(target_os = "windows")]
            {
                // Prefer Direct3D11 / gpu-next for Windows embedding
                let _ = mpv.set_option_string("vo", "gpu-next");
                let _ = mpv.set_option_string("gpu-context", "d3d11");
            }
        }

        mpv.initialize()?;

        // Observe essential properties
        mpv.observe_property(1, "pause", MpvFormat::Flag)?;
        mpv.observe_property(2, "time-pos", MpvFormat::Double)?;
        mpv.observe_property(3, "duration", MpvFormat::Double)?;
        mpv.observe_property(4, "volume", MpvFormat::Double)?;
        mpv.observe_property(5, "mute", MpvFormat::Flag)?;
        mpv.observe_property(6, "speed", MpvFormat::Double)?;
        mpv.observe_property(7, "aid", MpvFormat::String)?;
        mpv.observe_property(8, "sid", MpvFormat::String)?;
        mpv.observe_property(9, "track-list", MpvFormat::None)?;
        mpv.observe_property(10, "chapter-list", MpvFormat::None)?;
        mpv.observe_property(11, "seeking", MpvFormat::Flag)?;
        mpv.observe_property(12, "demuxer-cache-duration", MpvFormat::Double)?;
        mpv.observe_property(13, "dwidth", MpvFormat::Int64)?;
        mpv.observe_property(14, "dheight", MpvFormat::Int64)?;
        mpv.observe_property(15, "hwdec-current", MpvFormat::String)?;
        mpv.observe_property(16, "ab-loop-a", MpvFormat::Double)?;
        mpv.observe_property(17, "ab-loop-b", MpvFormat::Double)?;

        Ok(Self {
            mpv,
            status: Arc::new(RwLock::new(PlaybackStatus::default())),
            is_shutting_down: AtomicBool::new(false),
        })
    }

    pub fn mpv_instance(&self) -> Arc<MpvInstance> {
        self.mpv.clone()
    }

    pub fn status_ref(&self) -> Arc<RwLock<PlaybackStatus>> {
        self.status.clone()
    }

    pub fn get_status_sync(&self) -> PlaybackStatus {
        self.status.read().unwrap().clone()
    }

    pub fn get_tracks_sync(&self) -> Result<Vec<MediaTrack>, PlaybackError> {
        let json_str = self
            .mpv
            .get_property_string("track-list")
            .unwrap_or_default();
        if json_str.is_empty() {
            return Ok(Vec::new());
        }

        let raw_tracks: Vec<MpvRawTrack> =
            serde_json::from_str(&json_str).map_err(|e| PlaybackError::PropertyError {
                property: "track-list".to_string(),
                message: format!("Failed to parse track-list JSON: {}", e),
            })?;

        let mut tracks = Vec::new();
        for rt in raw_tracks {
            let track_type = match rt.track_type.as_str() {
                "video" => TrackType::Video,
                "audio" => TrackType::Audio,
                "sub" => TrackType::Subtitle,
                _ => continue,
            };

            tracks.push(MediaTrack {
                id: rt.id,
                track_type,
                title: rt.title,
                language: rt.lang,
                codec: rt.codec,
                default_track: rt.default,
                forced_track: rt.forced,
                dependent_track: rt.dependent,
                selected: rt.selected,
                external: rt.external,
                external_filename: rt.external_filename,
                audio_channels: rt.audio_channels,
                audio_samplerate: rt.audio_samplerate,
            });
        }

        Ok(tracks)
    }

    pub fn get_chapters_sync(&self) -> Result<Vec<Chapter>, PlaybackError> {
        let json_str = self
            .mpv
            .get_property_string("chapter-list")
            .unwrap_or_default();
        if json_str.is_empty() {
            return Ok(Vec::new());
        }

        let raw_chapters: Vec<MpvRawChapter> =
            serde_json::from_str(&json_str).map_err(|e| PlaybackError::PropertyError {
                property: "chapter-list".to_string(),
                message: format!("Failed to parse chapter-list JSON: {}", e),
            })?;

        let chapters = raw_chapters
            .into_iter()
            .enumerate()
            .map(|(i, c)| Chapter {
                index: i as i64,
                title: c.title.unwrap_or_else(|| format!("Chapter {}", i + 1)),
                time: c.time,
            })
            .collect();

        Ok(chapters)
    }

    pub fn get_diagnostics_sync(&self) -> MpvDiagnostics {
        let mpv_version = self
            .mpv
            .get_property_string("mpv-version")
            .unwrap_or_else(|_| "mpv (libmpv)".into());
        let active_vo = self
            .mpv
            .get_property_string("current-vo")
            .or_else(|_| self.mpv.get_property_string("vo"))
            .unwrap_or_else(|_| "gpu-next".into());
        let active_gpu_context = self
            .mpv
            .get_property_string("gpu-context")
            .unwrap_or_else(|_| "d3d11".into());
        let hwdec_current = self
            .mpv
            .get_property_string("hwdec-current")
            .unwrap_or_else(|_| "no".into());

        let st = self.get_status_sync();
        let tracks = self.get_tracks_sync().unwrap_or_default();

        let current_audio_track = tracks
            .iter()
            .find(|t| {
                t.track_type == TrackType::Audio
                    && (Some(t.id) == st.current_audio_track || t.selected)
            })
            .cloned();

        let current_sub_track = tracks
            .iter()
            .find(|t| {
                t.track_type == TrackType::Subtitle
                    && (Some(t.id) == st.current_sub_track || t.selected)
            })
            .cloned();

        MpvDiagnostics {
            libmpv_loaded: true,
            mpv_version,
            active_vo,
            active_gpu_context,
            hwdec_current,
            current_file: st.path,
            current_audio_track,
            current_sub_track,
            recent_error: st.error_message,
        }
    }
}

#[async_trait]
impl MediaBackend for MpvBackend {
    async fn load(&self, source: &MediaSource) -> Result<(), PlaybackError> {
        if self.is_shutting_down.load(Ordering::Relaxed) {
            return Err(PlaybackError::ShuttingDown);
        }

        let path_str = source.as_str();
        info!("Loading media: {}", path_str);

        // For HTTP/HTTPS streams, configure referrer to satisfy CDN hotlink protection
        if path_str.starts_with("http://") || path_str.starts_with("https://") {
            if path_str.contains("livepush") {
                let _ = self.mpv.set_property_string("referrer", "https://livepush.io/");
            } else if let Some(scheme_end) = path_str.find("://") {
                let after_scheme = &path_str[scheme_end + 3..];
                let host = if let Some(slash) = after_scheme.find('/') {
                    &after_scheme[..slash]
                } else {
                    after_scheme
                };
                let ref_url = format!("https://{}/", host);
                let _ = self.mpv.set_property_string("referrer", &ref_url);
            }
        } else {
            let _ = self.mpv.set_property_string("referrer", "");
        }

        {
            let mut status = self.status.write().unwrap();
            status.state = PlaybackState::Loading;
            status.path = Some(path_str.clone());
            status.title = Some(source.display_name());
            status.position = 0.0;
            status.duration = 0.0;
        }

        self.mpv.command(&["loadfile", &path_str, "replace"])?;
        Ok(())
    }

    async fn play(&self) -> Result<(), PlaybackError> {
        self.mpv.set_property_flag("pause", false)?;
        let mut st = self.status.write().unwrap();
        st.state = PlaybackState::Playing;
        Ok(())
    }

    async fn pause(&self) -> Result<(), PlaybackError> {
        self.mpv.set_property_flag("pause", true)?;
        let mut st = self.status.write().unwrap();
        st.state = PlaybackState::Paused;
        Ok(())
    }

    async fn toggle_play(&self) -> Result<(), PlaybackError> {
        if self.status.read().unwrap().state == PlaybackState::Stopped {
            return self.play().await;
        }
        self.mpv.command(&["cycle", "pause"])?;
        let is_paused = self.mpv.get_property_flag("pause").unwrap_or(false);
        let mut st = self.status.write().unwrap();
        st.state = if is_paused {
            PlaybackState::Paused
        } else {
            PlaybackState::Playing
        };
        Ok(())
    }

    async fn stop(&self) -> Result<(), PlaybackError> {
        let _ = self.mpv.command(&["stop"]);
        let _ = self.mpv.command(&["playlist-clear"]);
        let _ = self.mpv.set_property_flag("pause", true);
        let mut st = self.status.write().unwrap();
        st.state = PlaybackState::Stopped;
        st.path = None;
        st.title = None;
        st.position = 0.0;
        st.duration = 0.0;
        st.video_width = None;
        st.video_height = None;
        Ok(())
    }

    async fn seek(&self, position: Duration) -> Result<(), PlaybackError> {
        let secs = position.as_secs_f64();
        self.mpv
            .command(&["seek", &secs.to_string(), "absolute+exact"])?;
        let mut st = self.status.write().unwrap();
        st.position = secs;
        Ok(())
    }

    async fn seek_relative(&self, seconds: f64) -> Result<(), PlaybackError> {
        self.mpv
            .command(&["seek", &seconds.to_string(), "relative+exact"])?;
        Ok(())
    }

    async fn set_volume(&self, volume: f64) -> Result<(), PlaybackError> {
        let clamped = volume.clamp(0.0, 200.0);
        self.mpv.set_property_double("volume", clamped)?;
        let mut st = self.status.write().unwrap();
        st.volume = clamped;
        Ok(())
    }

    async fn set_muted(&self, muted: bool) -> Result<(), PlaybackError> {
        self.mpv.set_property_flag("mute", muted)?;
        let mut st = self.status.write().unwrap();
        st.muted = muted;
        Ok(())
    }

    async fn set_speed(&self, speed: f64) -> Result<(), PlaybackError> {
        let clamped = speed.clamp(0.25, 4.0);
        self.mpv.set_property_double("speed", clamped)?;
        let mut st = self.status.write().unwrap();
        st.speed = clamped;
        Ok(())
    }

    async fn set_audio_track(&self, track_id: Option<i64>) -> Result<(), PlaybackError> {
        match track_id {
            Some(id) => self.mpv.set_property_string("aid", &id.to_string())?,
            None => self.mpv.set_property_string("aid", "no")?,
        }
        let mut st = self.status.write().unwrap();
        st.current_audio_track = track_id;
        Ok(())
    }

    async fn set_subtitle_track(&self, track_id: Option<i64>) -> Result<(), PlaybackError> {
        match track_id {
            Some(id) => self.mpv.set_property_string("sid", &id.to_string())?,
            None => self.mpv.set_property_string("sid", "no")?,
        }
        let mut st = self.status.write().unwrap();
        st.current_sub_track = track_id;
        Ok(())
    }

    async fn add_external_subtitle(&self, path: &Path) -> Result<(), PlaybackError> {
        let path_str = path.to_string_lossy().to_string();
        info!("Adding external subtitle: {}", path_str);
        self.mpv
            .command(&["sub-add", &path_str, "select", "external"])?;
        Ok(())
    }

    async fn screenshot(&self, output_path: &Path) -> Result<(), PlaybackError> {
        let path_str = output_path.to_string_lossy().to_string();
        info!("Taking screenshot to: {}", path_str);
        self.mpv
            .command(&["screenshot-to-file", &path_str, "video"])?;
        Ok(())
    }

    async fn shutdown(&self) -> Result<(), PlaybackError> {
        info!("Shutting down libmpv backend");
        self.is_shutting_down.store(true, Ordering::SeqCst);
        let _ = self.mpv.command(&["quit"]);
        Ok(())
    }

    async fn get_status(&self) -> PlaybackStatus {
        self.get_status_sync()
    }

    async fn get_tracks(&self) -> Result<Vec<MediaTrack>, PlaybackError> {
        self.get_tracks_sync()
    }

    async fn get_chapters(&self) -> Result<Vec<Chapter>, PlaybackError> {
        self.get_chapters_sync()
    }

    async fn set_audio_delay(&self, seconds: f64) -> Result<(), PlaybackError> {
        self.mpv.set_property_double("audio-delay", seconds)?;
        Ok(())
    }

    async fn set_subtitle_delay(&self, seconds: f64) -> Result<(), PlaybackError> {
        self.mpv.set_property_double("sub-delay", seconds)?;
        Ok(())
    }

    async fn set_video_adjustments(&self, adj: &VideoAdjustments) -> Result<(), PlaybackError> {
        self.mpv
            .set_property_int64("brightness", adj.brightness as i64)?;
        self.mpv
            .set_property_int64("contrast", adj.contrast as i64)?;
        self.mpv
            .set_property_int64("saturation", adj.saturation as i64)?;
        self.mpv.set_property_int64("hue", adj.hue as i64)?;
        self.mpv.set_property_int64("gamma", adj.gamma as i64)?;

        // Rotation & flipping
        self.mpv
            .set_property_int64("video-rotate", adj.rotation as i64)?;
        let vf_flip = match (adj.flip_h, adj.flip_v) {
            (true, true) => "hflip,vflip",
            (true, false) => "hflip",
            (false, true) => "vflip",
            (false, false) => "",
        };
        if !vf_flip.is_empty() {
            let _ = self.mpv.set_property_string("vf", vf_flip);
        } else {
            let _ = self.mpv.set_property_string("vf", "");
        }

        // Aspect ratio
        if adj.aspect_ratio == "auto" {
            self.mpv
                .set_property_string("video-aspect-override", "-1")?;
        } else {
            self.mpv
                .set_property_string("video-aspect-override", &adj.aspect_ratio)?;
        }

        // Zoom & Pan
        self.mpv.set_property_double("video-zoom", adj.zoom - 1.0)?;
        self.mpv.set_property_double("video-pan-x", adj.pan_x)?;
        self.mpv.set_property_double("video-pan-y", adj.pan_y)?;

        // Deinterlace
        self.mpv.set_property_flag("deinterlace", adj.deinterlace)?;

        Ok(())
    }

    async fn set_equalizer(&self, eq: &EqualizerState) -> Result<(), PlaybackError> {
        if !eq.enabled {
            self.mpv.set_property_string("af", "")?;
            return Ok(());
        }

        let freqs = [
            31.0, 62.0, 125.0, 250.0, 500.0, 1000.0, 2000.0, 4000.0, 8000.0, 16000.0,
        ];
        let mut filter_parts = Vec::new();

        for (i, &f) in freqs.iter().enumerate() {
            let gain = eq.bands[i];
            filter_parts.push(format!("equalizer=f={}:width_type=o:w=1:g={}", f, gain));
        }

        let af_string = format!("lavfi=[{}]", filter_parts.join(","));
        debug!("Setting audio filter: {}", af_string);
        self.mpv.set_property_string("af", &af_string)?;
        Ok(())
    }

    async fn frame_step(&self, forward: bool) -> Result<(), PlaybackError> {
        if forward {
            self.mpv.command(&["frame-step"])?;
        } else {
            self.mpv.command(&["frame-back-step"])?;
        }
        Ok(())
    }

    async fn cycle_ab_loop(&self) -> Result<(), PlaybackError> {
        self.mpv.command(&["ab-loop"])?;
        let loop_a = self.mpv.get_property_double("ab-loop-a").ok();
        let loop_b = self.mpv.get_property_double("ab-loop-b").ok();
        let mut st = self.status.write().unwrap();
        st.ab_loop_a = loop_a;
        st.ab_loop_b = loop_b;
        info!("A-B loop cycled: A={:?}, B={:?}", loop_a, loop_b);
        Ok(())
    }

    async fn clear_ab_loop(&self) -> Result<(), PlaybackError> {
        let _ = self.mpv.set_property_string("ab-loop-a", "no");
        let _ = self.mpv.set_property_string("ab-loop-b", "no");
        let mut st = self.status.write().unwrap();
        st.ab_loop_a = None;
        st.ab_loop_b = None;
        info!("A-B loop cleared");
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_mpv_backend_lifecycle() {
        let backend = MpvBackend::new(None, Some("auto-safe"));
        assert!(
            backend.is_ok(),
            "Failed to create MpvBackend: {:?}",
            backend.err()
        );

        let backend = backend.unwrap();
        let status = backend.get_status().await;
        assert_eq!(status.state, PlaybackState::Idle);

        let res = backend.set_volume(85.0).await;
        assert!(res.is_ok());

        let res = backend.set_speed(1.5).await;
        assert!(res.is_ok());

        let res = backend.stop().await;
        assert!(res.is_ok(), "backend.stop failed: {:?}", res.err());

        let res = backend.shutdown().await;
        assert!(res.is_ok());
    }
}
