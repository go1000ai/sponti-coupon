import React from 'react';
import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';

interface DealCardProps {
  title: string;
  discount: string;
  type: 'sponti' | 'steady';
  startFrame: number;
  position?: { x: number; y: number };
}

export const DealCard: React.FC<DealCardProps> = ({
  title,
  discount,
  type,
  startFrame,
  position = { x: 0, y: 0 },
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 12, stiffness: 80 },
  });

  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const translateX = interpolate(progress, [0, 1], [60, 0]);

  if (frame < startFrame) return null;

  const color = type === 'sponti' ? '#E8632B' : '#29ABE2';
  const label = type === 'sponti' ? 'SPONTI DEAL' : 'STEADY DEAL';
  const bgGradient =
    type === 'sponti'
      ? 'linear-gradient(135deg, #1a1a1a, #2a1a14)'
      : 'linear-gradient(135deg, #1a1a1a, #142028)';

  return (
    <div
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        opacity,
        transform: `translateX(${translateX}px)`,
      }}
    >
      <div
        style={{
          width: 380,
          background: bgGradient,
          borderRadius: 20,
          border: `2px solid ${color}33`,
          padding: 28,
          boxShadow: `0 12px 40px ${color}22`,
        }}
      >
        {/* Badge */}
        <div
          style={{
            display: 'inline-flex',
            background: color,
            color: '#FFF',
            fontSize: 13,
            fontWeight: '800',
            padding: '5px 14px',
            borderRadius: 20,
            fontFamily: 'Inter, sans-serif',
            letterSpacing: '1px',
            marginBottom: 14,
          }}
        >
          {label}
        </div>

        {/* Title */}
        <div
          style={{
            color: '#FFFFFF',
            fontSize: 22,
            fontWeight: '700',
            fontFamily: 'Inter, sans-serif',
            marginBottom: 8,
          }}
        >
          {title}
        </div>

        {/* Discount */}
        <div
          style={{
            color,
            fontSize: 42,
            fontWeight: '900',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {discount}
        </div>

        {/* Timer for Sponti */}
        {type === 'sponti' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 12,
              color: 'rgba(255,255,255,0.5)',
              fontSize: 15,
              fontFamily: 'Inter, sans-serif',
            }}
          >
            <span style={{ color: '#E8632B' }}>⏱</span> Expires in 23h 45m
          </div>
        )}
      </div>
    </div>
  );
};
