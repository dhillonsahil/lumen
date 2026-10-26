use chrono::Utc;
use lumen_core::error::LumenError;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::sync::{Arc, Mutex};
use tracing::info;
use walkdir::WalkDir;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryItem {
    pub path: String,
    pub title: String,
    pub last_position: f64,
    pub duration: f64,
    pub last_played_at: String,
    pub completed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LibraryItem {
    pub id: i64,
    pub path: String,
    pub title: String,
    pub duration: f64,
    pub file_size: u64,
    pub format: String,
}

pub struct MediaLibrary {
    conn: Arc<Mutex<Connection>>,
}

impl MediaLibrary {
    pub fn new(db_path: &Path) -> Result<Self, LumenError> {
        if let Some(parent) = db_path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }

        let conn = Connection::open(db_path)
            .map_err(|e| LumenError::Library(format!("Failed to open database: {}", e)))?;

        conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS media_history (
                path TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                last_position REAL NOT NULL,
                duration REAL NOT NULL,
                last_played_at TEXT NOT NULL,
                completed INTEGER NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS media_library (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                path TEXT UNIQUE NOT NULL,
                title TEXT NOT NULL,
                duration REAL NOT NULL DEFAULT 0.0,
                file_size INTEGER NOT NULL DEFAULT 0,
                format TEXT NOT NULL DEFAULT '',
                added_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_history_played ON media_history(last_played_at DESC);
            ",
        )
        .map_err(|e| LumenError::Library(format!("Failed to initialize tables: {}", e)))?;

        info!("Media library SQLite database initialized at {:?}", db_path);
        Ok(Self {
            conn: Arc::new(Mutex::new(conn)),
        })
    }

    pub fn save_resume_position(
        &self,
        path: &str,
        title: &str,
        position: f64,
        duration: f64,
    ) -> Result<(), LumenError> {
        let conn = self.conn.lock().unwrap();
        let now = Utc::now().to_rfc3339();
        let completed = if duration > 0.0 && position >= duration * 0.95 {
            1
        } else {
            0
        };

        conn.execute(
            "
            INSERT INTO media_history (path, title, last_position, duration, last_played_at, completed)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6)
            ON CONFLICT(path) DO UPDATE SET
                title = excluded.title,
                last_position = excluded.last_position,
                duration = excluded.duration,
                last_played_at = excluded.last_played_at,
                completed = excluded.completed;
            ",
            params![path, title, position, duration, now, completed],
        )
        .map_err(|e| LumenError::Library(format!("Failed to save resume position: {}", e)))?;

        Ok(())
    }

    pub fn get_resume_position(&self, path: &str) -> Option<f64> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn
            .prepare("SELECT last_position, completed FROM media_history WHERE path = ?1")
            .ok()?;

        let mut rows = stmt.query(params![path]).ok()?;
        if let Some(row) = rows.next().ok()? {
            let pos: f64 = row.get(0).unwrap_or(0.0);
            let completed: i32 = row.get(1).unwrap_or(0);
            if completed == 0 && pos > 5.0 {
                return Some(pos);
            }
        }
        None
    }

    pub fn get_recent_history(&self, limit: usize) -> Result<Vec<HistoryItem>, LumenError> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn
            .prepare(
                "SELECT path, title, last_position, duration, last_played_at, completed
                 FROM media_history ORDER BY last_played_at DESC LIMIT ?1",
            )
            .map_err(|e| LumenError::Library(e.to_string()))?;

        let rows = stmt
            .query_map(params![limit as i64], |row| {
                Ok(HistoryItem {
                    path: row.get(0)?,
                    title: row.get(1)?,
                    last_position: row.get(2)?,
                    duration: row.get(3)?,
                    last_played_at: row.get(4)?,
                    completed: row.get::<_, i32>(5)? != 0,
                })
            })
            .map_err(|e| LumenError::Library(e.to_string()))?;

        let mut items = Vec::new();
        for item in rows.flatten() {
            items.push(item);
        }
        Ok(items)
    }

    pub fn scan_folder(&self, folder: &Path) -> Result<Vec<LibraryItem>, LumenError> {
        let extensions = [
            "mp4", "mkv", "webm", "avi", "mov", "ts", "flv", "m4v", "wmv", "mp3", "flac", "aac",
            "m4a", "wav", "ogg", "opus",
        ];

        let mut scanned = Vec::new();
        for entry in WalkDir::new(folder).into_iter().filter_map(|e| e.ok()) {
            let path = entry.path();
            if path.is_file() {
                if let Some(ext) = path.extension().and_then(|s| s.to_str()) {
                    let ext_lower = ext.to_lowercase();
                    if extensions.contains(&ext_lower.as_str()) {
                        let path_str = path.to_string_lossy().to_string();
                        let title = path
                            .file_stem()
                            .map(|s| s.to_string_lossy().to_string())
                            .unwrap_or_else(|| path_str.clone());
                        let metadata = std::fs::metadata(path).ok();
                        let size = metadata.map(|m| m.len()).unwrap_or(0);

                        scanned.push((path_str, title, size, ext_lower));
                    }
                }
            }
        }

        let conn = self.conn.lock().unwrap();
        let now = Utc::now().to_rfc3339();

        let mut result = Vec::new();
        for (path, title, size, ext) in &scanned {
            let _ = conn.execute(
                "INSERT OR IGNORE INTO media_library (path, title, file_size, format, added_at)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                params![path, title, size, ext, now],
            );
            result.push(LibraryItem {
                id: 0,
                path: path.clone(),
                title: title.clone(),
                duration: 0.0,
                file_size: *size,
                format: ext.clone(),
            });
        }

        Ok(result)
    }

    pub fn get_all_library_items(&self) -> Result<Vec<LibraryItem>, LumenError> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn
            .prepare("SELECT id, path, title, duration, file_size, format FROM media_library ORDER BY title ASC")
            .map_err(|e| LumenError::Library(e.to_string()))?;

        let rows = stmt
            .query_map([], |row| {
                Ok(LibraryItem {
                    id: row.get(0)?,
                    path: row.get(1)?,
                    title: row.get(2)?,
                    duration: row.get(3)?,
                    file_size: row.get(4)?,
                    format: row.get(5)?,
                })
            })
            .map_err(|e| LumenError::Library(e.to_string()))?;

        let mut items = Vec::new();
        for item in rows.flatten() {
            items.push(item);
        }
        Ok(items)
    }

    pub fn search_library(&self, query: &str) -> Result<Vec<LibraryItem>, LumenError> {
        let conn = self.conn.lock().unwrap();
        let pattern = format!("%{}%", query);
        let mut stmt = conn
            .prepare("SELECT id, path, title, duration, file_size, format FROM media_library WHERE title LIKE ?1 OR path LIKE ?1 ORDER BY title ASC")
            .map_err(|e| LumenError::Library(e.to_string()))?;

        let rows = stmt
            .query_map(params![pattern], |row| {
                Ok(LibraryItem {
                    id: row.get(0)?,
                    path: row.get(1)?,
                    title: row.get(2)?,
                    duration: row.get(3)?,
                    file_size: row.get(4)?,
                    format: row.get(5)?,
                })
            })
            .map_err(|e| LumenError::Library(e.to_string()))?;

        Ok(rows.flatten().collect())
    }

    pub fn remove_library_item(&self, id: i64) -> Result<(), LumenError> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM media_library WHERE id = ?1", params![id])
            .map_err(|e| LumenError::Library(e.to_string()))?;
        Ok(())
    }

    pub fn get_continue_watching(&self) -> Result<Vec<HistoryItem>, LumenError> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn
            .prepare(
                "SELECT path, title, last_position, duration, last_played_at, completed
                 FROM media_history WHERE completed = 0 AND last_position > 5.0
                 ORDER BY last_played_at DESC LIMIT 20",
            )
            .map_err(|e| LumenError::Library(e.to_string()))?;

        let rows = stmt
            .query_map([], |row| {
                Ok(HistoryItem {
                    path: row.get(0)?,
                    title: row.get(1)?,
                    last_position: row.get(2)?,
                    duration: row.get(3)?,
                    last_played_at: row.get(4)?,
                    completed: row.get::<_, i32>(5)? != 0,
                })
            })
            .map_err(|e| LumenError::Library(e.to_string()))?;

        Ok(rows.flatten().collect())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sqlite_resume_position() {
        let temp_dir = std::env::temp_dir().join(format!("lumen_test_{}", std::process::id()));
        let db_path = temp_dir.join("test_lib.db");

        let lib = MediaLibrary::new(&db_path).expect("Failed to init db");
        lib.save_resume_position("C:/media/movie.mkv", "Movie", 125.5, 3600.0)
            .expect("Failed to save resume");

        let pos = lib.get_resume_position("C:/media/movie.mkv");
        assert_eq!(pos, Some(125.5));

        let history = lib.get_recent_history(10).expect("Failed to get history");
        assert_eq!(history.len(), 1);
        assert_eq!(history[0].title, "Movie");

        let _ = std::fs::remove_dir_all(temp_dir);
    }
}
