import React, { useState } from 'react';
import {
  X,
  History,
  FolderSearch,
  Play,
  CheckCircle2,
  Search,
  Trash2,
  Video,
  Music,
  Clock,
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { usePlayerStore } from '../stores/playerStore';
import { pickFolder } from '../utils/filePicker';

export const LibraryDrawer: React.FC = () => {
  const {
    history,
    library,
    openMedia,
    scanFolder,
    fetchLibrary,
    activeDrawer,
    setActiveDrawer,
  } = usePlayerStore();

  const [activeTab, setActiveTab] = useState<'recent' | 'continue' | 'videos' | 'music'>('recent');
  const [searchQuery, setSearchQuery] = useState('');

  if (activeDrawer !== 'library') return null;

  const handleScan = async () => {
    try {
      const selected = await pickFolder();
      if (selected) {
        await scanFolder(selected);
      }
    } catch (e) {
      console.error('Scan error:', e);
    }
  };

  const handleRemoveLibraryItem = async (id: number) => {
    try {
      await invoke('remove_library_item', { id });
      await fetchLibrary();
    } catch (e) {
      console.error('Remove error:', e);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const videoExtensions = ['mp4', 'mkv', 'webm', 'avi', 'mov', 'ts', 'flv', 'm4v'];
  const audioExtensions = ['mp3', 'flac', 'aac', 'm4a', 'wav', 'ogg', 'opus'];

  const filteredHistory = history.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.path.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const continueWatching = filteredHistory.filter(
    (item) => !item.completed && item.last_position > 5.0
  );

  const filteredLibrary = library.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.path.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (activeTab === 'videos') {
      return videoExtensions.includes(item.format.toLowerCase());
    }
    if (activeTab === 'music') {
      return audioExtensions.includes(item.format.toLowerCase());
    }
    return true;
  });

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: '440px',
        height: '100%',
        zIndex: 80,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 0,
        borderRight: 'none',
        borderTop: 'none',
        borderBottom: 'none',
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
        <span style={{ fontSize: '15px', fontWeight: 700 }}>
          Media Library ({library.length})
        </span>

        <button
          className="glass-btn glass-btn-icon"
          style={{ width: '30px', height: '30px' }}
          onClick={() => setActiveDrawer(null)}
        >
          <X size={16} />
        </button>
      </div>

      {/* Tabs Row */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          padding: '10px 16px',
          borderBottom: '1px solid var(--glass-border-subtle)',
          overflowX: 'auto',
        }}
      >
        <button
          className={`glass-btn ${activeTab === 'recent' ? 'glass-btn-primary' : ''}`}
          style={{ padding: '5px 10px', fontSize: '12px' }}
          onClick={() => setActiveTab('recent')}
        >
          <Clock size={13} />
          <span>Recent ({history.length})</span>
        </button>

        <button
          className={`glass-btn ${activeTab === 'continue' ? 'glass-btn-primary' : ''}`}
          style={{ padding: '5px 10px', fontSize: '12px' }}
          onClick={() => setActiveTab('continue')}
        >
          <History size={13} />
          <span>Continue</span>
        </button>

        <button
          className={`glass-btn ${activeTab === 'videos' ? 'glass-btn-primary' : ''}`}
          style={{ padding: '5px 10px', fontSize: '12px' }}
          onClick={() => setActiveTab('videos')}
        >
          <Video size={13} />
          <span>Videos</span>
        </button>

        <button
          className={`glass-btn ${activeTab === 'music' ? 'glass-btn-primary' : ''}`}
          style={{ padding: '5px 10px', fontSize: '12px' }}
          onClick={() => setActiveTab('music')}
        >
          <Music size={13} />
          <span>Music</span>
        </button>
      </div>

      {/* Search & Scan Toolbar */}
      <div
        style={{
          padding: '10px 16px',
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid var(--glass-border-subtle)',
        }}
      >
        <div
          style={{
            flex: 1,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: '10px',
              color: 'var(--text-muted)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            placeholder="Search by title or file name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 10px 6px 30px',
              fontSize: '12px',
              background: 'rgba(0, 0, 0, 0.35)',
              border: '1px solid var(--glass-border)',
              borderRadius: '6px',
              color: '#fff',
              outline: 'none',
            }}
          />
        </div>

        <button
          className="glass-btn"
          style={{ padding: '6px 10px', fontSize: '11px', flexShrink: 0 }}
          onClick={handleScan}
          title="Scan a directory for media files into the SQLite database"
        >
          <FolderSearch size={14} />
          <span>Scan...</span>
        </button>
      </div>

      {/* Items List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {activeTab === 'recent' || activeTab === 'continue' ? (
          (activeTab === 'recent' ? filteredHistory : continueWatching).length === 0 ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'var(--text-muted)',
                fontSize: '13px',
              }}
            >
              {activeTab === 'continue' ? 'No items to continue watching' : 'No playback history yet'}
            </div>
          ) : (
            (activeTab === 'recent' ? filteredHistory : continueWatching).map((item) => {
              const percent =
                item.duration > 0 ? (item.last_position / item.duration) * 100 : 0;
              return (
                <div
                  key={item.path}
                  className="glass-card"
                  style={{
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    cursor: 'pointer',
                  }}
                  onClick={() => openMedia([item.path])}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '320px',
                      }}
                    >
                      {item.title}
                    </span>
                    {item.completed ? (
                      <CheckCircle2 size={15} style={{ color: '#10b981' }} />
                    ) : (
                      <Play size={14} style={{ color: 'var(--accent)' }} />
                    )}
                  </div>

                  {/* Progress bar */}
                  <div
                    style={{
                      height: '4px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '2px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(100, percent)}%`,
                        background: 'var(--accent-gradient)',
                      }}
                    />
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <span>Resumes at {Math.round(item.last_position)}s</span>
                    <span>{new Date(item.last_played_at).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })
          )
        ) : filteredLibrary.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--text-muted)',
              fontSize: '13px',
              gap: '8px',
            }}
          >
            <span>No media found</span>
            <button
              className="glass-btn glass-btn-primary"
              style={{ fontSize: '12px', padding: '6px 12px' }}
              onClick={handleScan}
            >
              Scan a Folder...
            </button>
          </div>
        ) : (
          filteredLibrary.map((item) => (
            <div
              key={item.id}
              className="glass-card"
              style={{
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
              }}
              onClick={() => openMedia([item.path])}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flex: 1 }}>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '300px',
                  }}
                >
                  {item.title}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {formatFileSize(item.file_size)}
                </span>
              </div>

              <div
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={(e) => e.stopPropagation()}
              >
                <span
                  style={{
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                  }}
                >
                  {item.format}
                </span>

                <button
                  className="glass-btn glass-btn-icon"
                  style={{ width: '26px', height: '26px' }}
                  onClick={() => openMedia([item.path])}
                  title="Play"
                >
                  <Play size={13} style={{ color: 'var(--accent)' }} />
                </button>

                <button
                  className="glass-btn glass-btn-icon"
                  style={{ width: '26px', height: '26px' }}
                  onClick={() => handleRemoveLibraryItem(item.id)}
                  title="Remove from library"
                >
                  <Trash2 size={13} style={{ color: 'var(--text-muted)' }} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
