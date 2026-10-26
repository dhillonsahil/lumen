import React, { useEffect, useState } from 'react';
import {
  X,
  Shuffle,
  Repeat,
  Repeat1,
  Trash2,
  FileDown,
  FileUp,
  Play,
  Music,
  Plus,
  ChevronUp,
  ChevronDown,
  GripVertical,
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { usePlayerStore } from '../stores/playerStore';
import { pickPlaylistFile, savePlaylistFileDialog, pickMediaFiles } from '../utils/filePicker';

export const PlaylistDrawer: React.FC = () => {
  const {
    playlist,
    playPlaylistItem,
    removePlaylistItem,
    reorderPlaylistItem,
    addToPlaylist,
    clearPlaylist,
    setShuffle,
    setRepeat,
    fetchPlaylist,
    activeDrawer,
    setActiveDrawer,
  } = usePlayerStore();

  useEffect(() => {
    if (activeDrawer === 'playlist') {
      fetchPlaylist();
    }
  }, [activeDrawer, fetchPlaylist]);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  if (activeDrawer !== 'playlist') return null;

  const handleItemDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleItemDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleItemDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedIndex !== null && draggedIndex !== targetIndex) {
      await reorderPlaylistItem(draggedIndex, targetIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleItemDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleAddFiles = async () => {
    try {
      const paths = await pickMediaFiles();
      if (paths.length > 0) {
        await addToPlaylist(paths);
      }
    } catch (e) {
      console.error('Failed to add files to playlist', e);
    }
  };

  const handleImport = async () => {
    try {
      const selected = await pickPlaylistFile();
      if (selected) {
        await invoke('import_playlist', { path: selected });
        await fetchPlaylist();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleExport = async (format: string) => {
    try {
      const selected = await savePlaylistFileDialog();
      if (selected) {
        await invoke('export_playlist', { path: selected, format });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const cycleRepeat = () => {
    if (playlist.repeat_mode === 'off') setRepeat('all');
    else if (playlist.repeat_mode === 'all') setRepeat('one');
    else setRepeat('off');
  };

  const formatDuration = (secs: number) => {
    if (!secs || secs <= 0) return '';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: '400px',
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
          padding: '18px 20px',
          borderBottom: '1px solid var(--glass-border-subtle)',
        }}
      >
        <span style={{ fontSize: '15px', fontWeight: 700 }}>
          Queue ({playlist.items.length})
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Add media */}
          <button
            className="glass-btn glass-btn-icon"
            style={{ width: '30px', height: '30px' }}
            onClick={handleAddFiles}
            title="Add Files to Queue"
          >
            <Plus size={15} />
          </button>

          {/* Shuffle */}
          <button
            className={`glass-btn glass-btn-icon ${playlist.shuffle ? 'active' : ''}`}
            style={{ width: '30px', height: '30px' }}
            onClick={() => setShuffle(!playlist.shuffle)}
            title="Toggle Shuffle"
          >
            <Shuffle size={14} />
          </button>

          {/* Repeat */}
          <button
            className={`glass-btn glass-btn-icon ${
              playlist.repeat_mode !== 'off' ? 'active' : ''
            }`}
            style={{ width: '30px', height: '30px' }}
            onClick={cycleRepeat}
            title={`Repeat: ${playlist.repeat_mode}`}
          >
            {playlist.repeat_mode === 'one' ? <Repeat1 size={14} /> : <Repeat size={14} />}
          </button>

          {/* Clear */}
          <button
            className="glass-btn glass-btn-icon"
            style={{ width: '30px', height: '30px' }}
            onClick={clearPlaylist}
            title="Clear Queue"
          >
            <Trash2 size={14} />
          </button>

          {/* Close */}
          <button
            className="glass-btn glass-btn-icon"
            style={{ width: '30px', height: '30px', marginLeft: '6px' }}
            onClick={() => setActiveDrawer(null)}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Import / Export toolbar */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          padding: '10px 20px',
          borderBottom: '1px solid var(--glass-border-subtle)',
        }}
      >
        <button
          className="glass-btn"
          style={{ flex: 1, padding: '5px', fontSize: '11px', gap: '4px' }}
          onClick={handleImport}
          title="Import M3U, PLS, or XSPF playlist"
        >
          <FileUp size={12} />
          <span>Import</span>
        </button>
        <button
          className="glass-btn"
          style={{ flex: 1, padding: '5px', fontSize: '11px', gap: '4px' }}
          onClick={() => handleExport('m3u8')}
        >
          <FileDown size={12} />
          <span>M3U</span>
        </button>
        <button
          className="glass-btn"
          style={{ flex: 1, padding: '5px', fontSize: '11px', gap: '4px' }}
          onClick={() => handleExport('pls')}
        >
          <FileDown size={12} />
          <span>PLS</span>
        </button>
        <button
          className="glass-btn"
          style={{ flex: 1, padding: '5px', fontSize: '11px', gap: '4px' }}
          onClick={() => handleExport('xspf')}
        >
          <FileDown size={12} />
          <span>XSPF</span>
        </button>
      </div>

      {/* Playlist Items */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        {playlist.items.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--text-muted)',
              gap: '10px',
            }}
          >
            <Music size={32} />
            <span style={{ fontSize: '13px' }}>Queue is empty</span>
            <button
              className="glass-btn glass-btn-primary"
              style={{ fontSize: '12px', padding: '6px 14px', marginTop: '6px' }}
              onClick={handleAddFiles}
            >
              Add Files...
            </button>
          </div>
        ) : (
          playlist.items.map((item, idx) => {
            const isCurrent = playlist.current_index === idx;
            const isDragging = draggedIndex === idx;
            const isOverAbove = dragOverIndex === idx && draggedIndex !== null && draggedIndex > idx;
            const isOverBelow = dragOverIndex === idx && draggedIndex !== null && draggedIndex < idx;

            return (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleItemDragStart(e, idx)}
                onDragOver={(e) => handleItemDragOver(e, idx)}
                onDragEnd={handleItemDragEnd}
                onDrop={(e) => handleItemDrop(e, idx)}
                className="glass-card"
                style={{
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'grab',
                  opacity: isDragging ? 0.35 : 1,
                  borderTop: isOverAbove ? '2px solid var(--accent)' : undefined,
                  borderBottom: isOverBelow ? '2px solid var(--accent)' : undefined,
                  borderColor: isCurrent ? 'var(--accent)' : 'var(--glass-border-subtle)',
                  background: isCurrent ? 'rgba(99, 102, 241, 0.22)' : undefined,
                  transition: 'opacity 0.15s ease, border-color 0.15s ease',
                }}
                onClick={() => playPlaylistItem(idx)}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    minWidth: 0,
                    flex: 1,
                  }}
                >
                  {/* Drag Handle Grip */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      color: 'var(--text-muted)',
                      cursor: 'grab',
                      padding: '2px',
                    }}
                    title="Drag to reorder"
                  >
                    <GripVertical size={13} />
                  </div>

                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: isCurrent ? 'var(--accent-light)' : 'var(--text-muted)',
                      width: '18px',
                    }}
                  >
                    {idx + 1}
                  </span>

                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: isCurrent ? 700 : 500,
                        color: isCurrent ? '#fff' : 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {item.title}
                    </span>
                    {item.duration > 0 && (
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        {formatDuration(item.duration)}
                      </span>
                    )}
                  </div>
                </div>

                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Reorder Up */}
                  {idx > 0 && (
                    <button
                      className="glass-btn glass-btn-icon"
                      style={{ width: '22px', height: '22px', padding: 0 }}
                      onClick={() => reorderPlaylistItem(idx, idx - 1)}
                      title="Move Up"
                    >
                      <ChevronUp size={12} />
                    </button>
                  )}

                  {/* Reorder Down */}
                  {idx < playlist.items.length - 1 && (
                    <button
                      className="glass-btn glass-btn-icon"
                      style={{ width: '22px', height: '22px', padding: 0 }}
                      onClick={() => reorderPlaylistItem(idx, idx + 1)}
                      title="Move Down"
                    >
                      <ChevronDown size={12} />
                    </button>
                  )}

                  {isCurrent && <Play size={13} style={{ color: 'var(--accent)', margin: '0 4px' }} />}

                  {/* Remove */}
                  <button
                    className="glass-btn glass-btn-icon"
                    style={{
                      width: '24px',
                      height: '24px',
                      background: 'transparent',
                      border: 'none',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      removePlaylistItem(idx);
                    }}
                    title="Remove from queue"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
