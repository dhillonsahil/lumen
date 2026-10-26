import React, { useRef, useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Volume1,
  Maximize,
  Minimize,
  Sliders,
  Activity,
  ListMusic,
  Library as LibraryIcon,
  Subtitles,
  AudioLines,
  Gauge,
  AlertTriangle,
  Tv,
  Repeat,
} from 'lucide-react';
import { usePlayerStore } from '../stores/playerStore';

export const TransportBar: React.FC = () => {
  const {
    status,
    chapters,
    togglePlay,
    seek,
    setVolume,
    setMuted,
    setSpeed,
    nextTrack,
    prevTrack,
    activeModal,
    setActiveModal,
    activeDrawer,
    setActiveDrawer,
    isFullscreen,
    toggleFullscreen,
    toggleMiniPlayer,
    cycleAbLoop,
    openSettings,
  } = usePlayerStore();

  const [isHoveringSeek, setIsHoveringSeek] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState<number>(0);
  const [isDraggingSeek, setIsDraggingSeek] = useState(false);
  const [dragTime, setDragTime] = useState(0);
  const [speedMenuOpen, setSpeedMenuOpen] = useState(false);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeekStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || status.duration <= 0) return;
    setIsDraggingSeek(true);
    const rect = progressBarRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const percent = pos / rect.width;
    const time = percent * status.duration;
    setDragTime(time);
    setHoverTime(time);
    setHoverX(pos);

    const handleWindowMouseMove = (moveEvent: MouseEvent) => {
      if (!progressBarRef.current) return;
      const r = progressBarRef.current.getBoundingClientRect();
      const p = Math.max(0, Math.min(r.width, moveEvent.clientX - r.left));
      const pct = p / r.width;
      const t = pct * status.duration;
      setDragTime(t);
      setHoverTime(t);
      setHoverX(p);
    };

    const handleWindowMouseUp = (upEvent: MouseEvent) => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
      if (!progressBarRef.current) {
        setIsDraggingSeek(false);
        return;
      }
      const r = progressBarRef.current.getBoundingClientRect();
      const p = Math.max(0, Math.min(r.width, upEvent.clientX - r.left));
      const pct = p / r.width;
      const t = pct * status.duration;
      seek(t);
      setIsDraggingSeek(false);
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
  };

  const handleSeekMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || status.duration <= 0 || isDraggingSeek) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const percent = pos / rect.width;
    setHoverTime(percent * status.duration);
    setHoverX(pos);
  };

  const currentDisplayTime = isDraggingSeek ? dragTime : status.position;
  const progressPercent =
    status.duration > 0 ? (currentDisplayTime / status.duration) * 100 : 0;
  const bufferPercent =
    status.duration > 0
      ? Math.min(100, ((status.position + status.cache_seconds) / status.duration) * 100)
      : 0;

  const speeds = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0, 4.0];
  const isBoost = status.volume > 100;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 48px)',
        maxWidth: '1060px',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        zIndex: 50,
      }}
      className="glass-panel"
    >
      {/* Draggable Seek Bar Container */}
      <div
        ref={progressBarRef}
        onMouseDown={handleSeekStart}
        onMouseEnter={() => setIsHoveringSeek(true)}
        onMouseLeave={() => {
          if (!isDraggingSeek) {
            setIsHoveringSeek(false);
            setHoverTime(null);
          }
        }}
        onMouseMove={handleSeekMouseMove}
        style={{
          position: 'relative',
          height: isHoveringSeek || isDraggingSeek ? '10px' : '6px',
          background: 'rgba(255, 255, 255, 0.12)',
          borderRadius: '4px',
          cursor: 'pointer',
          transition: isDraggingSeek ? 'none' : 'height 0.15s ease',
        }}
      >
        {/* Buffering cache bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            width: `${bufferPercent}%`,
            background: 'rgba(255, 255, 255, 0.22)',
            borderRadius: '4px',
            pointerEvents: 'none',
          }}
        />

        {/* Chapters markers */}
        {status.duration > 0 &&
          chapters.map((chap, idx) => {
            const leftPct = (chap.time / status.duration) * 100;
            return (
              <div
                key={idx}
                title={`${chap.title} (${formatTime(chap.time)})`}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: `${leftPct}%`,
                  width: '2px',
                  height: '100%',
                  background: 'rgba(255, 255, 255, 0.75)',
                  zIndex: 2,
                  pointerEvents: 'none',
                }}
              />
            );
          })}

        {/* Playback progress bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            width: `${progressPercent}%`,
            background: 'var(--accent-gradient)',
            borderRadius: '4px',
            boxShadow: '0 0 10px rgba(99, 102, 241, 0.6)',
            pointerEvents: 'none',
          }}
        />

        {/* A-B Loop highlight and markers */}
        {status.duration > 0 &&
          status.ab_loop_a !== null &&
          status.ab_loop_a !== undefined && (
            <>
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: `${(status.ab_loop_a / status.duration) * 100}%`,
                  width:
                    status.ab_loop_b !== null && status.ab_loop_b !== undefined
                      ? `${Math.max(
                          0.5,
                          ((status.ab_loop_b - status.ab_loop_a) / status.duration) * 100
                        )}%`
                      : '3px',
                  background:
                    status.ab_loop_b !== null && status.ab_loop_b !== undefined
                      ? 'rgba(236, 72, 153, 0.45)'
                      : '#ec4899',
                  borderRadius: '2px',
                  pointerEvents: 'none',
                  zIndex: 2,
                }}
              />
              <div
                title={`Loop A: ${formatTime(status.ab_loop_a)}`}
                style={{
                  position: 'absolute',
                  top: '-4px',
                  left: `${(status.ab_loop_a / status.duration) * 100}%`,
                  transform: 'translateX(-50%)',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#ec4899',
                  border: '1px solid #fff',
                  zIndex: 4,
                  pointerEvents: 'none',
                }}
              />
              {status.ab_loop_b !== null && status.ab_loop_b !== undefined && (
                <div
                  title={`Loop B: ${formatTime(status.ab_loop_b)}`}
                  style={{
                    position: 'absolute',
                    top: '-4px',
                    left: `${(status.ab_loop_b / status.duration) * 100}%`,
                    transform: 'translateX(-50%)',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#ec4899',
                    border: '1px solid #fff',
                    zIndex: 4,
                    pointerEvents: 'none',
                  }}
                />
              )}
            </>
          )}

        {/* Playhead thumb when hovering or dragging */}
        {(isHoveringSeek || isDraggingSeek) && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: `${progressPercent}%`,
              transform: 'translate(-50%, -50%)',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: '#fff',
              boxShadow: '0 0 6px rgba(0,0,0,0.6)',
              pointerEvents: 'none',
              zIndex: 3,
            }}
          />
        )}

        {/* Hover preview tooltip */}
        {(isHoveringSeek || isDraggingSeek) && hoverTime !== null && (
          <div
            style={{
              position: 'absolute',
              top: '-32px',
              left: `${hoverX}px`,
              transform: 'translateX(-50%)',
              background: 'rgba(10, 12, 18, 0.95)',
              border: '1px solid var(--glass-border)',
              borderRadius: '4px',
              padding: '2px 8px',
              fontSize: '11px',
              fontWeight: 600,
              color: '#fff',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              zIndex: 10,
            }}
          >
            {formatTime(hoverTime)}
          </div>
        )}
      </div>

      {/* Main Controls Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        {/* Left: Playback buttons & Time */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            className="glass-btn glass-btn-icon"
            onClick={prevTrack}
            title="Previous Track (P)"
          >
            <SkipBack size={18} />
          </button>

          <button
            className="glass-btn glass-btn-icon glass-btn-primary"
            onClick={togglePlay}
            style={{ width: '44px', height: '44px' }}
            title="Play / Pause (Space / K)"
          >
            {status.state === 'playing' ? <Pause size={22} /> : <Play size={22} />}
          </button>

          <button
            className="glass-btn glass-btn-icon"
            onClick={nextTrack}
            title="Next Track (N)"
          >
            <SkipForward size={18} />
          </button>

          {/* Time text */}
          <div
            style={{
              marginLeft: '8px',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              letterSpacing: '0.5px',
            }}
          >
            <span style={{ color: 'var(--text-primary)' }}>
              {formatTime(currentDisplayTime)}
            </span>
            {' / '}
            <span>{formatTime(status.duration)}</span>
          </div>
        </div>

        {/* Center: Volume & Speed */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Volume control with Boost indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              className="glass-btn glass-btn-icon"
              style={{ width: '32px', height: '32px' }}
              onClick={() => setMuted(!status.muted)}
              title="Mute / Unmute (M)"
            >
              {status.muted || status.volume === 0 ? (
                <VolumeX size={16} />
              ) : isBoost ? (
                <Volume2 size={16} style={{ color: '#fbbf24' }} />
              ) : status.volume > 50 ? (
                <Volume2 size={16} />
              ) : (
                <Volume1 size={16} />
              )}
            </button>

            <input
              type="range"
              min="0"
              max="200"
              step="1"
              value={status.muted ? 0 : status.volume}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setVolume(val);
                if (status.muted && val > 0) setMuted(false);
              }}
              style={{
                width: '84px',
                accentColor: isBoost ? '#fbbf24' : 'var(--accent)',
                cursor: 'pointer',
              }}
              title={`Volume: ${Math.round(status.volume)}%${isBoost ? ' (Boost: may clip audio)' : ''}`}
            />

            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                minWidth: '38px',
                color: isBoost ? '#fbbf24' : 'var(--text-secondary)',
              }}
            >
              {Math.round(status.volume)}%
            </span>

            {isBoost && (
              <span
                title="Volume Boost: Software amplification active. Audio clipping may occur."
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  fontSize: '9px',
                  fontWeight: 700,
                  padding: '1px 5px',
                  borderRadius: '4px',
                  background: 'rgba(245, 158, 11, 0.25)',
                  color: '#fbbf24',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                }}
              >
                <AlertTriangle size={10} />
                BOOST
              </span>
            )}
          </div>

          {/* Speed selector pill */}
          <div style={{ position: 'relative' }}>
            <button
              className="glass-btn"
              style={{ padding: '4px 10px', fontSize: '11px', gap: '4px' }}
              onClick={() => setSpeedMenuOpen(!speedMenuOpen)}
              title="Playback Speed"
            >
              <Gauge size={13} />
              <span>{status.speed}x</span>
            </button>

            {speedMenuOpen && (
              <div
                className="glass-panel"
                style={{
                  position: 'absolute',
                  bottom: '38px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  padding: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  minWidth: '84px',
                  zIndex: 60,
                }}
              >
                {speeds.map((s) => (
                  <button
                    key={s}
                    className="glass-btn"
                    style={{
                      padding: '4px 8px',
                      fontSize: '12px',
                      justifyContent: 'flex-start',
                      background: status.speed === s ? 'var(--accent)' : 'transparent',
                    }}
                    onClick={() => {
                      setSpeed(s);
                      setSpeedMenuOpen(false);
                    }}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Modal & Drawer Toggles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Audio Tracks */}
          <button
            className={`glass-btn glass-btn-icon ${activeModal === 'tracks' ? 'active' : ''}`}
            onClick={() => setActiveModal(activeModal === 'tracks' ? null : 'tracks')}
            title="Audio & Subtitle Tracks (A / S)"
          >
            <AudioLines size={16} />
          </button>

          {/* Subtitles shortcut */}
          <button
            className={`glass-btn glass-btn-icon ${activeModal === 'tracks' ? 'active' : ''}`}
            onClick={() => setActiveModal(activeModal === 'tracks' ? null : 'tracks')}
            title="Subtitles"
          >
            <Subtitles size={16} />
          </button>

          {/* Video Adjustments */}
          <button
            className="glass-btn glass-btn-icon"
            onClick={() => openSettings('video')}
            title="Video & Color Adjustments (Aspect, Color, Zoom)"
          >
            <Sliders size={16} />
          </button>

          {/* Equalizer */}
          <button
            className="glass-btn glass-btn-icon"
            onClick={() => openSettings('equalizer')}
            title="10-Band Audio Equalizer"
          >
            <Activity size={16} />
          </button>

          {/* Playlist Drawer */}
          <button
            className={`glass-btn glass-btn-icon ${activeDrawer === 'playlist' ? 'active' : ''}`}
            onClick={() => setActiveDrawer(activeDrawer === 'playlist' ? null : 'playlist')}
            title="Playlist Queue (Q)"
          >
            <ListMusic size={16} />
          </button>

          {/* Library Drawer */}
          <button
            className={`glass-btn glass-btn-icon ${activeDrawer === 'library' ? 'active' : ''}`}
            onClick={() => setActiveDrawer(activeDrawer === 'library' ? null : 'library')}
            title="Media Library & History (Ctrl+B)"
          >
            <LibraryIcon size={16} />
          </button>

          {/* A-B Loop */}
          <button
            className={`glass-btn glass-btn-icon ${
              status.ab_loop_a !== null && status.ab_loop_a !== undefined ? 'active' : ''
            }`}
            style={{
              borderColor:
                status.ab_loop_a !== null && status.ab_loop_a !== undefined
                  ? '#ec4899'
                  : undefined,
              color:
                status.ab_loop_a !== null && status.ab_loop_a !== undefined
                  ? '#ec4899'
                  : undefined,
            }}
            onClick={cycleAbLoop}
            title={
              status.ab_loop_a !== null && status.ab_loop_a !== undefined
                ? status.ab_loop_b !== null && status.ab_loop_b !== undefined
                  ? `Looping A-B (${formatTime(status.ab_loop_a)} - ${formatTime(status.ab_loop_b)}). Click to clear.`
                  : `Loop Point A set at ${formatTime(status.ab_loop_a)}. Click to set Point B.`
                : 'A-B Loop: Set Point A (L)'
            }
          >
            <Repeat size={16} />
          </button>

          {/* Mini-Player / PiP */}
          <button
            className="glass-btn glass-btn-icon"
            onClick={toggleMiniPlayer}
            title="Toggle Mini-Player / Always on Top (P)"
          >
            <Tv size={16} />
          </button>

          {/* Fullscreen */}
          <button
            className="glass-btn glass-btn-icon"
            onClick={toggleFullscreen}
            title="Toggle Fullscreen (F)"
          >
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
};
