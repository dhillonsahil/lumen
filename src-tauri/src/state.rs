use lumen_core::playlist::Playlist;
use lumen_core::settings::AppSettings;
use lumen_library::MediaLibrary;
use lumen_playback::{MpvBackend, MpvEventLoop};
use std::sync::Arc;
use tokio::sync::RwLock;

pub struct AppState {
    pub backend: Arc<MpvBackend>,
    pub library: Arc<MediaLibrary>,
    pub playlist: Arc<RwLock<Playlist>>,
    pub settings: Arc<RwLock<AppSettings>>,
    pub event_loop: MpvEventLoop,
}

impl AppState {
    pub fn new(
        backend: Arc<MpvBackend>,
        library: Arc<MediaLibrary>,
        settings: AppSettings,
        event_loop: MpvEventLoop,
    ) -> Self {
        Self {
            backend,
            library,
            playlist: Arc::new(RwLock::new(Playlist::new())),
            settings: Arc::new(RwLock::new(settings)),
            event_loop,
        }
    }
}
