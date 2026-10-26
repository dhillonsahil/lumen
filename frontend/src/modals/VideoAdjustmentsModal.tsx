import React from 'react';
import { X, RotateCw, FlipHorizontal, FlipVertical, RotateCcw } from 'lucide-react';
import { usePlayerStore } from '../stores/playerStore';

export const VideoAdjustmentsModal: React.FC = () => {
  const { videoAdjustments, setVideoAdjustments, setActiveModal } = usePlayerStore();

  const aspectRatios = ['auto', '16:9', '4:3', '21:9', '1:1'];

  const handleReset = () => {
    setVideoAdjustments({
      brightness: 0,
      contrast: 0,
      saturation: 0,
      hue: 0,
      gamma: 0,
      rotation: 0,
      flip_h: false,
      flip_v: false,
      aspect_ratio: 'auto',
      zoom: 1.0,
      pan_x: 0,
      pan_y: 0,
      deinterlace: false,
    });
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '540px',
        maxHeight: '85vh',
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
        <span style={{ fontSize: '15px', fontWeight: 700 }}>Video & Color Controls</span>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="glass-btn"
            style={{ padding: '4px 10px', fontSize: '11px', gap: '4px' }}
            onClick={handleReset}
          >
            <RotateCcw size={12} />
            <span>Reset</span>
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
          padding: '16px 20px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {/* Aspect Ratio */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Aspect Ratio
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            {aspectRatios.map((r) => (
              <button
                key={r}
                className={`glass-btn ${videoAdjustments.aspect_ratio === r ? 'glass-btn-primary' : ''}`}
                style={{ flex: 1, padding: '6px', fontSize: '12px' }}
                onClick={() => setVideoAdjustments({ aspect_ratio: r })}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Geometry: Rotation, Flip, Deinterlace */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="glass-btn"
            style={{ flex: 1, padding: '8px', fontSize: '12px', gap: '6px' }}
            onClick={() =>
              setVideoAdjustments({
                rotation: ((videoAdjustments.rotation + 90) % 360) as 0 | 90 | 180 | 270,
              })
            }
          >
            <RotateCw size={14} />
            <span>Rotate ({videoAdjustments.rotation}°)</span>
          </button>

          <button
            className={`glass-btn ${videoAdjustments.flip_h ? 'glass-btn-primary' : ''}`}
            style={{ flex: 1, padding: '8px', fontSize: '12px', gap: '6px' }}
            onClick={() => setVideoAdjustments({ flip_h: !videoAdjustments.flip_h })}
          >
            <FlipHorizontal size={14} />
            <span>Flip H</span>
          </button>

          <button
            className={`glass-btn ${videoAdjustments.flip_v ? 'glass-btn-primary' : ''}`}
            style={{ flex: 1, padding: '8px', fontSize: '12px', gap: '6px' }}
            onClick={() => setVideoAdjustments({ flip_v: !videoAdjustments.flip_v })}
          >
            <FlipVertical size={14} />
            <span>Flip V</span>
          </button>

          <button
            className={`glass-btn ${videoAdjustments.deinterlace ? 'glass-btn-primary' : ''}`}
            style={{ flex: 1, padding: '8px', fontSize: '12px' }}
            onClick={() => setVideoAdjustments({ deinterlace: !videoAdjustments.deinterlace })}
          >
            <span>Deinterlace</span>
          </button>
        </div>

        {/* Zoom */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <span>Zoom</span>
            <span style={{ color: 'var(--accent-light)' }}>
              {videoAdjustments.zoom.toFixed(2)}x
            </span>
          </div>
          <input
            type="range"
            min="0.5"
            max="3.0"
            step="0.05"
            value={videoAdjustments.zoom}
            onChange={(e) => setVideoAdjustments({ zoom: parseFloat(e.target.value) })}
            style={{ accentColor: 'var(--accent)' }}
          />
        </div>

        {/* Color Sliders */}
        {[
          { label: 'Brightness', key: 'brightness', min: -100, max: 100, val: videoAdjustments.brightness },
          { label: 'Contrast', key: 'contrast', min: -100, max: 100, val: videoAdjustments.contrast },
          { label: 'Saturation', key: 'saturation', min: -100, max: 100, val: videoAdjustments.saturation },
          { label: 'Hue', key: 'hue', min: -100, max: 100, val: videoAdjustments.hue },
          { label: 'Gamma', key: 'gamma', min: -100, max: 100, val: videoAdjustments.gamma },
        ].map((item) => (
          <div key={item.key} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span>{item.label}</span>
              <span style={{ color: 'var(--accent-light)' }}>{item.val}</span>
            </div>
            <input
              type="range"
              min={item.min}
              max={item.max}
              step="1"
              value={item.val}
              onChange={(e) =>
                setVideoAdjustments({ [item.key]: parseInt(e.target.value, 10) })
              }
              style={{ accentColor: 'var(--accent)' }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
