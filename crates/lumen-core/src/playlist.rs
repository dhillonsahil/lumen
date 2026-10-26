use serde::{Deserialize, Serialize};
use std::path::Path;
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum RepeatMode {
    Off,
    One,
    All,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PlaylistItem {
    pub id: String,
    pub path: String,
    pub title: String,
    pub duration: f64,
}

impl PlaylistItem {
    pub fn new(path: String, title: Option<String>, duration: Option<f64>) -> Self {
        let display_title = title.unwrap_or_else(|| {
            Path::new(&path)
                .file_name()
                .map(|s| s.to_string_lossy().to_string())
                .unwrap_or_else(|| path.clone())
        });

        Self {
            id: Uuid::new_v4().to_string(),
            path,
            title: display_title,
            duration: duration.unwrap_or(0.0),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Playlist {
    pub items: Vec<PlaylistItem>,
    pub current_index: Option<usize>,
    pub shuffle: bool,
    pub repeat_mode: RepeatMode,
}

impl Default for Playlist {
    fn default() -> Self {
        Self {
            items: Vec::new(),
            current_index: None,
            shuffle: false,
            repeat_mode: RepeatMode::Off,
        }
    }
}

impl Playlist {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn add(&mut self, item: PlaylistItem) {
        self.items.push(item);
        if self.current_index.is_none() {
            self.current_index = Some(0);
        }
    }

    pub fn remove(&mut self, index: usize) -> Option<PlaylistItem> {
        if index >= self.items.len() {
            return None;
        }
        let item = self.items.remove(index);
        if let Some(curr) = self.current_index {
            if self.items.is_empty() {
                self.current_index = None;
            } else if curr == index {
                if index >= self.items.len() {
                    self.current_index = Some(self.items.len() - 1);
                } else {
                    self.current_index = Some(index);
                }
            } else if curr > index {
                self.current_index = Some(curr - 1);
            }
        }
        Some(item)
    }

    pub fn clear(&mut self) {
        self.items.clear();
        self.current_index = None;
    }

    pub fn reorder(&mut self, from: usize, to: usize) {
        if from >= self.items.len() || to >= self.items.len() || from == to {
            return;
        }
        let item = self.items.remove(from);
        self.items.insert(to, item);
        if let Some(curr) = self.current_index {
            if curr == from {
                self.current_index = Some(to);
            } else if from < curr && to >= curr {
                self.current_index = Some(curr - 1);
            } else if from > curr && to <= curr {
                self.current_index = Some(curr + 1);
            }
        }
    }

    pub fn current(&self) -> Option<&PlaylistItem> {
        self.current_index.and_then(|idx| self.items.get(idx))
    }

    pub fn next_index(&self) -> Option<usize> {
        if self.items.is_empty() {
            return None;
        }
        match self.repeat_mode {
            RepeatMode::One => self.current_index,
            RepeatMode::All => {
                let curr = self.current_index.unwrap_or(0);
                Some((curr + 1) % self.items.len())
            }
            RepeatMode::Off => {
                let curr = self.current_index.unwrap_or(0);
                if curr + 1 < self.items.len() {
                    Some(curr + 1)
                } else {
                    None
                }
            }
        }
    }

    pub fn prev_index(&self) -> Option<usize> {
        if self.items.is_empty() {
            return None;
        }
        let curr = self.current_index.unwrap_or(0);
        if curr > 0 {
            Some(curr - 1)
        } else if self.repeat_mode == RepeatMode::All {
            Some(self.items.len() - 1)
        } else {
            Some(0)
        }
    }

    /// Export to M3U / M3U8 string
    pub fn to_m3u(&self) -> String {
        let mut out = String::from("#EXTM3U\n");
        for item in &self.items {
            let dur = item.duration.round() as i64;
            out.push_str(&format!("#EXTINF:{},{}\n{}\n", dur, item.title, item.path));
        }
        out
    }

    /// Import from M3U / M3U8 string
    pub fn from_m3u(content: &str) -> Self {
        let mut items = Vec::new();
        let mut pending_title = None;
        let mut pending_duration = 0.0;

        for line in content.lines() {
            let trimmed = line.trim();
            if trimmed.is_empty() {
                continue;
            }
            if let Some(rest) = trimmed.strip_prefix("#EXTINF:") {
                let parts: Vec<&str> = rest.splitn(2, ',').collect();
                if let Some(dur_str) = parts.first() {
                    let dur_clean = dur_str.split_whitespace().next().unwrap_or("0");
                    let parsed = dur_clean.trim().parse::<f64>().unwrap_or(0.0);
                    pending_duration = if parsed > 0.0 { parsed } else { 0.0 };
                }
                if parts.len() > 1 {
                    pending_title = Some(parts[1].trim().to_string());
                }
            } else if !trimmed.starts_with('#') {
                let item = PlaylistItem::new(
                    trimmed.to_string(),
                    pending_title.take(),
                    Some(pending_duration),
                );
                items.push(item);
                pending_duration = 0.0;
            }
        }

        Self {
            items,
            current_index: None,
            shuffle: false,
            repeat_mode: RepeatMode::Off,
        }
    }

    /// Export to PLS format
    pub fn to_pls(&self) -> String {
        let mut out = String::from("[playlist]\n");
        for (i, item) in self.items.iter().enumerate() {
            let idx = i + 1;
            out.push_str(&format!("File{}={}\n", idx, item.path));
            out.push_str(&format!("Title{}={}\n", idx, item.title));
            out.push_str(&format!("Length{}={}\n", idx, item.duration.round() as i64));
        }
        out.push_str(&format!(
            "NumberOfEntries={}\nVersion=2\n",
            self.items.len()
        ));
        out
    }

    /// Export to XSPF (XML Shareable Playlist Format)
    pub fn to_xspf(&self) -> String {
        let mut out = String::from(
            "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<playlist version=\"1\" xmlns=\"http://xspf.org/ns/0/\">\n  <trackList>\n"
        );
        for item in &self.items {
            out.push_str("    <track>\n");
            out.push_str(&format!(
                "      <location>{}</location>\n",
                quick_xml_escape(&item.path)
            ));
            out.push_str(&format!(
                "      <title>{}</title>\n",
                quick_xml_escape(&item.title)
            ));
            out.push_str(&format!(
                "      <duration>{}</duration>\n",
                (item.duration * 1000.0).round() as u64
            ));
            out.push_str("    </track>\n");
        }
        out.push_str("  </trackList>\n</playlist>\n");
        out
    }

    /// Import from PLS format
    pub fn from_pls(content: &str) -> Self {
        let mut file_map = std::collections::HashMap::new();
        let mut title_map = std::collections::HashMap::new();
        let mut len_map = std::collections::HashMap::new();

        for line in content.lines() {
            let trimmed = line.trim();
            if let Some((k, v)) = trimmed.split_once('=') {
                let k_lower = k.to_lowercase();
                if let Some(idx_str) = k_lower.strip_prefix("file") {
                    if let Ok(idx) = idx_str.parse::<usize>() {
                        file_map.insert(idx, v.trim().to_string());
                    }
                } else if let Some(idx_str) = k_lower.strip_prefix("title") {
                    if let Ok(idx) = idx_str.parse::<usize>() {
                        title_map.insert(idx, v.trim().to_string());
                    }
                } else if let Some(idx_str) = k_lower.strip_prefix("length") {
                    if let Ok(idx) = idx_str.parse::<usize>() {
                        len_map.insert(idx, v.trim().parse::<f64>().unwrap_or(0.0));
                    }
                }
            }
        }

        let mut indices: Vec<_> = file_map.keys().copied().collect();
        indices.sort_unstable();
        let mut items = Vec::new();
        for idx in indices {
            if let Some(path) = file_map.remove(&idx) {
                let title = title_map.remove(&idx);
                let dur = len_map.remove(&idx);
                items.push(PlaylistItem::new(path, title, dur));
            }
        }

        Self {
            items,
            current_index: None,
            shuffle: false,
            repeat_mode: RepeatMode::Off,
        }
    }

    /// Import from XSPF (XML Shareable Playlist Format)
    pub fn from_xspf(content: &str) -> Self {
        let mut items = Vec::new();
        let mut in_track = false;
        let mut loc: Option<String> = None;
        let mut title: Option<String> = None;
        let mut dur: Option<f64> = None;

        for line in content.lines() {
            let trimmed = line.trim();
            if trimmed.contains("<track>") {
                in_track = true;
                loc = None;
                title = None;
                dur = None;
            } else if trimmed.contains("</track>") {
                if in_track {
                    if let Some(p) = loc.take() {
                        items.push(PlaylistItem::new(p, title.take(), dur.take()));
                    }
                    in_track = false;
                }
            } else if in_track {
                if let (Some(start), Some(end)) =
                    (trimmed.find("<location>"), trimmed.find("</location>"))
                {
                    loc = Some(
                        trimmed[start + 10..end]
                            .replace("&amp;", "&")
                            .replace("&lt;", "<")
                            .replace("&gt;", ">"),
                    );
                } else if let (Some(start), Some(end)) =
                    (trimmed.find("<title>"), trimmed.find("</title>"))
                {
                    title = Some(
                        trimmed[start + 7..end]
                            .replace("&amp;", "&")
                            .replace("&lt;", "<")
                            .replace("&gt;", ">"),
                    );
                } else if let (Some(start), Some(end)) =
                    (trimmed.find("<duration>"), trimmed.find("</duration>"))
                {
                    let ms = trimmed[start + 10..end].parse::<f64>().unwrap_or(0.0);
                    dur = Some(ms / 1000.0);
                }
            }
        }

        Self {
            items,
            current_index: None,
            shuffle: false,
            repeat_mode: RepeatMode::Off,
        }
    }
}

fn quick_xml_escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_playlist_m3u_roundtrip() {
        let mut pl = Playlist::new();
        pl.add(PlaylistItem::new(
            "C:/video1.mp4".into(),
            Some("Video 1".into()),
            Some(120.0),
        ));
        pl.add(PlaylistItem::new(
            "C:/video2.mkv".into(),
            Some("Video 2".into()),
            Some(340.0),
        ));

        let m3u = pl.to_m3u();
        assert!(m3u.contains("#EXTM3U"));
        assert!(m3u.contains("#EXTINF:120,Video 1"));
        assert!(m3u.contains("C:/video1.mp4"));

        let imported = Playlist::from_m3u(&m3u);
        assert_eq!(imported.items.len(), 2);
        assert_eq!(imported.items[0].path, "C:/video1.mp4");
        assert_eq!(imported.items[0].title, "Video 1");
        assert_eq!(imported.items[0].duration, 120.0);
    }

    #[test]
    fn test_playlist_pls_export() {
        let mut pl = Playlist::new();
        pl.add(PlaylistItem::new(
            "C:/audio.flac".into(),
            Some("Flac Audio".into()),
            Some(200.0),
        ));
        let pls = pl.to_pls();
        assert!(pls.contains("[playlist]"));
        assert!(pls.contains("File1=C:/audio.flac"));
        assert!(pls.contains("Title1=Flac Audio"));
    }

    #[test]
    fn test_playlist_navigation() {
        let mut pl = Playlist::new();
        pl.add(PlaylistItem::new("1.mp4".into(), None, None));
        pl.add(PlaylistItem::new("2.mp4".into(), None, None));
        pl.current_index = Some(0);

        assert_eq!(pl.next_index(), Some(1));
        pl.current_index = Some(1);
        assert_eq!(pl.next_index(), None); // Off mode

        pl.repeat_mode = RepeatMode::All;
        assert_eq!(pl.next_index(), Some(0)); // Wraps around
    }

    #[test]
    fn test_playlist_pls_roundtrip() {
        let mut pl = Playlist::new();
        pl.add(PlaylistItem::new(
            "C:/song1.mp3".into(),
            Some("Song 1".into()),
            Some(180.0),
        ));
        let pls_str = pl.to_pls();
        let imported = Playlist::from_pls(&pls_str);
        assert_eq!(imported.items.len(), 1);
        assert_eq!(imported.items[0].path, "C:/song1.mp3");
        assert_eq!(imported.items[0].title, "Song 1");
        assert_eq!(imported.items[0].duration, 180.0);
    }

    #[test]
    fn test_playlist_xspf_roundtrip() {
        let mut pl = Playlist::new();
        pl.add(PlaylistItem::new(
            "C:/movie.mp4".into(),
            Some("Movie & Show".into()),
            Some(3600.0),
        ));
        let xspf_str = pl.to_xspf();
        let imported = Playlist::from_xspf(&xspf_str);
        assert_eq!(imported.items.len(), 1);
        assert_eq!(imported.items[0].path, "C:/movie.mp4");
        assert_eq!(imported.items[0].title, "Movie & Show");
        assert_eq!(imported.items[0].duration, 3600.0);
    }

    #[test]
    fn test_playlist_reorder() {
        let mut pl = Playlist::new();
        pl.add(PlaylistItem::new(
            "1.mp4".into(),
            Some("First".into()),
            None,
        ));
        pl.add(PlaylistItem::new(
            "2.mp4".into(),
            Some("Second".into()),
            None,
        ));
        pl.add(PlaylistItem::new(
            "3.mp4".into(),
            Some("Third".into()),
            None,
        ));

        pl.reorder(0, 2);
        assert_eq!(pl.items[0].title, "Second");
        assert_eq!(pl.items[1].title, "Third");
        assert_eq!(pl.items[2].title, "First");
    }
}
