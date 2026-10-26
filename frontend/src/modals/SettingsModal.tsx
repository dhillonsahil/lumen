import React, { useState } from 'react';
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
  const { settings, saveSettings, setActiveModal, openExternalUrl } = usePlayerStore();

  const [currentTab, setCurrentTab] = useState<'general' | 'folders' | 'shortcuts' | 'sponsor'>('general');
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
        'Seek +10s': 'Right or L',
        'Seek -10s': 'Left or J',
        'Volume Up': 'Up',
        'Volume Down': 'Down',
        Mute: 'M',
        Fullscreen: 'F',
        'Exit Fullscreen': 'Esc',
        'Open File': 'Ctrl+O',
        'Open URL': 'Ctrl+U',
        'Open Folder': 'Ctrl+Shift+O',
        Screenshot: 'S',
        'Next Item': 'N',
        'Previous Item': 'P',
        'Next Chapter': 'Ctrl+Right',
        'Previous Chapter': 'Ctrl+Left',
        Playlist: 'Q',
        Library: 'Ctrl+B',
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

  const accents = [
    { name: 'Indigo', color: '#6366f1' },
    { name: 'Emerald', color: '#10b981' },
    { name: 'Rose', color: '#f43f5e' },
    { name: 'Sky', color: '#0ea5e9' },
    { name: 'Amber', color: '#f59e0b' },
    { name: 'Purple', color: '#a855f7' },
  ];

  const shortcutsList = [
    { action: 'Play / Pause', keys: 'Space or K' },
    { action: 'Seek +5s / -5s', keys: 'Right / Left or L / J' },
    { action: 'Volume Up / Down', keys: 'Up / Down (or Mouse Wheel)' },
    { action: 'Seek via Wheel', keys: 'Shift + Mouse Wheel' },
    { action: 'Toggle Mute', keys: 'M' },
    { action: 'Toggle Fullscreen', keys: 'F (or Double-Click Video)' },
    { action: 'Open File', keys: 'Ctrl + O' },
    { action: 'Open Folder', keys: 'Ctrl + Shift + O' },
    { action: 'Open Stream URL', keys: 'Ctrl + U' },
    { action: 'Take Screenshot', keys: 'S' },
    { action: 'Audio & Subtitle Tracks', keys: 'A or S' },
    { action: 'Engine Diagnostics', keys: 'I' },
    { action: 'Next / Prev Item', keys: 'N / P' },
    { action: 'Next / Prev Chapter', keys: 'Ctrl + Right / Left' },
    { action: 'Toggle Playlist Queue', keys: 'Q' },
    { action: 'Toggle Library Drawer', keys: 'Ctrl + B' },
  ];

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '580px',
        maxHeight: '84vh',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
      }}
      className="glass-panel"
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--glass-border-subtle)',
        }}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className={`glass-btn ${currentTab === 'general' ? 'glass-btn-primary' : ''}`}
            onClick={() => setCurrentTab('general')}
          >
            <Sliders size={14} />
            <span>Preferences</span>
          </button>

          <button
            className={`glass-btn ${currentTab === 'folders' ? 'glass-btn-primary' : ''}`}
            onClick={() => setCurrentTab('folders')}
          >
            <Folder size={14} />
            <span>Folders ({(form.watched_folders || []).length})</span>
          </button>

          <button
            className={`glass-btn ${currentTab === 'shortcuts' ? 'glass-btn-primary' : ''}`}
            onClick={() => setCurrentTab('shortcuts')}
          >
            <Keyboard size={14} />
            <span>Shortcuts</span>
          </button>

          <button
            className={`glass-btn ${currentTab === 'sponsor' ? 'glass-btn-primary' : ''}`}
            style={{
              borderColor: currentTab === 'sponsor' ? '#ec4899' : undefined,
              color: currentTab === 'sponsor' ? '#fff' : '#ec4899',
            }}
            onClick={() => setCurrentTab('sponsor')}
          >
            <Heart size={14} fill={currentTab === 'sponsor' ? '#fff' : 'rgba(236,72,153,0.3)'} />
            <span>Sponsor</span>
          </button>
        </div>

        <button
          className="glass-btn glass-btn-icon"
          style={{ width: '30px', height: '30px' }}
          onClick={() => setActiveModal(null)}
        >
          <X size={16} />
        </button>
      </div>

      {/* Body */}
      <div
        style={{
          padding: '20px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {currentTab === 'general' && (
          <>
            {/* Accent Color */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600 }}>Accent Color Theme</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {accents.map((acc) => (
                  <div
                    key={acc.color}
                    onClick={() => setForm({ ...form, accent_color: acc.color })}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: acc.color,
                      cursor: 'pointer',
                      border:
                        form.accent_color === acc.color
                          ? '3px solid #fff'
                          : '1px solid rgba(255,255,255,0.2)',
                      boxShadow:
                        form.accent_color === acc.color
                          ? `0 0 12px ${acc.color}`
                          : 'none',
                    }}
                    title={acc.name}
                  />
                ))}
              </div>
            </div>

            {/* Hardware Decoding */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600 }}>Hardware Decoding (mpv)</label>
              <select
                className="glass-input"
                value={form.hwdec}
                onChange={(e) => setForm({ ...form, hwdec: e.target.value })}
              >
                <option value="auto-safe" style={{ background: '#111420' }}>
                  auto-safe (Recommended: Direct3D11 GPU with fallback)
                </option>
                <option value="auto" style={{ background: '#111420' }}>
                  auto (Aggressive GPU decoding)
                </option>
                <option value="no" style={{ background: '#111420' }}>
                  no (Software CPU decoding only)
                </option>
              </select>
            </div>

            {/* Language Preferences */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>Preferred Audio Track (alang)</label>
                <input
                  type="text"
                  className="glass-input"
                  placeholder="eng, jpn, und"
                  value={form.preferred_audio_lang}
                  onChange={(e) => setForm({ ...form, preferred_audio_lang: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>Preferred Subtitle Track (slang)</label>
                <input
                  type="text"
                  className="glass-input"
                  placeholder="eng, spa, fra"
                  value={form.preferred_subtitle_lang}
                  onChange={(e) => setForm({ ...form, preferred_subtitle_lang: e.target.value })}
                />
              </div>
            </div>

            {/* Checkbox settings */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={form.resume_playback}
                  onChange={(e) => setForm({ ...form, resume_playback: e.target.checked })}
                  style={{ accentColor: 'var(--accent)' }}
                />
                <span>Automatically resume last playback position (SQLite persistence)</span>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={form.autoplay_next !== false}
                  onChange={(e) => setForm({ ...form, autoplay_next: e.target.checked })}
                  style={{ accentColor: 'var(--accent)' }}
                />
                <span>Auto-play next media in queue on completion</span>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={form.auto_load_subtitles}
                  onChange={(e) => setForm({ ...form, auto_load_subtitles: e.target.checked })}
                  style={{ accentColor: 'var(--accent)' }}
                />
                <span>Auto-load matching subtitle files from the video directory</span>
              </label>
            </div>
          </>
        )}

        {currentTab === 'folders' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>Watched Library Folders</span>
              <button
                className="glass-btn glass-btn-primary"
                style={{ fontSize: '12px', padding: '5px 12px', gap: '4px' }}
                onClick={handleAddWatchedFolder}
              >
                <FolderPlus size={14} />
                <span>Add Folder...</span>
              </button>
            </div>

            {(form.watched_folders || []).length === 0 ? (
              <div
                style={{
                  padding: '28px',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '13px',
                }}
              >
                No watched folders configured yet. Add folders to index your videos automatically.
              </div>
            ) : (
              (form.watched_folders || []).map((folder) => (
                <div
                  key={folder}
                  className="glass-card"
                  style={{
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span
                    style={{
                      fontSize: '13px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '440px',
                    }}
                  >
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
                  Lumen v2 is free and open source. Your support directly funds development and
                  performance enhancements.
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
