# Lumen v2

A high-performance, production-quality native desktop media player built with **Tauri v2**, **Rust**, and **React 18 + TypeScript**, powered exclusively by **libmpv** as its decoding and rendering pipeline.

---

## 🌟 Key Architecture & Highlights

- **Pure libmpv Pipeline**: Decoding, demuxing, video filtering, audio output, and subtitle rasterization (libass) are performed exclusively through native `libmpv`. React is purely a glassmorphic control surface overlay.
- **Native HWND Direct3D11 Embedding**: On Windows, libmpv's Direct3D11 surface attaches directly to the window's native HWND via mpv's `wid` property, rendering beneath transparent Webview composition for maximum hardware acceleration and zero UI contention.
- **Format & Codec Support**:
  - Video: MKV, MP4, WebM, AVI, MOV, TS, FLV, HEVC/H.265, AV1, VP9, H.264.
  - Audio: AC-3 (Dolby Digital), DTS, AAC, FLAC, MP3, Opus, Vorbis, PCM.
  - Subtitles: Embedded ASS/SSA styled subtitles, embedded SRT, and external subtitle auto-detection & loading.
- **Multi-Track Audio & Subtitle Switching**: Seamlessly switch between multiple audio and subtitle streams using mpv's native `aid` and `sid` properties.
- **Audio Equalizer**: 10-band audio equalizer (-12dB to +12dB) with built-in presets (Flat, Bass Boost, Vocal Boost, Rock, Pop, Jazz, Classical).
- **Video Adjustments**: Real-time hardware adjustments for Brightness, Contrast, Saturation, Hue, Gamma, Aspect Ratio (Auto, 16:9, 4:3, 21:9), 90°/180°/270° Rotation, Horizontal/Vertical Flip, Zoom, and Deinterlacing.
- **SQLite Library & Resumption**: Automatically saves and resumes playback positions and tracks recent history.
- **Playlist Management**: Supports queue reordering, shuffle, repeat (Off, One, All), and M3U / M3U8 / PLS / XSPF import/export.
- **Network Streaming**: Supports HLS (.m3u8), DASH, and HTTP/RTMP streaming urls.
- **Glassmorphic UI**: Sleek dark desktop UI crafted in pure Vanilla CSS with auto-hiding transport controls and customizable keyboard shortcuts.

---

## 📁 Repository Layout

```
.
├── Cargo.toml                  # Cargo Workspace configuration
├── frontend/                   # React 18 + TypeScript + Vite control surface
│   ├── src/
│   │   ├── components/         # TitleBar, TransportBar, ContextMenu
│   │   ├── modals/             # TrackSelection, Equalizer, VideoAdjustments, Settings
│   │   ├── drawers/            # PlaylistDrawer, LibraryDrawer
│   │   ├── hooks/              # useShortcuts (hotkeys)
│   │   ├── stores/             # Zustand player store & Tauri event bridging
│   │   ├── styles/             # Vanilla CSS glassmorphic design system
│   │   └── types/              # Typed TypeScript models matching Rust layer
│   └── package.json
├── src-tauri/                  # Tauri v2 native host
│   ├── Cargo.toml
│   ├── tauri.conf.json         # Window transparency & capabilities
│   └── src/
│       ├── main.rs             # Application entry point
│       ├── lib.rs              # Tauri setup, HWND extraction & command registration
│       ├── commands/           # Typed async Tauri commands
│       ├── events.rs           # Typed event forwarder to frontend
│       └── state.rs            # Application state
├── crates/
│   ├── lumen-core/             # Shared data models, errors, settings, playlist parsers
│   ├── lumen-playback/         # MediaBackend trait, libmpv FFI wrapper, event loop
│   ├── lumen-library/          # SQLite media library, history, and resume tracking
│   └── lumen-platform/         # Platform helpers (HWND extraction, system paths)
├── packaging/                  # libmpv development libraries & distribution setup
├── docs/                       # Architecture & packaging documentation
└── README.md
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Rust** (MSVC 1.78+ recommended)
- **Node.js** (v18+) & `npm`
- `libmpv-2.dll` (already provided in `packaging/windows/libmpv` and root)

### 2. Running in Development
```bash
# Install frontend dependencies
npm --prefix frontend install

# Run Tauri development environment
npm --prefix frontend run dev
# in a separate terminal:
cargo run -p lumen-app
```

### 3. Running Unit and Pipeline Tests
```bash
cargo test --workspace
```

### 4. Production Build
```bash
npm --prefix frontend run build
cargo build --release -p lumen-app
```

---

## ⌨️ Default Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Space` or `K` | Play / Pause |
| `Right` or `L` | Seek forward 10s |
| `Left` or `J` | Seek backward 10s |
| `Up` / `Down` | Volume Up / Down (0–200%) |
| `M` | Mute / Unmute |
| `F` | Toggle Fullscreen |
| `Esc` | Exit Fullscreen / Close Modals |
| `Ctrl + O` | Open File(s) |
| `Ctrl + Shift + O` | Open Folder |
| `Ctrl + U` | Open Network Stream URL |
| `S` | Take Screenshot |
| `N` / `P` | Next / Previous item in queue |
| `Q` | Toggle Playlist Queue |
| `Ctrl + B` | Toggle Library & History Drawer |
