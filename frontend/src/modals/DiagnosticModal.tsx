import React, { useEffect } from 'react';
import { X, Cpu, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import { usePlayerStore } from '../stores/playerStore';

export const DiagnosticModal: React.FC = () => {
  const { diagnostics, fetchDiagnostics, setActiveModal } = usePlayerStore();

  useEffect(() => {
    fetchDiagnostics();
    const interval = setInterval(() => {
      fetchDiagnostics();
    }, 1000);
    return () => clearInterval(interval);
  }, [fetchDiagnostics]);

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '580px',
        maxHeight: '85vh',
        zIndex: 110,
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
          <Cpu size={18} style={{ color: 'var(--accent-light)' }} />
          <span style={{ fontSize: '15px', fontWeight: 700 }}>libmpv Engine Diagnostics</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className="glass-btn glass-btn-icon"
            style={{ width: '30px', height: '30px' }}
            onClick={() => fetchDiagnostics()}
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
          <button
            className="glass-btn glass-btn-icon"
            style={{ width: '30px', height: '30px' }}
            onClick={() => setActiveModal(null)}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div
        style={{
          padding: '20px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        {/* Dynamic Library Status */}
        <div
          className="glass-card"
          style={{
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderColor: 'rgba(16, 185, 129, 0.4)',
            background: 'rgba(16, 185, 129, 0.1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle size={18} style={{ color: '#10b981' }} />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#10b981' }}>
                libmpv-2.dll Loaded & Operational
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {diagnostics?.mpv_version || 'Loading version...'}
              </div>
            </div>
          </div>
          <span
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '6px',
              background: '#10b981',
              color: '#000',
              fontWeight: 700,
            }}
          >
            NATIVE FFI
          </span>
        </div>

        {/* Pipeline & Graphics Configuration */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
          <div className="glass-card" style={{ padding: '10px 12px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Video Output (VO)</span>
            <div style={{ fontSize: '13px', fontWeight: 600, marginTop: '2px' }}>
              {diagnostics?.active_vo || 'gpu-next'}
            </div>
          </div>

          <div className="glass-card" style={{ padding: '10px 12px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>GPU Context</span>
            <div style={{ fontSize: '13px', fontWeight: 600, marginTop: '2px' }}>
              {diagnostics?.active_gpu_context || 'd3d11'}
            </div>
          </div>

          <div className="glass-card" style={{ padding: '10px 12px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Hardware Decoder</span>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 600,
                marginTop: '2px',
                color:
                  diagnostics?.hwdec_current && diagnostics.hwdec_current !== 'no'
                    ? 'var(--accent-light)'
                    : 'var(--text-secondary)',
              }}
            >
              {diagnostics?.hwdec_current || 'no'}
            </div>
          </div>
        </div>

        {/* Current Media File */}
        <div className="glass-card" style={{ padding: '12px 14px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Active Media File</span>
          <div
            style={{
              fontSize: '12px',
              fontWeight: 500,
              marginTop: '4px',
              wordBreak: 'break-all',
              color: diagnostics?.current_file ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
          >
            {diagnostics?.current_file || 'No media currently loaded'}
          </div>
        </div>

        {/* Audio Track Diagnostics */}
        <div className="glass-card" style={{ padding: '12px 14px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Current Audio Stream</span>
          {diagnostics?.current_audio_track ? (
            <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600 }}>
                Track #{diagnostics.current_audio_track.id}:{' '}
                {diagnostics.current_audio_track.title || 'Untitled'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Codec: <b>{diagnostics.current_audio_track.codec?.toUpperCase() || 'UNKNOWN'}</b> |
                Lang: <b>{diagnostics.current_audio_track.lang || 'und'}</b> | Channels:{' '}
                <b>{diagnostics.current_audio_track.audio_channels || 2}ch</b>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              None or Muted
            </div>
          )}
        </div>

        {/* Subtitle Track Diagnostics */}
        <div className="glass-card" style={{ padding: '12px 14px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Current Subtitle Stream
          </span>
          {diagnostics?.current_sub_track ? (
            <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600 }}>
                Track #{diagnostics.current_sub_track.id}:{' '}
                {diagnostics.current_sub_track.title || 'Untitled'}
                {diagnostics.current_sub_track.is_external && (
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
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Format: <b>{diagnostics.current_sub_track.codec?.toUpperCase() || 'UNKNOWN'}</b> |
                Lang: <b>{diagnostics.current_sub_track.lang || 'und'}</b>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Disabled (No subtitles rendering)
            </div>
          )}
        </div>

        {/* Recent Error / Warning */}
        {diagnostics?.recent_error && (
          <div
            className="glass-card"
            style={{
              padding: '12px 14px',
              borderColor: 'rgba(239, 68, 68, 0.4)',
              background: 'rgba(239, 68, 68, 0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <AlertTriangle size={18} style={{ color: '#ef4444' }} />
            <div style={{ fontSize: '12px', color: '#fca5a5' }}>
              {diagnostics.recent_error}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
