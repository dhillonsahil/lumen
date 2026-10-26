# Lumen v2 Packaging & Distribution Guide

## Windows Build
Lumen v2 integrates directly with `libmpv-2.dll`.

### Prerequisites
- Rust MSVC Toolchain (`rustc`, `cargo`)
- Node.js LTS + npm
- `libmpv-2.dll` (located in `packaging/windows/libmpv` or project root)

### Portable Build
1. Build frontend:
   ```bash
   npm --prefix frontend run build
   ```
2. Build Tauri release binary:
   ```bash
   cargo build --release -p lumen-app
   ```
3. Copy `libmpv-2.dll` to target directory:
   ```powershell
   Copy-Item "packaging/windows/libmpv/libmpv-2.dll" -Destination "target/release/libmpv-2.dll"
   ```
4. Distribute `target/release/lumen-app.exe` along with `libmpv-2.dll` as a self-contained portable archive.

### Tauri Installer Build (NSIS / MSI)
Run:
```bash
cargo tauri build
```
The NSIS and MSI installers will be created in `src-tauri/target/release/bundle/nsis/` and `msi/`.

## Linux Build (Ubuntu 22.04 / Debian 12)
### Dependencies:
```bash
sudo apt update
sudo apt install -y libmpv-dev libwebkit2gtk-4.1-dev build-essential curl wget libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
```
### Build:
```bash
npm --prefix frontend run build
cargo tauri build --bundles deb,appimage
```
This produces `.deb` and `.AppImage` packages configured with MPRIS D-Bus media controls and `.desktop` entry.
