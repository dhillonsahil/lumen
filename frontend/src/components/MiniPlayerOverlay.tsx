import React, { useState, useRef } from 'react';
import {
  Play,
  Pause,
  Maximize2,
  X,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { usePlayerStore } from '../stores/playerStore';

export const MiniPlayerOverlay: React.FC = () => {
  const {
    status,
    togglePlay,
    toggleMiniPlayer,
    stopMedia,
    seek,
    setMuted,
  } = usePlayerStore();

  const [isHovered, setIsHovered] = useState(false);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const progressPct =
    status.duration > 0
      ? Math.min(100, (status.position / status.duration) * 100)
      : 0;

  const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!progressBarRef.current || status.duration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seek(ratio * status.duration);
  };

  const isPaused = status.state === 'paused';
  const showControls = isHovered || isPaused;

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        pointerEvents: showControls ? 'auto' : 'none',
        background: showControls
          ? 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 40%, rgba(0,0,0,0.85) 100%)'
          : 'transparent',
        transition: 'background 0.2s ease',
      }}
    >
      {/* Top Header: Title & Window Controls */}
      <div
        data-tauri-drag-region
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          opacity: showControls ? 1 : 0,
          transition: 'opacity 0.2s ease',
          cursor: 'move',
        }}
      >
        {/* Title */}
        <div
          data-tauri-drag-region
          style={{
            fontSize: '11px',
            fontWeight: 600,
            color: '#fff',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '340px',
            textShadow: '0 1px 3px rgba(0,0,0,0.8)',
          }}
          title={status.title || ''}
        >
          {status.title || 'Lumen Mini Player'}
        </div>

        {/* Right buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            className="glass-btn glass-btn-icon"
            style={{ width: '26px', height: '26px', padding: 0 }}
            onClick={(e) => {
              e.stopPropagation();
              toggleMiniPlayer();
            }}
            title="Restore Window (Exit Mini-Player)"
          >
            <Maximize2 size={13} />
          </button>

          <button
            className="glass-btn glass-btn-icon"
            style={{ width: '26px', height: '26px', padding: 0, color: '#f87171' }}
            onClick={(e) => {
              e.stopPropagation();
              stopMedia();
            }}
            title="Close Media"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Center: Play/Pause Big Button */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: showControls ? 1 : 0,
          transition: 'opacity 0.2s ease',
        }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
          }}
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            background: 'rgba(15, 18, 28, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
            cursor: 'pointer',
            transition: 'transform 0.15s ease, background 0.15s ease',
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {status.state === 'playing' ? (
            <Pause size={20} fill="#fff" />
          ) : (
            <Play size={20} fill="#fff" style={{ marginLeft: '3px' }} />
          )}
        </button>
      </div>

      {/* Bottom: Progress Bar, Time, & Volume */}
      <div
        style={{
          padding: '6px 12px 10px 12px',
          opacity: showControls ? 1 : 0,
          transition: 'opacity 0.2s ease',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        {/* Scrub Bar */}
        <div
          ref={progressBarRef}
          onClick={handleSeekClick}
          style={{
            width: '100%',
            height: '5px',
            background: 'rgba(255, 255, 255, 0.25)',
            borderRadius: '3px',
            position: 'relative',
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: `${progressPct}%`,
              background: 'var(--accent)',
              borderRadius: '3px',
              boxShadow: '0 0 6px var(--accent)',
            }}
          />
        </div>

        {/* Lower Row: Time & Volume */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: 'rgba(255, 255, 255, 0.85)',
            fontWeight: 500,
          }}
        >
          <span>
            {formatTime(status.position)} / {formatTime(status.duration)}
          </span>

          <button
            className="glass-btn glass-btn-icon"
            style={{ width: '22px', height: '22px', padding: 0 }}
            onClick={(e) => {
              e.stopPropagation();
              setMuted(!status.muted);
            }}
            title={status.muted ? 'Unmute' : 'Mute'}
          >
            {status.muted ? <VolumeX size={13} color="#ef4444" /> : <Volume2 size={13} />}
          </button>
        </div>
      </div>
    </div>
  );
};
