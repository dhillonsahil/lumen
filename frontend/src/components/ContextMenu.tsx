import React, { useEffect } from 'react';
import {
  Play,
  Pause,
  Maximize,
  AudioLines,
  Subtitles,
  Sliders,
  Activity,
  Camera,
  FolderOpen,
  Heart,
  Tv,
  Repeat,
} from 'lucide-react';
import { usePlayerStore } from '../stores/playerStore';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onClose }) => {
  const {
    status,
    togglePlay,
    takeScreenshot,
    setActiveModal,
    isFullscreen,
    setIsFullscreen,
    toggleMiniPlayer,
    cycleAbLoop,
    cycleAspectRatio,
    openSettings,
  } = usePlayerStore();

  useEffect(() => {
    const handleClickOutside = () => onClose();
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [onClose]);

  // Adjust menu coordinates so it doesn't overflow screen boundaries
  const menuWidth = 220;
  const menuHeight = 320;
  const adjustedX = Math.min(x, window.innerWidth - menuWidth - 10);
  const adjustedY = Math.min(y, window.innerHeight - menuHeight - 10);

  const menuItems = [
    {
      label: status.state === 'playing' ? 'Pause' : 'Play',
      icon: status.state === 'playing' ? <Pause size={14} /> : <Play size={14} />,
      action: () => togglePlay(),
    },
    {
      label: isFullscreen ? 'Exit Fullscreen' : 'Fullscreen',
      icon: <Maximize size={14} />,
      action: async () => {
        const next = !isFullscreen;
        setIsFullscreen(next);
        try {
          const { getCurrentWindow } = await import('@tauri-apps/api/window');
          await getCurrentWindow().setFullscreen(next);
        } catch (e) {
          console.warn(e);
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Audio Tracks...',
      icon: <AudioLines size={14} />,
      action: () => setActiveModal('tracks'),
    },
    {
      label: 'Subtitles...',
      icon: <Subtitles size={14} />,
      action: () => setActiveModal('tracks'),
    },
    {
      label: 'Video & Color Adjustments...',
      icon: <Sliders size={14} />,
      action: () => openSettings('video'),
    },
    {
      label: 'Equalizer...',
      icon: <Activity size={14} />,
      action: () => openSettings('equalizer'),
    },
    {
      label: 'Cycle Aspect Ratio (A)',
      icon: <Sliders size={14} />,
      action: () => cycleAspectRatio(),
    },
    {
      label: 'A-B Loop (L)',
      icon: <Repeat size={14} />,
      action: () => cycleAbLoop(),
    },
    {
      label: 'Mini-Player (PiP)',
      icon: <Tv size={14} />,
      action: () => toggleMiniPlayer(),
    },
    { type: 'separator' },
    {
      label: 'Take Screenshot',
      icon: <Camera size={14} />,
      action: () => takeScreenshot(`screenshot_${Date.now()}.png`),
    },
    {
      label: 'Settings...',
      icon: <FolderOpen size={14} />,
      action: () => setActiveModal('settings'),
    },
    {
      label: 'Sponsor Lumen...',
      icon: <Heart size={14} color="#ec4899" fill="rgba(236,72,153,0.3)" />,
      action: () => setActiveModal('sponsor'),
    },
  ];

  return (
    <div
      className="glass-panel"
      style={{
        position: 'fixed',
        top: `${adjustedY}px`,
        left: `${adjustedX}px`,
        width: `${menuWidth}px`,
        padding: '6px',
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.7)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {menuItems.map((item, idx) => {
        if (item.type === 'separator') {
          return (
            <div
              key={idx}
              style={{
                height: '1px',
                background: 'var(--glass-border-subtle)',
                margin: '4px 6px',
              }}
            />
          );
        }

        return (
          <button
            key={item.label}
            className="glass-btn"
            style={{
              width: '100%',
              justifyContent: 'flex-start',
              padding: '7px 10px',
              fontSize: '12px',
              background: 'transparent',
              border: 'none',
              gap: '10px',
            }}
            onClick={() => {
              item.action?.();
              onClose();
            }}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};
