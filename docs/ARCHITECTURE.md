# Lumen v2 Architecture Documentation

## Overview
Lumen v2 is a modern, high-performance desktop media player built with:
- **Tauri v2** + **Rust** (MSVC, latest stable)
- **libmpv** dynamic C engine (`libmpv-2.dll`) as the sole media pipeline and decoding engine
- **React 18** + **TypeScript** + **Vite** with **Vanilla CSS Glassmorphism** (Zero Tailwind)
- **SQLite** for playback resume positions, history, and library indexing
- **Tokio** for asynchronous runtime orchestration

## Strict Pipeline Separation
```
+--------------------------------------------------------------+
|             React 18 UI Control Surface (Transparent)        |
|             (Glassmorphic TitleBar, TransportBar, Drawers)    |
+--------------------------------------------------------------+
                              |
                     Tauri Commands / Events
                              v
+--------------------------------------------------------------+
|                 Lumen Application Layer (Rust)               |
|                   (Commands, State, Library)                 |
+--------------------------------------------------------------+
                              |
                      MediaBackend Trait
                              v
+--------------------------------------------------------------+
|                     libmpv Backend (Rust FFI)                |
|                    (MpvBackend, MpvEventLoop)                |
+--------------------------------------------------------------+
                              |
                    Hardware Decoding & Render
                              v
+--------------------------------------------------------------+
|               Direct3D11 / HWND Surface (Windows)            |
|               (Video, Multi-track Audio, Embedded ASS/SRT)   |
+--------------------------------------------------------------+
```

## Window Embedding Architecture (Windows HWND)
1. The top-level Win32 window is owned by Tauri (`tauri::WebviewWindow`).
2. The Tauri configuration specifies `"transparent": true` and root CSS sets `background: transparent`.
3. In `lumen-playback`, `wid` is set to the Win32 window's native HWND:
   ```rust
   mpv.set_option_string("wid", &window_id.to_string())?;
   mpv.set_option_string("vo", "gpu-next")?;
   mpv.set_option_string("gpu-context", "d3d11")?;
   ```
4. Direct3D11 renders hardware-accelerated video directly into the native HWND client area.
5. React floating controls sit on top with glassmorphic backdrop filters (`backdrop-filter: blur(...)`) and auto-hide on inactivity.

## Track Selection & Subtitle Engine
- Audio tracks are enumerated via mpv's `track-list` property.
- Track selection is executed instantaneously via:
  ```rust
  player.set_property("aid", track_id)?; // Or "no" to mute
  player.set_property("sid", track_id)?; // Or "no" to disable subtitles
  ```
- Full support for embedded Matroska SRT, ASS/SSA styled subtitles, and external subtitle loading via `sub-add`.
- 10-band audio equalizer applied through mpv's lavfi equalizer filters.
