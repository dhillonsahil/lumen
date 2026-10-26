use libloading::Library;
use lumen_core::error::PlaybackError;
use std::ffi::{c_char, c_int, c_void};
use std::path::PathBuf;
use std::sync::Arc;
use tracing::{error, info};

pub type MpvHandle = c_void;

#[repr(C)]
#[derive(Debug, Copy, Clone, PartialEq, Eq)]
pub enum MpvFormat {
    None = 0,
    String = 1,
    OsdString = 2,
    Flag = 3,
    Int64 = 4,
    Double = 5,
    Node = 6,
    NodeArray = 7,
    NodeMap = 8,
    ByteArray = 9,
}

#[repr(C)]
#[derive(Debug, Copy, Clone, PartialEq, Eq)]
pub enum MpvEventId {
    None = 0,
    Shutdown = 1,
    LogMessage = 2,
    GetPropertyReply = 3,
    SetPropertyReply = 4,
    CommandReply = 5,
    StartFile = 6,
    EndFile = 7,
    FileLoaded = 8,
    Idle = 11,
    Tick = 14,
    ClientMessage = 16,
    VideoReconfig = 17,
    AudioReconfig = 18,
    Seek = 20,
    PlaybackRestart = 21,
    PropertyChange = 22,
    QueueOverflow = 24,
    Hook = 25,
}

#[repr(C)]
pub struct MpvEvent {
    pub event_id: MpvEventId,
    pub error: c_int,
    pub reply_userdata: u64,
    pub data: *mut c_void,
}

#[repr(C)]
pub struct MpvEventProperty {
    pub name: *const c_char,
    pub format: MpvFormat,
    pub data: *mut c_void,
}

#[repr(C)]
pub struct MpvEventEndFile {
    pub reason: c_int,
    pub error: c_int,
    pub playlist_entry_id: i64,
    pub playlist_insert_id: i64,
    pub playlist_insert_num_entries: c_int,
}

pub struct LibMpvApi {
    _lib: Library,
    pub mpv_create: unsafe extern "C" fn() -> *mut MpvHandle,
    pub mpv_initialize: unsafe extern "C" fn(*mut MpvHandle) -> c_int,
    pub mpv_destroy: unsafe extern "C" fn(*mut MpvHandle),
    pub mpv_terminate_destroy: unsafe extern "C" fn(*mut MpvHandle),
    pub mpv_command: unsafe extern "C" fn(*mut MpvHandle, *const *const c_char) -> c_int,
    pub mpv_command_string: unsafe extern "C" fn(*mut MpvHandle, *const c_char) -> c_int,
    pub mpv_set_option:
        unsafe extern "C" fn(*mut MpvHandle, *const c_char, MpvFormat, *mut c_void) -> c_int,
    pub mpv_set_option_string:
        unsafe extern "C" fn(*mut MpvHandle, *const c_char, *const c_char) -> c_int,
    pub mpv_get_property:
        unsafe extern "C" fn(*mut MpvHandle, *const c_char, MpvFormat, *mut c_void) -> c_int,
    pub mpv_get_property_string: unsafe extern "C" fn(*mut MpvHandle, *const c_char) -> *mut c_char,
    pub mpv_set_property:
        unsafe extern "C" fn(*mut MpvHandle, *const c_char, MpvFormat, *mut c_void) -> c_int,
    pub mpv_set_property_string:
        unsafe extern "C" fn(*mut MpvHandle, *const c_char, *const c_char) -> c_int,
    pub mpv_observe_property:
        unsafe extern "C" fn(*mut MpvHandle, u64, *const c_char, MpvFormat) -> c_int,
    pub mpv_unobserve_property: unsafe extern "C" fn(*mut MpvHandle, u64) -> c_int,
    pub mpv_wait_event: unsafe extern "C" fn(*mut MpvHandle, f64) -> *mut MpvEvent,
    pub mpv_free: unsafe extern "C" fn(*mut c_void),
    pub mpv_error_string: unsafe extern "C" fn(c_int) -> *const c_char,
}

impl LibMpvApi {
    pub fn load() -> Result<Arc<Self>, PlaybackError> {
        let candidates = get_dll_candidates();

        let mut last_err = None;
        for path in &candidates {
            match unsafe { Library::new(path) } {
                Ok(lib) => {
                    info!("Successfully loaded libmpv from: {:?}", path);
                    match Self::bind_symbols(lib) {
                        Ok(api) => return Ok(Arc::new(api)),
                        Err(e) => {
                            error!("Failed to bind symbols from {:?}: {}", path, e);
                            last_err = Some(e);
                        }
                    }
                }
                Err(e) => {
                    last_err = Some(PlaybackError::LibraryLoadError(format!(
                        "Could not load {:?}: {}",
                        path, e
                    )));
                }
            }
        }

        Err(last_err.unwrap_or_else(|| {
            PlaybackError::LibraryLoadError(
                "libmpv dynamic library could not be found in any expected location".into(),
            )
        }))
    }

    fn bind_symbols(lib: Library) -> Result<Self, PlaybackError> {
        unsafe {
            macro_rules! load_sym {
                ($name:ident) => {
                    match lib.get(stringify!($name).as_bytes()) {
                        Ok(sym) => *sym,
                        Err(e) => {
                            return Err(PlaybackError::LibraryLoadError(format!(
                                "Missing symbol {}: {}",
                                stringify!($name),
                                e
                            )));
                        }
                    }
                };
            }

            let mpv_create = load_sym!(mpv_create);
            let mpv_initialize = load_sym!(mpv_initialize);
            let mpv_destroy = load_sym!(mpv_destroy);
            let mpv_terminate_destroy = load_sym!(mpv_terminate_destroy);
            let mpv_command = load_sym!(mpv_command);
            let mpv_command_string = load_sym!(mpv_command_string);
            let mpv_set_option = load_sym!(mpv_set_option);
            let mpv_set_option_string = load_sym!(mpv_set_option_string);
            let mpv_get_property = load_sym!(mpv_get_property);
            let mpv_get_property_string = load_sym!(mpv_get_property_string);
            let mpv_set_property = load_sym!(mpv_set_property);
            let mpv_set_property_string = load_sym!(mpv_set_property_string);
            let mpv_observe_property = load_sym!(mpv_observe_property);
            let mpv_unobserve_property = load_sym!(mpv_unobserve_property);
            let mpv_wait_event = load_sym!(mpv_wait_event);
            let mpv_free = load_sym!(mpv_free);
            let mpv_error_string = load_sym!(mpv_error_string);

            Ok(Self {
                _lib: lib,
                mpv_create,
                mpv_initialize,
                mpv_destroy,
                mpv_terminate_destroy,
                mpv_command,
                mpv_command_string,
                mpv_set_option,
                mpv_set_option_string,
                mpv_get_property,
                mpv_get_property_string,
                mpv_set_property,
                mpv_set_property_string,
                mpv_observe_property,
                mpv_unobserve_property,
                mpv_wait_event,
                mpv_free,
                mpv_error_string,
            })
        }
    }
}

fn get_dll_candidates() -> Vec<PathBuf> {
    let mut candidates = Vec::new();

    // 1. Current executable directory and parent directories (up to 5 levels)
    if let Ok(exe_path) = std::env::current_exe() {
        let mut curr = exe_path.parent();
        for _ in 0..5 {
            if let Some(p) = curr {
                #[cfg(target_os = "windows")]
                {
                    candidates.push(p.join("libmpv-2.dll"));
                    candidates.push(p.join("mpv-2.dll"));
                    candidates.push(p.join("libmpv.dll"));
                    candidates.push(p.join("resources").join("libmpv-2.dll"));
                    candidates.push(p.join("resources").join("mpv-2.dll"));
                    candidates.push(p.join("resources").join("libmpv.dll"));
                    candidates.push(p.join("packaging/windows/libmpv/libmpv-2.dll"));
                }
                #[cfg(target_os = "linux")]
                {
                    candidates.push(p.join("libmpv.so.2"));
                    candidates.push(p.join("libmpv.so.1"));
                    candidates.push(p.join("libmpv.so"));
                    candidates.push(p.join("lib").join("libmpv.so.2"));
                    candidates.push(p.join("lib").join("x86_64-linux-gnu").join("libmpv.so.2"));
                    candidates.push(p.join("resources").join("libmpv.so.2"));
                    candidates.push(p.join("resources").join("libmpv.so"));
                    candidates.push(p.join("../lib").join("libmpv.so.2"));
                    candidates.push(p.join("../lib").join("x86_64-linux-gnu").join("libmpv.so.2"));
                    candidates.push(p.join("../lib64").join("libmpv.so.2"));
                }
                #[cfg(target_os = "macos")]
                {
                    candidates.push(p.join("libmpv.2.dylib"));
                    candidates.push(p.join("libmpv.dylib"));
                    candidates.push(p.join("../Frameworks").join("libmpv.2.dylib"));
                    candidates.push(p.join("../Frameworks").join("libmpv.dylib"));
                    candidates.push(p.join("resources").join("libmpv.2.dylib"));
                }
                curr = p.parent();
            } else {
                break;
            }
        }
    }

    // 2. Current working directory and parent directories
    if let Ok(cwd) = std::env::current_dir() {
        let mut curr = Some(cwd.as_path());
        for _ in 0..5 {
            if let Some(p) = curr {
                #[cfg(target_os = "windows")]
                {
                    candidates.push(p.join("libmpv-2.dll"));
                    candidates.push(p.join("mpv-2.dll"));
                    candidates.push(p.join("libmpv.dll"));
                    candidates.push(p.join("resources").join("libmpv-2.dll"));
                    candidates.push(p.join("resources").join("mpv-2.dll"));
                    candidates.push(p.join("resources").join("libmpv.dll"));
                    candidates.push(p.join("packaging/windows/libmpv/libmpv-2.dll"));
                    candidates.push(p.join("target/debug/libmpv-2.dll"));
                    candidates.push(p.join("target/release/libmpv-2.dll"));
                }
                #[cfg(target_os = "linux")]
                {
                    candidates.push(p.join("libmpv.so.2"));
                    candidates.push(p.join("libmpv.so.1"));
                    candidates.push(p.join("libmpv.so"));
                    candidates.push(p.join("target/debug/libmpv.so.2"));
                    candidates.push(p.join("target/release/libmpv.so.2"));
                }
                curr = p.parent();
            } else {
                break;
            }
        }
    }

    // 3. AppImage APPDIR environment check
    #[cfg(target_os = "linux")]
    {
        if let Ok(appdir) = std::env::var("APPDIR") {
            let base = PathBuf::from(appdir);
            candidates.push(base.join("usr/lib/libmpv.so.2"));
            candidates.push(base.join("usr/lib/x86_64-linux-gnu/libmpv.so.2"));
            candidates.push(base.join("usr/lib/libmpv.so.1"));
            candidates.push(base.join("usr/lib/libmpv.so"));
            candidates.push(base.join("usr/lib64/libmpv.so.2"));
        }
    }

    // 4. Fallbacks on PATH / system loaders
    #[cfg(target_os = "windows")]
    {
        candidates.push(PathBuf::from("libmpv-2.dll"));
        candidates.push(PathBuf::from("mpv-2.dll"));
        candidates.push(PathBuf::from("libmpv.dll"));
    }

    #[cfg(target_os = "linux")]
    {
        candidates.push(PathBuf::from("/usr/lib/x86_64-linux-gnu/libmpv.so.2"));
        candidates.push(PathBuf::from("/usr/lib64/libmpv.so.2"));
        candidates.push(PathBuf::from("/usr/lib/libmpv.so.2"));
        candidates.push(PathBuf::from("/usr/local/lib/libmpv.so.2"));
        candidates.push(PathBuf::from("/app/lib/libmpv.so.2")); // Flatpak runtime
        candidates.push(PathBuf::from("libmpv.so.2"));
        candidates.push(PathBuf::from("libmpv.so.1"));
        candidates.push(PathBuf::from("libmpv.so"));
    }

    #[cfg(target_os = "macos")]
    {
        candidates.push(PathBuf::from("/opt/homebrew/lib/libmpv.dylib"));
        candidates.push(PathBuf::from("/usr/local/lib/libmpv.dylib"));
        candidates.push(PathBuf::from("libmpv.2.dylib"));
        candidates.push(PathBuf::from("libmpv.dylib"));
    }

    candidates
}
