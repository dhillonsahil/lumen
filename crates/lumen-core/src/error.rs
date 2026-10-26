use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Error, Debug, Serialize, Deserialize, Clone)]
#[serde(tag = "type", content = "message")]
pub enum LumenError {
    #[error("Playback error: {0}")]
    Playback(String),

    #[error("Engine initialization error: {0}")]
    EngineInit(String),

    #[error("Track selection error: {0}")]
    Track(String),

    #[error("File or I/O error: {0}")]
    Io(String),

    #[error("Library database error: {0}")]
    Library(String),

    #[error("Platform integration error: {0}")]
    Platform(String),

    #[error("Format/codec error: {0}")]
    Codec(String),

    #[error("Invalid operation: {0}")]
    InvalidOperation(String),
}

#[derive(Error, Debug, Serialize, Deserialize, Clone)]
#[serde(tag = "type", content = "message")]
pub enum PlaybackError {
    #[error("Failed to initialize libmpv: {0}")]
    InitFailed(String),

    #[error("libmpv dynamic library not found or could not be loaded: {0}")]
    LibraryLoadError(String),

    #[error("Failed to load media '{path}': {message}")]
    LoadFailed { path: String, message: String },

    #[error("Property error '{property}': {message}")]
    PropertyError { property: String, message: String },

    #[error("Command execution error '{command}': {message}")]
    CommandError { command: String, message: String },

    #[error("Track switch error: {0}")]
    TrackError(String),

    #[error("Playback not ready or stopped")]
    NotReady,

    #[error("Engine shutting down")]
    ShuttingDown,
}

impl From<PlaybackError> for LumenError {
    fn from(err: PlaybackError) -> Self {
        LumenError::Playback(err.to_string())
    }
}
