import React from 'react';
import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';

interface FeaturePointProps {
  icon: string;
  title: string;
  description: string;
  startFrame: number;
  index: number;
}

export const FeaturePoint: React.FC<FeaturePointProps> = ({
  icon,
  title,
  description,
  startFrame,
  index,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const delay = startFrame + index * 15;

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const translateX = interpolate(progress, [0, 1], [-40, 0]);

  if (frame < delay) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 20,
        opacity,
        transform: `translateX(${translateX}px)`,
        marginBottom: 28,
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          background: 'linear-gradient(135deg, #E8632B, #FF8C42)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div
          style={{
            color: '#FFFFFF',
            fontSize: 26,
            fontWeight: '700',
            fontFamily: 'Inter, sans-serif',
            marginBottom: 4,
          }}
        >
          {title}
        </div>
        <div
          style={{
            color: 'rgba(255,255,255,0.6)',
            fontSize: 18,
            fontFamily: 'Inter, sans-serif',
            lineHeight: 1.4,
          }}
        >
          {description}
        </div>
      </div>
    </div>
  );
};
