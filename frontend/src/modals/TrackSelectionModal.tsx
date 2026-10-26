import React, { useState } from 'react';
import { X, AudioLines, Subtitles, Upload, Check, Plus, Minus, RotateCcw, AlertCircle } from 'lucide-react';
import { usePlayerStore } from '../stores/playerStore';
import { pickSubtitleFile } from '../utils/filePicker';

export const TrackSelectionModal: React.FC = () => {
  const {
    tracks,
    status,
    setAudioTrack,
    setSubtitleTrack,
    loadExternalSubtitle,
    setAudioDelay,
    setSubtitleDelay,
    setActiveModal,
  } = usePlayerStore();

  const [activeTab, setActiveTab] = useState<'audio' | 'subtitles'>('audio');
  const [audioDelayMs, setAudioDelayMs] = useState<number>(0);
  const [subDelayMs, setSubDelayMs] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const audioTracks = tracks.filter((t) => t.track_type === 'audio');
  const subTracks = tracks.filter((t) => t.track_type === 'subtitle');

  const handleAdjustAudioDelay = (deltaMs: number) => {
    const nextMs = audioDelayMs + deltaMs;
    setAudioDelayMs(nextMs);
    setAudioDelay(nextMs / 1000.0);
  };

  const handleSetAudioDelayMs = (ms: number) => {
    setAudioDelayMs(ms);
    setAudioDelay(ms / 1000.0);
  };

  const handleAdjustSubDelay = (deltaMs: number) => {
    const nextMs = subDelayMs + deltaMs;
    setSubDelayMs(nextMs);
    setSubtitleDelay(nextMs / 1000.0);
  };

  const handleSetSubDelayMs = (ms: number) => {
    setSubDelayMs(ms);
    setSubtitleDelay(ms / 1000.0);
  };

  const handleLoadExternalSub = async () => {
    setErrorMessage(null);
    try {
      const selected = await pickSubtitleFile();
      if (selected) {
        await loadExternalSubtitle(selected);
      }
    } catch (e: any) {
      console.error('Failed to load subtitle', e);
      setErrorMessage(typeof e === 'string' ? e : e?.message || 'Failed to load external subtitle file');
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '540px',
        maxHeight: '82vh',
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
            className={`glass-btn ${activeTab === 'audio' ? 'glass-btn-primary' : ''}`}
            onClick={() => setActiveTab('audio')}
          >
            <AudioLines size={15} />
            <span>Audio Tracks ({audioTracks.length})</span>
          </button>
          <button
            className={`glass-btn ${activeTab === 'subtitles' ? 'glass-btn-primary' : ''}`}
            onClick={() => setActiveTab('subtitles')}
          >
            <Subtitles size={15} />
            <span>Subtitles ({subTracks.length})</span>
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

      {/* Error alert if any */}
      {errorMessage && (
        <div
          style={{
            margin: '12px 20px 0 20px',
            padding: '8px 12px',
            borderRadius: '6px',
            background: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#fca5a5',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertCircle size={15} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Body */}
      <div
        style={{
          padding: '16px 20px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        {activeTab === 'audio' ? (
          <>
            {/* Audio Delay Precision Controls */}
            <div
              className="glass-card"
              style={{
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                <span>Audio Delay Sync</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="number"
                    step="50"
                    value={audioDelayMs}
                    onChange={(e) => handleSetAudioDelayMs(parseInt(e.target.value, 10) || 0)}
                    style={{
                      width: '74px',
                      padding: '2px 6px',
                      fontSize: '12px',
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '4px',
                      color: '#fff',
                      textAlign: 'right',
                    }}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>ms</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <button
                  className="glass-btn"
                  style={{ padding: '4px 8px', fontSize: '11px', gap: '2px' }}
                  onClick={() => handleAdjustAudioDelay(-100)}
                  title="Delay audio by -100ms"
                >
                  <Minus size={12} />
                  <span>100ms</span>
                </button>

                <button
                  className="glass-btn"
                  style={{ padding: '4px 8px', fontSize: '11px', gap: '2px' }}
                  onClick={() => handleAdjustAudioDelay(100)}
                  title="Advance audio by +100ms"
                >
                  <Plus size={12} />
                  <span>100ms</span>
                </button>

                <button
                  className="glass-btn"
                  style={{ padding: '4px 8px', fontSize: '11px', marginLeft: 'auto' }}
                  onClick={() => handleSetAudioDelayMs(0)}
                  title="Reset to 0ms"
                >
                  <RotateCcw size={12} />
                </button>
              </div>
            </div>

            {/* Audio Track List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div
                className="glass-card"
                style={{
                  padding: '12px 14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderColor:
                    status.current_audio_track === null
                      ? 'var(--accent)'
                      : 'var(--glass-border-subtle)',
                }}
                onClick={() => setAudioTrack(null)}
              >
                <span style={{ fontSize: '13px', fontWeight: 500 }}>None (Muted Audio Track)</span>
                {status.current_audio_track === null && (
                  <Check size={16} style={{ color: 'var(--accent)' }} />
                )}
              </div>

              {audioTracks.map((t) => {
                const isSelected =
                  status.current_audio_track === t.id ||
                  t.selected === true ||
                  t.is_selected === true;
                const lang = t.language || t.lang;
                return (
                  <div
                    key={t.id}
                    className="glass-card"
                    style={{
                      padding: '12px 14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderColor: isSelected
                        ? 'var(--accent)'
                        : 'var(--glass-border-subtle)',
                      background: isSelected ? 'rgba(99, 102, 241, 0.15)' : undefined,
                    }}
                    onClick={() => setAudioTrack(t.id)}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: isSelected ? '#fff' : 'var(--text-primary)',
                        }}
                      >
                        {t.title || `Audio Track #${t.id}`}
                        {lang && (
                          <span
                            style={{
                              marginLeft: '8px',
                              fontSize: '11px',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              background: 'rgba(255, 255, 255, 0.1)',
                              textTransform: 'uppercase',
                            }}
                          >
                            {lang}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {t.codec && <span>Codec: <b>{t.codec.toUpperCase()}</b></span>}
                        {t.audio_channels && <span> • {t.audio_channels}ch</span>}
                        {t.audio_samplerate && <span> • {t.audio_samplerate}Hz</span>}
                        {(t.default_track || t.is_default) && <span> • Default</span>}
                        {(t.forced_track || t.is_forced) && <span> • Forced</span>}
                      </div>
                    </div>

                    {isSelected && <Check size={18} style={{ color: 'var(--accent)' }} />}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <>
            {/* Subtitle Delay Precision Controls */}
            <div
              className="glass-card"
              style={{
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                <span>Subtitle Delay Sync</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="number"
                    step="50"
                    value={subDelayMs}
                    onChange={(e) => handleSetSubDelayMs(parseInt(e.target.value, 10) || 0)}
                    style={{
                      width: '74px',
                      padding: '2px 6px',
                      fontSize: '12px',
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '4px',
                      color: '#fff',
                      textAlign: 'right',
                    }}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>ms</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <button
                  className="glass-btn"
                  style={{ padding: '4px 8px', fontSize: '11px', gap: '2px' }}
                  onClick={() => handleAdjustSubDelay(-100)}
                  title="Delay subtitle by -100ms"
                >
                  <Minus size={12} />
                  <span>100ms</span>
                </button>

                <button
                  className="glass-btn"
                  style={{ padding: '4px 8px', fontSize: '11px', gap: '2px' }}
                  onClick={() => handleAdjustSubDelay(100)}
                  title="Advance subtitle by +100ms"
                >
                  <Plus size={12} />
                  <span>100ms</span>
                </button>

                <button
                  className="glass-btn"
                  style={{ padding: '4px 8px', fontSize: '11px', marginLeft: 'auto' }}
                  onClick={() => handleSetSubDelayMs(0)}
                  title="Reset to 0ms"
                >
                  <RotateCcw size={12} />
                </button>
              </div>
            </div>

            <button
              className="glass-btn"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={handleLoadExternalSub}
            >
              <Upload size={14} />
              <span>Load External Subtitle File (.srt, .ass, .vtt)...</span>
            </button>

            {/* Subtitle Track List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div
                className="glass-card"
                style={{
                  padding: '12px 14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderColor:
                    status.current_sub_track === null
                      ? 'var(--accent)'
                      : 'var(--glass-border-subtle)',
                }}
                onClick={() => setSubtitleTrack(null)}
              >
                <span style={{ fontSize: '13px', fontWeight: 500 }}>Disabled (No Subtitles)</span>
                {status.current_sub_track === null && (
                  <Check size={16} style={{ color: 'var(--accent)' }} />
                )}
              </div>

              {subTracks.map((t) => {
                const isSelected =
                  status.current_sub_track === t.id ||
                  t.selected === true ||
                  t.is_selected === true;
                const lang = t.language || t.lang;
                const isExt = t.external === true || t.is_external === true;
                return (
                  <div
                    key={t.id}
                    className="glass-card"
                    style={{
                      padding: '12px 14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderColor: isSelected
                        ? 'var(--accent)'
                        : 'var(--glass-border-subtle)',
                      background: isSelected ? 'rgba(99, 102, 241, 0.15)' : undefined,
                    }}
                    onClick={() => setSubtitleTrack(t.id)}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: isSelected ? '#fff' : 'var(--text-primary)',
                        }}
                      >
                        {t.title || `Subtitle Track #${t.id}`}
                        {lang && (
                          <span
                            style={{
                              marginLeft: '8px',
                              fontSize: '11px',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              background: 'rgba(255, 255, 255, 0.1)',
                              textTransform: 'uppercase',
                            }}
                          >
                            {lang}
                          </span>
                        )}
                        {isExt && (
                          <span
                            style={{
                              marginLeft: '6px',
                              fontSize: '10px',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              background: 'rgba(168, 85, 247, 0.25)',
                              color: '#d8b4fe',
                            }}
                          >
                            EXTERNAL
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {t.codec && <span>Format: <b>{t.codec.toUpperCase()}</b></span>}
                        {t.external_filename && <span> • {t.external_filename}</span>}
                        {(t.default_track || t.is_default) && <span> • Default</span>}
                        {(t.forced_track || t.is_forced) && <span> • Forced</span>}
                      </div>
                    </div>

                    {isSelected && <Check size={18} style={{ color: 'var(--accent)' }} />}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
