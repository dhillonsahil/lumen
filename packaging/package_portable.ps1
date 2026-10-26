$dist = "dist\Lumen-Media-Player-windows-portable"
New-Item -ItemType Directory -Force -Path $dist | Out-Null
Copy-Item -Force "target\release\lumen-app.exe" "$dist\Lumen-Media-Player.exe"
Copy-Item -Force "target\debug\libmpv-2.dll" "$dist\libmpv-2.dll"
Copy-Item -Force "src-tauri\icons\icon.ico" "$dist\icon.ico"

$readme = @"
Lumen Media Player v2.0.0 - Windows Portable Edition
===================================================
A high-performance, native desktop media player built with Rust, Tauri v2, and libmpv.

Features:
- Native libmpv video engine with Direct3D11 hardware acceleration
- 10-Band audio equalizer with presets
- Real-time video & color adjustments
- Subtitle styling and multi-audio track selection
- IPTV and network stream playback (HLS .m3u8, DASH, M3U channels)
- Mini-Player / PiP mode and A-B looping

Instructions:
Simply double-click Lumen-Media-Player.exe to run. No installation required.
"@
Set-Content -Path "$dist\README.txt" -Value $readme -Encoding utf8

Compress-Archive -Path "$dist\*" -DestinationPath "dist\Lumen-Media-Player-v2.0.0-windows-portable.zip" -Force
Get-Item "dist\Lumen-Media-Player-v2.0.0-windows-portable.zip" | Select-Object Name, Length
