import React from 'react';
import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';

interface BrandLogoProps {
  startFrame: number;
  size?: number;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ startFrame, size = 120 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 10, stiffness: 80 },
  });

  const opacity = interpolate(frame - startFrame, [0, 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  if (frame < startFrame) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        opacity,
        transform: `scale(${scale})`,
      }}
    >
      {/* Sponti Orange circle logo mark */}
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #E8632B, #FF8C42)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 32px rgba(232, 99, 43, 0.4)',
        }}
      >
        <span
          style={{
            color: '#FFFFFF',
            fontSize: size * 0.45,
            fontWeight: '900',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          S
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span
          style={{
            color: '#FFFFFF',
            fontSize: size * 0.5,
            fontWeight: '800',
            fontFamily: 'Inter, sans-serif',
            letterSpacing: '-1px',
          }}
        >
          Sponti<span style={{ color: '#E8632B' }}>Coupon</span>
        </span>
        <span
          style={{
            color: 'rgba(255,255,255,0.6)',
            fontSize: size * 0.18,
            fontFamily: 'Inter, sans-serif',
            letterSpacing: '2px',
            textTransform: 'uppercase',
          }}
        >
          Local Deals, Real Savings
        </span>
      </div>
    </div>
  );
};
