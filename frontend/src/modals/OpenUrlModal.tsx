import React, { useState } from 'react';
import { X, Globe, Play } from 'lucide-react';
import { usePlayerStore } from '../stores/playerStore';

export const OpenUrlModal: React.FC = () => {
  const { openUrl, setActiveModal } = usePlayerStore();
  const [url, setUrl] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    await openUrl(url.trim());
    setActiveModal(null);
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '500px',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Globe size={18} style={{ color: 'var(--accent)' }} />
          <span style={{ fontSize: '15px', fontWeight: 700 }}>Open Network Stream</span>
        </div>

        <button
          className="glass-btn glass-btn-icon"
          style={{ width: '30px', height: '30px' }}
          onClick={() => setActiveModal(null)}
        >
          <X size={16} />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
          Enter any direct media URL or streaming link (HLS .m3u8, DASH .mpd, HTTP, RTMP):
        </p>

        <input
          type="url"
          required
          autoFocus
          className="glass-input"
          placeholder="https://example.com/stream/index.m3u8"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button
            type="button"
            className="glass-btn"
            onClick={() => setActiveModal(null)}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="glass-btn glass-btn-primary"
            style={{ gap: '6px' }}
          >
            <Play size={14} />
            <span>Play Stream</span>
          </button>
        </div>
      </form>
    </div>
  );
};
