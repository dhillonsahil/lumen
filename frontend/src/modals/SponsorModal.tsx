import React, { useState } from 'react';
import {
  X,
  Heart,
  Coffee,
  ExternalLink,
  Copy,
  Check,
  Star,
  Sparkles,
} from 'lucide-react';
import { usePlayerStore } from '../stores/playerStore';

const GithubIcon: React.FC<{ size?: number; color?: string }> = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

export const SponsorModal: React.FC = () => {
  const { setActiveModal, openExternalUrl } = usePlayerStore();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const sponsorsList = [
    {
      id: 'bmac',
      title: 'Buy Me a Coffee',
      handle: 'isahildhillon',
      url: 'https://buymeacoffee.com/isahildhillon',
      description: 'Support with a one-time coffee or monthly membership.',
      icon: <Coffee size={20} color="#ffdd00" />,
      badge: 'Popular',
      color: '#ffdd00',
    },
    {
      id: 'github',
      title: 'GitHub Sponsors',
      handle: 'dhillonsahil',
      url: 'https://github.com/sponsors/dhillonsahil',
      description: 'Sponsor directly via GitHub with recurring or one-time tiers.',
      icon: <Heart size={20} color="#ec4899" fill="rgba(236,72,153,0.3)" />,
      badge: 'Official',
      color: '#ec4899',
    },
    {
      id: 'kofi',
      title: 'Ko-fi',
      handle: 'dhillonsahil',
      url: 'https://ko-fi.com/dhillonsahil',
      description: 'Support development with 0% platform transaction fees.',
      icon: <Sparkles size={20} color="#00b9fe" />,
      badge: '0% Fees',
      color: '#00b9fe',
    },
    {
      id: 'repo',
      title: 'Star on GitHub',
      handle: 'dhillonsahil/lumen',
      url: 'https://github.com/dhillonsahil/lumen',
      description: 'Star the repository, open issues, and share with the community.',
      icon: <GithubIcon size={20} color="#ffffff" />,
      badge: 'Free',
      color: '#ffffff',
    },
  ];

  const handleCopy = (key: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '580px',
        maxWidth: '92vw',
        maxHeight: '90vh',
        zIndex: 110,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 25px 70px rgba(0, 0, 0, 0.85)',
      }}
      className="glass-panel"
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 24px',
          borderBottom: '1px solid var(--glass-border-subtle)',
          background: 'rgba(236, 72, 153, 0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px rgba(236, 72, 153, 0.5)',
            }}
          >
            <Heart size={18} color="#fff" fill="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.3px' }}>
              Support Lumen Development
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              100% Free & Open Source native media player
            </div>
          </div>
        </div>

        <button
          className="glass-btn glass-btn-icon"
          style={{ width: '32px', height: '32px' }}
          onClick={() => setActiveModal(null)}
          title="Close"
        >
          <X size={16} />
        </button>
      </div>

      {/* Body */}
      <div
        style={{
          padding: '22px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          overflowY: 'auto',
        }}
      >
        <p
          style={{
            fontSize: '13px',
            color: 'var(--text-secondary)',
            lineHeight: '1.6',
            margin: 0,
          }}
        >
          Lumen is crafted with care by independent developers who believe in high-performance,
          native desktop software without bloat. Your contribution directly funds ongoing
          maintenance, hardware decoding enhancements, and new playback features!
        </p>

        {/* Sponsor Cards List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {sponsorsList.map((item) => (
            <div
              key={item.id}
              className="glass-card"
              style={{
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '14px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--glass-border-subtle)',
                borderRadius: '10px',
                transition: 'border-color 0.2s ease, background 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {item.icon}
                </div>

                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>
                      {item.title}
                    </span>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        color: item.color,
                        border: `1px solid ${item.color}40`,
                      }}
                    >
                      {item.badge}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'var(--text-muted)',
                      lineHeight: '1.4',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.description}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                <button
                  className="glass-btn glass-btn-icon"
                  style={{ width: '32px', height: '32px' }}
                  onClick={() => handleCopy(item.id, item.url)}
                  title="Copy Link"
                >
                  {copiedKey === item.id ? (
                    <Check size={14} color="#10b981" />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>

                <button
                  className="glass-btn glass-btn-primary"
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    gap: '6px',
                    background:
                      item.id === 'github'
                        ? 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)'
                        : undefined,
                  }}
                  onClick={() => openExternalUrl(item.url)}
                >
                  <span>Open</span>
                  <ExternalLink size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Note */}
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '8px',
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            fontSize: '12px',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Star size={16} color="var(--accent)" style={{ flexShrink: 0 }} />
          <span>
            Every star, coffee, and sponsorship helps keep Lumen completely open, fast, and
            independent. Thank you!
          </span>
        </div>
      </div>
    </div>
  );
};
