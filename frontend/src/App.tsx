import React, { useEffect, useState, useRef } from 'react';
import { TitleBar } from './components/TitleBar';
import { TransportBar } from './components/TransportBar';
import { MiniPlayerOverlay } from './components/MiniPlayerOverlay';
import { ContextMenu } from './components/ContextMenu';
import { TrackSelectionModal } from './modals/TrackSelectionModal';
import { EqualizerModal } from './modals/EqualizerModal';
import { VideoAdjustmentsModal } from './modals/VideoAdjustmentsModal';
import { OpenUrlModal } from './modals/OpenUrlModal';
import { SettingsModal } from './modals/SettingsModal';
import { DiagnosticModal } from './modals/DiagnosticModal';
import { SponsorModal } from './modals/SponsorModal';
import { PlaylistDrawer } from './drawers/PlaylistDrawer';
import { LibraryDrawer } from './drawers/LibraryDrawer';
import { usePlayerStore } from './stores/playerStore';
import { useShortcuts } from './hooks/useShortcuts';
import {
  Film,
  FolderOpen,
  Globe,
  Play,
  Volume2,
  VolumeX,
  FastForward,
  Rewind,
  Clock,
  Keyboard,
  Sparkles,
} from 'lucide-react';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { listen } from '@tauri-apps/api/event';
import { pickMediaFiles, pickFolder } from './utils/filePicker';

export const App: React.FC = () => {
  const {
    status,
    history,
    init,
    controlsVisible,
    setControlsVisible,
    activeModal,
    setActiveModal,
    activeDrawer,
    openMedia,
    openFolder,
    addToPlaylist,
    importPlaylist,
    togglePlay,
    toggleFullscreen,
    isMiniPlayer,
    toggleMiniPlayer,
    setVolume,
    seekRelative,
  } = usePlayerStore();

  useShortcuts();

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [hudMessage, setHudMessage] = useState<{ text: string; icon: string } | null>(null);

  const hideTimerRef = useRef<number | null>(null);
  const clickTimerRef = useRef<number | null>(null);
  const hudTimerRef = useRef<number | null>(null);

  const hasMedia =
    Boolean(status.path) &&
    status.state !== 'idle' &&
    status.state !== 'stopped';

  // Synchronize documentElement & body class whenever hasMedia changes
  useEffect(() => {
    if (hasMedia) {
      document.documentElement.classList.add('media-loaded');
      document.body.classList.add('media-loaded');
    } else {
      document.documentElement.classList.remove('media-loaded');
      document.body.classList.remove('media-loaded');
    }
  }, [hasMedia]);

  const showHud = (text: string, icon: string = 'info') => {
    setHudMessage({ text, icon });
    if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
    hudTimerRef.current = window.setTimeout(() => {
      setHudMessage(null);
    }, 1200);
  };

  useEffect(() => {
    init();

    let unlistenWebviewDragDrop: (() => void) | null = null;
    let unlistenTauriEvent: (() => void) | null = null;

    const handleDroppedFiles = async (paths: string[]) => {
      if (!paths || paths.length === 0) return;
      setIsDraggingOver(false);

      const first = paths[0].toLowerCase();
      if (
        first.endsWith('.m3u') ||
        first.endsWith('.m3u8') ||
        first.endsWith('.pls') ||
        first.endsWith('.xspf')
      ) {
        showHud('Importing playlist...', 'forward');
        await importPlaylist(paths[0]);
        return;
      }

      if (activeDrawer === 'playlist') {
        await addToPlaylist(paths);
        showHud(`Added ${paths.length} file(s) to queue`, 'forward');
      } else {
        await openMedia(paths);
      }
    };

    // 1. WebviewWindow native drag-drop API
    try {
      const win = getCurrentWebviewWindow();
      win.onDragDropEvent((event) => {
        if (event.payload.type === 'drop') {
          handleDroppedFiles(event.payload.paths);
        } else if (event.payload.type === 'enter') {
          setIsDraggingOver(true);
        } else if (event.payload.type === 'leave') {
          setIsDraggingOver(false);
        }
      }).then((unlisten) => {
        unlistenWebviewDragDrop = unlisten;
      });
    } catch (e) {
      console.warn('Native onDragDropEvent listener failed', e);
    }

    // 2. Global event listener fallback for 'tauri://drag-drop'
    listen<any>('tauri://drag-drop', (event) => {
      const payload = event.payload;
      if (!payload) return;
      if (payload.type === 'drop' && Array.isArray(payload.paths) && payload.paths.length > 0) {
        handleDroppedFiles(payload.paths);
      } else if (Array.isArray(payload.paths) && payload.paths.length > 0) {
        handleDroppedFiles(payload.paths);
      }
    }).then((unlisten) => {
      unlistenTauriEvent = unlisten;
    });

    return () => {
      if (unlistenWebviewDragDrop) unlistenWebviewDragDrop();
      if (unlistenTauriEvent) unlistenTauriEvent();
      if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
    };
  }, [init, openMedia, addToPlaylist, importPlaylist, activeDrawer]);

  // Auto-hide controls during playback
  const handleUserActivity = () => {
    setControlsVisible(true);
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    if (status.state === 'playing') {
      hideTimerRef.current = window.setTimeout(() => {
        setControlsVisible(false);
      }, 3000);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const files = Array.from(e.dataTransfer.files);
    const paths: string[] = [];
    for (const f of files) {
      const p = (f as any).path;
      if (p && typeof p === 'string') {
        paths.push(p);
      }
    }

    if (paths.length > 0) {
      openMedia(paths);
    }
  };

  // Video click handler: distinguish single click (play/pause) from double click (fullscreen)
  const handleVideoClick = () => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    clickTimerRef.current = window.setTimeout(() => {
      togglePlay();
      showHud(status.state === 'playing' ? 'Paused' : 'Playing', 'play');
      clickTimerRef.current = null;
    }, 220);
  };

  const handleVideoDoubleClick = () => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    if (isMiniPlayer) {
      toggleMiniPlayer();
    } else {
      toggleFullscreen();
    }
  };

  // Mouse wheel over the video area: volume and seek
  const handleVideoWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleUserActivity();

    if (e.shiftKey) {
      // Shift + scroll: seek forward / backward 5 seconds
      const deltaSec = e.deltaY < 0 ? 5 : -5;
      seekRelative(deltaSec);
      showHud(
        `${deltaSec > 0 ? '+5s' : '-5s'} (${Math.round(status.position)}s)`,
        deltaSec > 0 ? 'forward' : 'rewind'
      );
    } else {
      // Normal scroll: volume up / down by 5
      const deltaVol = e.deltaY < 0 ? 5 : -5;
      const nextVol = Math.max(0, Math.min(200, Math.round(status.volume + deltaVol)));
      setVolume(nextVol);
      const isBoost = nextVol > 100;
      showHud(
        `Volume: ${nextVol}%${isBoost ? ' (BOOST)' : ''}`,
        nextVol === 0 ? 'mute' : 'volume'
      );
    }
  };

  const handleOpenFiles = async () => {
    const paths = await pickMediaFiles();
    if (paths.length > 0) {
      await openMedia(paths);
    }
  };

  const handleOpenFolder = async () => {
    const folder = await pickFolder();
    if (folder) {
      await openFolder(folder);
    }
  };

  return (
    <div
      onMouseMove={handleUserActivity}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: hasMedia ? 'transparent' : '#0b0f17',
      }}
    >
      {/* Layer 1: MPV Video Hitbox & Input Surface */}
      {hasMedia && (
        <div
          className="mpv-input-layer video-hitbox"
          onClick={handleVideoClick}
          onDoubleClick={handleVideoDoubleClick}
          onWheel={handleVideoWheel}
          onContextMenu={handleContextMenu}
        />
      )}

      {/* Layer 2: No-Media Home State (Opaque Dark Screen) */}
      {!hasMedia && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0b0f17',
            zIndex: 5,
            padding: '24px',
          }}
        >
          {/* Main Card */}
          <div
            className="glass-panel"
            style={{
              padding: '40px 48px',
              maxWidth: '560px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              background: 'rgba(15, 18, 28, 0.95)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)',
            }}
          >
            {/* Logo Badge */}
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '18px',
                background: 'var(--accent-gradient)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--accent-glow)',
                marginBottom: '18px',
              }}
            >
              <Film size={32} color="#fff" />
            </div>

            <h1
              style={{
                fontSize: '26px',
                fontWeight: 800,
                letterSpacing: '-0.5px',
                marginBottom: '8px',
              }}
            >
              Lumen v2
            </h1>

            <p
              style={{
                fontSize: '13px',
                color: 'var(--text-secondary)',
                lineHeight: '1.6',
                marginBottom: '26px',
                maxWidth: '420px',
              }}
            >
              Hardware-accelerated native media engine powered exclusively by libmpv.
              Supports MKV multi-audio, DTS/AC-3, embedded ASS styles, and 4K Direct3D11 rendering.
            </p>

            {/* Quick Actions */}
            <div
              style={{
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap',
                justifyContent: 'center',
                marginBottom: '24px',
              }}
            >
              <button
                className="glass-btn glass-btn-primary"
                style={{ padding: '10px 20px', fontSize: '13px' }}
                onClick={handleOpenFiles}
              >
                <Film size={16} />
                <span>Open File (Ctrl+O)</span>
              </button>

              <button
                className="glass-btn"
                style={{ padding: '10px 18px', fontSize: '13px' }}
                onClick={handleOpenFolder}
              >
                <FolderOpen size={16} />
                <span>Open Folder...</span>
              </button>

              <button
                className="glass-btn"
                style={{ padding: '10px 18px', fontSize: '13px' }}
                onClick={() => setActiveModal('open_url')}
              >
                <Globe size={16} />
                <span>Open URL...</span>
              </button>
            </div>

            {/* Drag & Drop Hint */}
            <div
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px dashed var(--glass-border-subtle)',
                fontSize: '12px',
                color: 'var(--text-muted)',
                marginBottom: history.length > 0 ? '20px' : '0',
                width: '100%',
              }}
            >
              Drag and drop media files anywhere to play
            </div>

            {/* Recent Files List if Available */}
            {history.length > 0 && (
              <div
                style={{
                  width: '100%',
                  textAlign: 'left',
                  borderTop: '1px solid var(--glass-border-subtle)',
                  paddingTop: '16px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: 'var(--text-muted)',
                    marginBottom: '10px',
                  }}
                >
                  <Clock size={12} />
                  <span>Recent Media</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {history.slice(0, 5).map((item, idx) => (
                    <div
                      key={idx}
                      className="glass-card"
                      onClick={() => openMedia([item.path])}
                      style={{
                        padding: '8px 12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '12px',
                      }}
                    >
                      <span
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '420px',
                        }}
                      >
                        {item.title || item.path.split(/[/\\]/).pop()}
                      </span>
                      <Play size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Keyboard Shortcuts Hint Bar at Bottom */}
          <div
            style={{
              position: 'absolute',
              bottom: '20px',
              display: 'flex',
              gap: '16px',
              fontSize: '11px',
              color: 'var(--text-muted)',
              alignItems: 'center',
            }}
          >
            <span><Keyboard size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> Space: Play/Pause</span>
            <span>•</span>
            <span>Wheel: Volume</span>
            <span>•</span>
            <span>Shift+Wheel: Seek</span>
            <span>•</span>
            <span>F: Fullscreen</span>
            <span>•</span>
            <span>M: Mute</span>
            <span>•</span>
            <span>I: Diagnostics</span>
          </div>
        </div>
      )}

      {/* Layer 3: Controls Layer */}
      <div className="controls-layer">
        {isMiniPlayer && hasMedia ? (
          <div className="interactive">
            <MiniPlayerOverlay />
          </div>
        ) : (
          <>
            {/* Top Title Bar */}
            <div
              className="interactive"
              style={{
                opacity: controlsVisible || !hasMedia || activeModal ? 1 : 0,
                pointerEvents:
                  controlsVisible || !hasMedia || activeModal ? 'auto' : 'none',
                transition: 'opacity 0.25s ease',
              }}
            >
              <TitleBar />
            </div>

            {/* Floating Bottom Transport Bar */}
            {hasMedia && (
              <div
                className="interactive"
                style={{
                  opacity:
                    controlsVisible || status.state === 'paused' || activeModal ? 1 : 0,
                  pointerEvents:
                    controlsVisible || status.state === 'paused' || activeModal
                      ? 'auto'
                      : 'none',
                  transition: 'opacity 0.25s ease',
                }}
              >
                <TransportBar />
              </div>
            )}
          </>
        )}

        {/* Heads-Up Display (HUD) feedback overlay */}
        {hudMessage && (
          <div
            style={{
              position: 'absolute',
              top: '90px',
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '10px 20px',
              borderRadius: '9999px',
              background: 'rgba(15, 18, 28, 0.92)',
              border: '1px solid var(--glass-border)',
              boxShadow: 'var(--glass-shadow)',
              backdropFilter: 'blur(16px)',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              zIndex: 100,
              pointerEvents: 'none',
              animation: 'fadeIn 0.15s ease',
            }}
          >
            {hudMessage.icon === 'play' && <Play size={16} style={{ color: 'var(--accent)' }} />}
            {hudMessage.icon === 'volume' && <Volume2 size={16} style={{ color: 'var(--accent)' }} />}
            {hudMessage.icon === 'mute' && <VolumeX size={16} style={{ color: '#ef4444' }} />}
            {hudMessage.icon === 'forward' && <FastForward size={16} style={{ color: 'var(--accent)' }} />}
            {hudMessage.icon === 'rewind' && <Rewind size={16} style={{ color: 'var(--accent)' }} />}
            <span>{hudMessage.text}</span>
          </div>
        )}

        {/* Drag & Drop Visual Highlight */}
        {isDraggingOver && (
          <div
            style={{
              position: 'absolute',
              inset: '16px',
              borderRadius: '16px',
              border: '2px dashed var(--accent)',
              backgroundColor: 'rgba(99, 102, 241, 0.18)',
              backdropFilter: 'blur(16px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              pointerEvents: 'none',
              color: '#fff',
              gap: '12px',
            }}
          >
            <Sparkles size={48} style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: '18px', fontWeight: 600 }}>
              Drop media files here to play
            </span>
          </div>
        )}

        {/* Modals */}
        {activeModal === 'tracks' && (
          <div className="interactive">
            <TrackSelectionModal />
          </div>
        )}
        {activeModal === 'equalizer' && (
          <div className="interactive">
            <EqualizerModal />
          </div>
        )}
        {activeModal === 'video' && (
          <div className="interactive">
            <VideoAdjustmentsModal />
          </div>
        )}
        {activeModal === 'open_url' && (
          <div className="interactive">
            <OpenUrlModal />
          </div>
        )}
        {activeModal === 'settings' && (
          <div className="interactive">
            <SettingsModal />
          </div>
        )}
        {activeModal === 'diagnostics' && (
          <div className="interactive">
            <DiagnosticModal />
          </div>
        )}
        {activeModal === 'sponsor' && (
          <div className="interactive">
            <SponsorModal />
          </div>
        )}

        {/* Drawers */}
        <div className="interactive">
          <PlaylistDrawer />
        </div>
        <div className="interactive">
          <LibraryDrawer />
        </div>

        {/* Context Menu */}
        {contextMenu && (
          <div className="interactive">
            <ContextMenu
              x={contextMenu.x}
              y={contextMenu.y}
              onClose={() => setContextMenu(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
};
