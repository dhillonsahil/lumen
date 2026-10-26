import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Sliders,
  Keyboard,
  FolderPlus,
  Trash2,
  Folder,
  Heart,
  Coffee,
  ExternalLink,
  Activity,
  SlidersHorizontal,
  Cpu,
  Power,
  RotateCcw,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';
import { usePlayerStore } from '../stores/playerStore';
import { AppSettings } from '../types';
import { pickFolder } from '../utils/filePicker';

const GithubIcon: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

export const SettingsModal: React.FC = () => {
  const {
    settings,
    saveSettings,
    setActiveModal,
    openExternalUrl,
    settingsTab,
    setSettingsTab,
    equalizer,
    setEqualizer,
    videoAdjustments,
    setVideoAdjustments,
    diagnostics,
    fetchDiagnostics,
  } = usePlayerStore();

  const currentTab = settingsTab;
  const setCurrentTab = setSettingsTab;

  useEffect(() => {
    if (currentTab === 'diagnostics') {
      fetchDiagnostics();
      const interval = setInterval(fetchDiagnostics, 1500);
      return () => clearInterval(interval);
    }
  }, [currentTab, fetchDiagnostics]);

  const [form, setForm] = useState<AppSettings>(
    settings || {
      theme: 'dark',
      accent_color: '#6366f1',
      preferred_audio_lang: 'eng',
      preferred_subtitle_lang: 'eng',
      hwdec: 'auto-safe',
      resume_playback: true,
      autoplay_next: true,
      watched_folders: [],
      seek_step_short: 10,
      seek_step_long: 60,
      volume_step: 5,
      audio_delay: 0,
      subtitle_delay: 0,
      channel_mode: 'stereo',
      auto_load_subtitles: true,
      subtitle_style: {
        font: 'sans-serif',
        font_size: 48,
        color: '#FFFFFF',
        border_color: '#000000',
        border_size: 2.5,
        shadow_offset: 1.0,
        background_color: '#00000000',
        pos_y_percent: 92,
      },
      shortcuts: {
        'Play/Pause': 'Space or K',
        'Seek +5s / -5s': 'Right / Left',
        'Volume Up / Down': 'Up / Down (Wheel)',
        Mute: 'M',
        Fullscreen: 'F',
        'Mini-Player (PiP)': 'P or Shift+P',
        'Cycle Aspect Ratio': 'A',
        'A-B Loop': 'L',
        'Open File': 'Ctrl+O',
        'Open URL': 'Ctrl+U',
        'Open Folder': 'Ctrl+Shift+O',
        Screenshot: 'S',
        Playlist: 'Q',
        Library: 'Ctrl+B',
        Diagnostics: 'I',
      },
    }
  );

  const handleSave = async () => {
    await saveSettings(form);
    setActiveModal(null);
  };

  const handleAddWatchedFolder = async () => {
    try {
      const folder = await pickFolder();
      if (folder && !(form.watched_folders || []).includes(folder)) {
        setForm({
          ...form,
          watched_folders: [...(form.watched_folders || []), folder],
        });
      }
    } catch (e) {
      console.error('Failed to pick folder', e);
    }
  };

  const handleRemoveWatchedFolder = (folderToRemove: string) => {
    setForm({
      ...form,
      watched_folders: (form.watched_folders || []).filter((f) => f !== folderToRemove),
    });
  };

  // Equalizer presets & bands
  const bandLabels = ['31Hz', '62Hz', '125Hz', '250Hz', '500Hz', '1kHz', '2kHz', '4kHz', '8kHz', '16kHz'];
  const eqPresets: Record<string, [number, number, number, number, number, number, number, number, number, number]> = {
    Flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    'Bass Boost': [6.0, 5.0, 4.0, 2.0, 0, 0, 0, 0, 0, 0],
    'Vocal Boost': [-2.0, -1.0, 0, 2.0, 4.5, 4.5, 3.0, 1.0, 0, -1.0],
    Rock: [4.5, 3.0, 1.5, 0, -1.0, -0.5, 1.5, 3.0, 4.0, 4.5],
    Pop: [-1.0, 1.0, 3.0, 4.0, 3.5, 1.5, 0, -1.0, 1.5, 2.0],
    Jazz: [3.0, 2.0, 0, 1.5, -1.5, -1.5, 0, 1.5, 3.0, 3.5],
    Classical: [4.0, 3.0, 2.5, 2.0, -1.0, -1.0, 0, 2.0, 3.0, 3.5],
  };

  const handleEqBandChange = (index: number, val: number) => {
    const newBands = [...equalizer.bands] as [number, number, number, number, number, number, number, number, number, number];
    newBands[index] = val;
    setEqualizer({ bands: newBands, preset: 'Custom' });
  };

  const handleResetVideo = () => {
    setVideoAdjustments({
      brightness: 0,
      contrast: 0,
      saturation: 0,
      hue: 0,
      gamma: 0,
      rotation: 0,
      flip_h: false,
      flip_v: false,
      aspect_ratio: 'auto',
      zoom: 1.0,
      pan_x: 0,
      pan_y: 0,
      deinterlace: false,
    });
  };

  const aspectRatios = ['auto', '16:9', '4:3', '21:9', '1:1'];

  const shortcutsList = [
    { action: 'Play / Pause', keys: 'Space or K' },
    { action: 'Seek +5s / -5s', keys: 'Right / Left' },
    { action: 'Seek +60s / -60s', keys: 'Shift + Right / Left' },
    { action: 'Volume Up / Down (up to 200%)', keys: 'Up / Down (or Mouse Wheel)' },
    { action: 'Frame Scrub', keys: 'Shift + Mouse Wheel' },
    { action: 'Cycle Aspect Ratio', keys: 'A' },
    { action: 'A-B Loop (Set A -> Set B -> Clear)', keys: 'L' },
    { action: 'Mini-Player (PiP mode)', keys: 'P or Shift+P' },
    { action: 'Toggle Fullscreen', keys: 'F' },
    { action: 'Mute / Unmute', keys: 'M' },
    { action: 'Audio & Subtitle Tracks', keys: 'S or S' },
    { action: 'Take Screenshot', keys: 'S' },
    { action: 'Open File(s)', keys: 'Ctrl + O' },
    { action: 'Open Folder', keys: 'Ctrl + Shift + O' },
    { action: 'Open Network Stream URL', keys: 'Ctrl + U' },
    { action: 'Playlist Queue', keys: 'Q' },
    { action: 'Media Library & History', keys: 'Ctrl + B' },
    { action: 'Engine Diagnostics', keys: 'I' },
    { action: 'Exit Fullscreen / Close Modal', keys: 'Esc' },
  ];

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '680px',
        maxWidth: '94vw',
        maxHeight: '88vh',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 70px rgba(0, 0, 0, 0.85)',
      }}
      className="glass-panel"
    >
      {/* Header Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 18px',
          borderBottom: '1px solid var(--glass-border-subtle)',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button
            className={`glass-btn ${currentTab === 'general' ? 'glass-btn-primary' : ''}`}
            style={{ padding: '6px 10px', fontSize: '11px', gap: '5px' }}
            onClick={() => setCurrentTab('general')}
          >
            <Sliders size={13} />
            <span>General</span>
          </button>

          <button
            className={`glass-btn ${currentTab === 'video' ? 'glass-btn-primary' : ''}`}
            style={{ padding: '6px 10px', fontSize: '11px', gap: '5px' }}
            onClick={() => setCurrentTab('video')}
          >
            <SlidersHorizontal size={13} />
            <span>Video & Color</span>
          </button>

          <button
            className={`glass-btn ${currentTab === 'equalizer' ? 'glass-btn-primary' : ''}`}
            style={{ padding: '6px 10px', fontSize: '11px', gap: '5px' }}
            onClick={() => setCurrentTab('equalizer')}
          >
            <Activity size={13} />
            <span>Equalizer</span>
          </button>

          <button
            className={`glass-btn ${currentTab === 'diagnostics' ? 'glass-btn-primary' : ''}`}
            style={{ padding: '6px 10px', fontSize: '11px', gap: '5px' }}
            onClick={() => setCurrentTab('diagnostics')}
          >
            <Cpu size={13} />
            <span>Diagnostics</span>
          </button>

          <button
            className={`glass-btn ${currentTab === 'folders' ? 'glass-btn-primary' : ''}`}
            style={{ padding: '6px 10px', fontSize: '11px', gap: '5px' }}
            onClick={() => setCurrentTab('folders')}
          >
            <Folder size={13} />
            <span>Folders ({(form.watched_folders || []).length})</span>
          </button>

          <button
            className={`glass-btn ${currentTab === 'shortcuts' ? 'glass-btn-primary' : ''}`}
            style={{ padding: '6px 10px', fontSize: '11px', gap: '5px' }}
            onClick={() => setCurrentTab('shortcuts')}
          >
            <Keyboard size={13} />
            <span>Shortcuts</span>
          </button>

          <button
            className={`glass-btn ${currentTab === 'sponsor' ? 'glass-btn-primary' : ''}`}
            style={{
              padding: '6px 10px',
              fontSize: '11px',
              gap: '5px',
              borderColor: currentTab === 'sponsor' ? '#ec4899' : undefined,
              color: currentTab === 'sponsor' ? '#fff' : '#ec4899',
            }}
            onClick={() => setCurrentTab('sponsor')}
          >
            <Heart size={13} fill={currentTab === 'sponsor' ? '#fff' : 'rgba(236,72,153,0.3)'} />
            <span>Sponsor</span>
          </button>
        </div>

        <button
          className="glass-btn glass-btn-icon"
          style={{ width: '28px', height: '28px' }}
          onClick={() => setActiveModal(null)}
          title="Close"
        >
          <X size={15} />
        </button>
      </div>

      {/* Body Content */}
      <div
        style={{
          padding: '20px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {/* Tab 1: General Preferences */}
        {currentTab === 'general' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>Audio Language</label>
                <input
                  type="text"
                  className="glass-input"
                  value={form.preferred_audio_lang}
                  onChange={(e) => setForm({ ...form, preferred_audio_lang: e.target.value })}
                  placeholder="eng, jpn, fra"
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>Subtitle Language</label>
                <input
                  type="text"
                  className="glass-input"
                  value={form.preferred_subtitle_lang}
                  onChange={(e) => setForm({ ...form, preferred_subtitle_lang: e.target.value })}
                  placeholder="eng, spa, ger"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>Hardware Decoding</label>
                <select
                  className="glass-input"
                  value={form.hwdec}
                  onChange={(e) => setForm({ ...form, hwdec: e.target.value })}
                >
                  <option value="auto-safe">auto-safe (Recommended)</option>
                  <option value="auto">auto (Aggressive)</option>
                  <option value="d3d11va">d3d11va (Windows Direct3D11)</option>
                  <option value="nvdec">nvdec (NVIDIA CUDA)</option>
                  <option value="no">no (Software CPU)</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>Audio Channel Layout</label>
                <select
                  className="glass-input"
                  value={form.channel_mode}
                  onChange={(e) => setForm({ ...form, channel_mode: e.target.value })}
                >
                  <option value="stereo">Stereo (Downmix)</option>
                  <option value="5.1">5.1 Surround</option>
                  <option value="7.1">7.1 Surround</option>
                  <option value="auto">Auto Passthrough</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                <input
                  type="checkbox"
                  checked={form.resume_playback}
                  onChange={(e) => setForm({ ...form, resume_playback: e.target.checked })}
                />
                <span>Automatically resume playback position from history</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                <input
                  type="checkbox"
                  checked={form.autoplay_next}
                  onChange={(e) => setForm({ ...form, autoplay_next: e.target.checked })}
                />
                <span>Auto-play next track in playlist queue</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                <input
                  type="checkbox"
                  checked={form.auto_load_subtitles}
                  onChange={(e) => setForm({ ...form, auto_load_subtitles: e.target.checked })}
                />
                <span>Auto-load external subtitles with matching file name</span>
              </label>
            </div>
          </div>
        )}

        {/* Tab 2: Video & Color Controls */}
        {currentTab === 'video' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 700 }}>Color & Video Tuning</span>
              <button
                className="glass-btn"
                style={{ padding: '4px 10px', fontSize: '11px', gap: '4px' }}
                onClick={handleResetVideo}
              >
                <RotateCcw size={12} />
                <span>Reset All</span>
              </button>
            </div>

            {/* Aspect Ratio */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Aspect Ratio Override (Shortcut: A)
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                {aspectRatios.map((r) => (
                  <button
                    key={r}
                    className={`glass-btn ${videoAdjustments.aspect_ratio === r ? 'glass-btn-primary' : ''}`}
                    style={{ flex: 1, padding: '6px', fontSize: '12px' }}
                    onClick={() => setVideoAdjustments({ aspect_ratio: r })}
                  >
                    {r.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Sliders */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {[
                { label: 'Brightness', key: 'brightness', min: -100, max: 100 },
                { label: 'Contrast', key: 'contrast', min: -100, max: 100 },
                { label: 'Saturation', key: 'saturation', min: -100, max: 100 },
                { label: 'Hue', key: 'hue', min: -100, max: 100 },
                { label: 'Gamma', key: 'gamma', min: -100, max: 100 },
              ].map(({ label, key, min, max }) => (
                <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span>{label}</span>
                    <span style={{ color: 'var(--accent-light)', fontWeight: 600 }}>
                      {(videoAdjustments as any)[key]}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    value={(videoAdjustments as any)[key]}
                    onChange={(e) => setVideoAdjustments({ [key]: Number(e.target.value) })}
                    className="slider"
                  />
                </div>
              ))}
            </div>

            {/* Rotation & Flip */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                className="glass-btn"
                style={{ flex: 1, padding: '8px', fontSize: '12px', gap: '6px' }}
                onClick={() =>
                  setVideoAdjustments({
                    rotation: ((videoAdjustments.rotation + 90) % 360) as 0 | 90 | 180 | 270,
                  })
                }
              >
                <RotateCw size={14} />
                <span>Rotate 90° ({videoAdjustments.rotation}°)</span>
              </button>

              <button
                className={`glass-btn ${videoAdjustments.flip_h ? 'glass-btn-primary' : ''}`}
                style={{ flex: 1, padding: '8px', fontSize: '12px', gap: '6px' }}
                onClick={() => setVideoAdjustments({ flip_h: !videoAdjustments.flip_h })}
              >
                <FlipHorizontal size={14} />
                <span>Flip H</span>
              </button>

              <button
                className={`glass-btn ${videoAdjustments.flip_v ? 'glass-btn-primary' : ''}`}
                style={{ flex: 1, padding: '8px', fontSize: '12px', gap: '6px' }}
                onClick={() => setVideoAdjustments({ flip_v: !videoAdjustments.flip_v })}
              >
                <FlipVertical size={14} />
                <span>Flip V</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Equalizer */}
        {currentTab === 'equalizer' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700 }}>10-Band Equalizer</span>
                <button
                  className={`glass-btn ${equalizer.enabled ? 'glass-btn-primary' : ''}`}
                  style={{ padding: '3px 10px', fontSize: '11px', gap: '4px' }}
                  onClick={() => setEqualizer({ enabled: !equalizer.enabled })}
                >
                  <Power size={12} />
                  <span>{equalizer.enabled ? 'ON' : 'BYPASS'}</span>
                </button>
              </div>

              <button
                className="glass-btn"
                style={{ padding: '4px 10px', fontSize: '11px', gap: '4px' }}
                onClick={() =>
                  setEqualizer({
                    preset: 'Flat',
                    bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                  })
                }
              >
                <RotateCcw size={12} />
                <span>Reset</span>
              </button>
            </div>

            {/* Presets */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {Object.keys(eqPresets).map((p) => (
                <button
                  key={p}
                  className={`glass-btn ${equalizer.preset === p ? 'glass-btn-primary' : ''}`}
                  style={{ padding: '4px 10px', fontSize: '11px' }}
                  onClick={() => setEqualizer({ preset: p, bands: [...eqPresets[p]] })}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* 10 Band Vertical Sliders */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '16px 8px',
                background: 'rgba(0, 0, 0, 0.25)',
                borderRadius: '8px',
              }}
            >
              {bandLabels.map((lbl, idx) => (
                <div
                  key={lbl}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    height: '140px',
                  }}
                >
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    {equalizer.bands[idx] > 0 ? `+${equalizer.bands[idx]}` : equalizer.bands[idx]}
                  </span>
                  <input
                    type="range"
                    min={-12}
                    max={12}
                    step={0.5}
                    value={equalizer.bands[idx]}
                    onChange={(e) => handleEqBandChange(idx, Number(e.target.value))}
                    style={{
                      writingMode: 'vertical-lr',
                      direction: 'rtl',
                      width: '6px',
                      flex: 1,
                      accentColor: 'var(--accent)',
                    }}
                  />
                  <span style={{ fontSize: '10px', fontWeight: 600 }}>{lbl}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Diagnostics */}
        {currentTab === 'diagnostics' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div
              className="glass-card"
              style={{
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderColor: 'rgba(16, 185, 129, 0.4)',
                background: 'rgba(16, 185, 129, 0.1)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle size={18} style={{ color: '#10b981' }} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#10b981' }}>
                    libmpv-2.dll Loaded & Operational
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {diagnostics?.mpv_version || 'Loading engine version...'}
                  </div>
                </div>
              </div>

              <button
                className="glass-btn glass-btn-icon"
                style={{ width: '28px', height: '28px' }}
                onClick={() => fetchDiagnostics()}
                title="Refresh"
              >
                <RefreshCw size={13} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="glass-card" style={{ padding: '10px 14px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Video Output (VO)</span>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>{diagnostics?.active_vo || 'gpu-next'}</div>
              </div>
              <div className="glass-card" style={{ padding: '10px 14px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>GPU Context</span>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>{diagnostics?.active_gpu_context || 'd3d11'}</div>
              </div>
              <div className="glass-card" style={{ padding: '10px 14px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Hardware Decoding (HWDEC)</span>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>
                  {diagnostics?.hwdec_current && diagnostics.hwdec_current !== 'no'
                    ? `GPU Accelerated (${diagnostics.hwdec_current})`
                    : 'Software (CPU)'}
                </div>
              </div>
              <div className="glass-card" style={{ padding: '10px 14px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Active Media</span>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={diagnostics?.current_file || 'None'}
                >
                  {diagnostics?.current_file ? diagnostics.current_file.split(/[/\\]/).pop() : 'No media loaded'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Watched Folders */}
        {currentTab === 'folders' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                Watched folders are automatically indexed into the local SQLite media library:
              </p>
              <button
                className="glass-btn glass-btn-primary"
                style={{ padding: '6px 12px', fontSize: '12px', gap: '6px' }}
                onClick={handleAddWatchedFolder}
              >
                <FolderPlus size={14} />
                <span>Add Folder</span>
              </button>
            </div>

            {(form.watched_folders || []).length === 0 ? (
              <div
                style={{
                  padding: '24px',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '13px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '8px',
                }}
              >
                No watched folders configured yet.
              </div>
            ) : (
              (form.watched_folders || []).map((folder) => (
                <div
                  key={folder}
                  className="glass-card"
                  style={{
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '440px' }}>
                    {folder}
                  </span>
                  <button
                    className="glass-btn glass-btn-icon"
                    style={{ width: '26px', height: '26px' }}
                    onClick={() => handleRemoveWatchedFolder(folder)}
                    title="Remove folder"
                  >
                    <Trash2 size={13} style={{ color: '#f87171' }} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 6: Shortcuts */}
        {currentTab === 'shortcuts' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {shortcutsList.map((sc) => (
              <div
                key={sc.action}
                className="glass-card"
                style={{
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                }}
              >
                <span style={{ fontWeight: 500 }}>{sc.action}</span>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    fontWeight: 600,
                    color: 'var(--accent-light)',
                  }}
                >
                  {sc.keys}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Tab 7: Sponsor */}
        {currentTab === 'sponsor' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div
              style={{
                padding: '16px',
                borderRadius: '10px',
                background: 'rgba(236, 72, 153, 0.08)',
                border: '1px solid rgba(236, 72, 153, 0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <Heart size={28} color="#ec4899" fill="#ec4899" />
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>
                  Support Lumen Development
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  Lumen v2 is 100% free and open-source software built with Rust and libmpv.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div
                className="glass-card"
                style={{
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Coffee size={16} color="#ffdd00" />
                  <span style={{ fontWeight: 600 }}>Buy Me a Coffee</span>
                </div>
                <button
                  className="glass-btn glass-btn-primary"
                  style={{ padding: '4px 10px', fontSize: '11px', gap: '4px' }}
                  onClick={() => openExternalUrl('https://buymeacoffee.com/isahildhillon')}
                >
                  <span>Support</span>
                  <ExternalLink size={11} />
                </button>
              </div>

              <div
                className="glass-card"
                style={{
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Heart size={16} color="#ec4899" />
                  <span style={{ fontWeight: 600 }}>GitHub Sponsors</span>
                </div>
                <button
                  className="glass-btn glass-btn-primary"
                  style={{
                    padding: '4px 10px',
                    fontSize: '11px',
                    gap: '4px',
                    background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
                  }}
                  onClick={() => openExternalUrl('https://github.com/sponsors/dhillonsahil')}
                >
                  <span>Sponsor</span>
                  <ExternalLink size={11} />
                </button>
              </div>

              <div
                className="glass-card"
                style={{
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <GithubIcon size={16} color="#fff" />
                  <span style={{ fontWeight: 600 }}>Star on GitHub</span>
                </div>
                <button
                  className="glass-btn"
                  style={{ padding: '4px 10px', fontSize: '11px', gap: '4px' }}
                  onClick={() => openExternalUrl('https://github.com/dhillonsahil/lumen')}
                >
                  <span>Repository</span>
                  <ExternalLink size={11} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          padding: '14px 20px',
          borderTop: '1px solid var(--glass-border-subtle)',
          gap: '8px',
        }}
      >
        <button className="glass-btn" onClick={() => setActiveModal(null)}>
          Cancel
        </button>
        <button
          className="glass-btn glass-btn-primary"
          onClick={handleSave}
          style={{ gap: '6px' }}
        >
          <Save size={14} />
          <span>Save Settings</span>
        </button>
      </div>
    </div>
  );
};
