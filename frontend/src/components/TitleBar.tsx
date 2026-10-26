import React from 'react';
import {
  FolderOpen,
  FileVideo,
  Globe,
  Camera,
  Settings,
  Cpu,
  Zap,
  X,
} from 'lucide-react';
import { usePlayerStore } from '../stores/playerStore';
import { pickMediaFiles, pickFolder } from '../utils/filePicker';

export const TitleBar: React.FC = () => {
  const {
    status,
    openMedia,
    openFolder,
    stopMedia,
    takeScreenshot,
    activeModal,
    setActiveModal,
  } = usePlayerStore();

  const handleOpenFile = async () => {
    try {
      const paths = await pickMediaFiles();
      if (paths.length > 0) {
        await openMedia(paths);
      }
    } catch (e) {
      console.error('File open error:', e);
    }
  };

  const handleOpenFolder = async () => {
    try {
      const folder = await pickFolder();
      if (folder) {
        await openFolder(folder);
      }
    } catch (e) {
      console.error('Folder open error:', e);
    }
  };

  const handleScreenshot = async () => {
    const defaultName = `screenshot_${Date.now()}.png`;
    await takeScreenshot(defaultName);
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 48px)',
        maxWidth: '1240px',
        padding: '10px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 50,
      }}
      className="glass-panel"
    >
      {/* Left: Branding & Current File */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: 'var(--accent-gradient)',
              boxShadow: 'var(--accent-glow)',
            }}
          />
          <span
            style={{
              fontWeight: 800,
              fontSize: '15px',
              letterSpacing: '-0.5px',
              background: 'var(--accent-gradient)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            LUMEN
          </span>
        </div>

        {/* Media Title */}
        <div
          style={{
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '380px',
          }}
          title={status.title || 'No media open'}
        >
          {status.title || 'No file playing'}
        </div>

        {/* Hardware decoding badge */}
        {status.state !== 'idle' && (
          <div
            onClick={() =>
              setActiveModal(activeModal === 'diagnostics' ? null : 'diagnostics')
            }
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '6px',
              cursor: 'pointer',
              background: status.hwdec_active
                ? 'rgba(99, 102, 241, 0.2)'
                : 'rgba(255, 255, 255, 0.08)',
              border: `1px solid ${
                status.hwdec_active ? 'rgba(99, 102, 241, 0.5)' : 'rgba(255, 255, 255, 0.1)'
              }`,
              fontSize: '11px',
              fontWeight: 600,
              color: status.hwdec_active ? 'var(--accent-light)' : 'var(--text-muted)',
            }}
            title="Click to view libmpv diagnostics"
          >
            {status.hwdec_active ? <Zap size={12} /> : <Cpu size={12} />}
            <span>{status.hwdec_active ? 'HW: GPU' : 'SW'}</span>
          </div>
        )}

        {/* Video resolution pill */}
        {status.video_width && status.video_height && (
          <div
            style={{
              padding: '2px 8px',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.06)',
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--text-secondary)',
            }}
          >
            {status.video_width}x{status.video_height}
          </div>
        )}
      </div>

      {/* Right: Quick Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          className="glass-btn"
          style={{ padding: '6px 10px', fontSize: '12px' }}
          onClick={handleOpenFile}
          title="Open Media File (Ctrl+O)"
        >
          <FileVideo size={14} />
          <span>Open</span>
        </button>

        <button
          className="glass-btn"
          style={{ padding: '6px 10px', fontSize: '12px' }}
          onClick={handleOpenFolder}
          title="Open Folder (Ctrl+Shift+O)"
        >
          <FolderOpen size={14} />
          <span>Folder</span>
        </button>

        <button
          className="glass-btn"
          style={{ padding: '6px 10px', fontSize: '12px' }}
          onClick={() => setActiveModal(activeModal === 'open_url' ? null : 'open_url')}
          title="Open Stream URL (Ctrl+U)"
        >
          <Globe size={14} />
          <span>URL</span>
        </button>

        <button
          className="glass-btn glass-btn-icon"
          style={{ width: '32px', height: '32px' }}
          onClick={handleScreenshot}
          title="Take Screenshot (S)"
        >
          <Camera size={15} />
        </button>

        <button
          className={`glass-btn glass-btn-icon ${activeModal === 'diagnostics' ? 'active' : ''}`}
          style={{ width: '32px', height: '32px' }}
          onClick={() => setActiveModal(activeModal === 'diagnostics' ? null : 'diagnostics')}
          title="libmpv Engine Diagnostics (I)"
        >
          <Cpu size={15} />
        </button>

        <button
          className={`glass-btn glass-btn-icon ${activeModal === 'settings' ? 'active' : ''}`}
          style={{ width: '32px', height: '32px' }}
          onClick={() => setActiveModal(activeModal === 'settings' ? null : 'settings')}
          title="Settings"
        >
          <Settings size={15} />
        </button>

        {status.path && (
          <button
            className="glass-btn glass-btn-icon"
            style={{ width: '32px', height: '32px', color: '#f87171' }}
            onClick={stopMedia}
            title="Close File (Return to Home)"
          >
            <X size={15} />
          </button>
        )}
      </div>
    </div>
  );
};
