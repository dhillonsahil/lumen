import React from 'react';
import { X, RotateCcw, Power } from 'lucide-react';
import { usePlayerStore } from '../stores/playerStore';

export const EqualizerModal: React.FC = () => {
  const { equalizer, setEqualizer, setActiveModal } = usePlayerStore();

  const bandLabels = [
    '31Hz',
    '62Hz',
    '125Hz',
    '250Hz',
    '500Hz',
    '1kHz',
    '2kHz',
    '4kHz',
    '8kHz',
    '16kHz',
  ];

  const presets: Record<string, [number, number, number, number, number, number, number, number, number, number]> = {
    Flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    'Bass Boost': [6.0, 5.0, 4.0, 2.0, 0, 0, 0, 0, 0, 0],
    'Vocal Boost': [-2.0, -1.0, 0, 2.0, 4.5, 4.5, 3.0, 1.0, 0, -1.0],
    Rock: [4.5, 3.0, 1.5, 0, -1.0, -0.5, 1.5, 3.0, 4.0, 4.5],
    Pop: [-1.0, 1.0, 3.0, 4.0, 3.5, 1.5, 0, -1.0, 1.5, 2.0],
    Jazz: [3.0, 2.0, 0, 1.5, -1.5, -1.5, 0, 1.5, 3.0, 3.5],
    Classical: [4.0, 3.0, 2.5, 2.0, -1.0, -1.0, 0, 2.0, 3.0, 3.5],
  };

  const handleBandChange = (index: number, val: number) => {
    const newBands = [...equalizer.bands] as [
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
    ];
    newBands[index] = val;
    setEqualizer({ bands: newBands, preset: 'Custom' });
  };

  const handlePresetSelect = (name: string) => {
    const bands = presets[name];
    if (bands) {
      setEqualizer({ preset: name, bands: [...bands] });
    }
  };

  const handleReset = () => {
    setEqualizer({
      preset: 'Flat',
      bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    });
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '580px',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '15px', fontWeight: 700 }}>10-Band Equalizer</span>
          <button
            className={`glass-btn ${equalizer.enabled ? 'glass-btn-primary' : ''}`}
            style={{ padding: '3px 10px', fontSize: '11px', gap: '4px' }}
            onClick={() => setEqualizer({ enabled: !equalizer.enabled })}
          >
            <Power size={12} />
            <span>{equalizer.enabled ? 'ON' : 'BYPASS'}</span>
          </button>
        </div>

        <button
          className="glass-btn glass-btn-icon"
          style={{ width: '30px', height: '30px' }}
          onClick={() => setActiveModal(null)}
        >
          <X size={16} />
        </button>
      </div>

      {/* Preset bar */}
      <div
        style={{
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          overflowX: 'auto',
          borderBottom: '1px solid var(--glass-border-subtle)',
        }}
      >
        <div style={{ display: 'flex', gap: '6px' }}>
          {Object.keys(presets).map((p) => (
            <button
              key={p}
              className={`glass-btn ${equalizer.preset === p ? 'glass-btn-primary' : ''}`}
              style={{ padding: '4px 9px', fontSize: '11px' }}
              onClick={() => handlePresetSelect(p)}
            >
              {p}
            </button>
          ))}
        </div>

        <button
          className="glass-btn"
          style={{ padding: '4px 8px', fontSize: '11px' }}
          onClick={handleReset}
          title="Reset Flat"
        >
          <RotateCcw size={12} />
        </button>
      </div>

      {/* Sliders grid */}
      <div
        style={{
          padding: '24px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: '240px',
        }}
      >
        {equalizer.bands.map((bandVal, i) => (
          <div
            key={bandLabels[i]}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              height: '100%',
              justifyContent: 'space-between',
              width: '40px',
            }}
          >
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {bandVal > 0 ? `+${bandVal.toFixed(1)}` : bandVal.toFixed(1)}
            </span>

            {/* Vertical slider wrapper */}
            <div
              style={{
                height: '140px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <input
                type="range"
                min="-12"
                max="12"
                step="0.5"
                value={bandVal}
                onChange={(e) => handleBandChange(i, parseFloat(e.target.value))}
                style={{
                  transform: 'rotate(-90deg)',
                  width: '130px',
                  accentColor: 'var(--accent)',
                  cursor: 'pointer',
                }}
              />
            </div>

            <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)' }}>
              {bandLabels[i]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
