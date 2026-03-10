import React from 'react';
import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';

interface AnimatedTextProps {
  text: string;
  startFrame: number;
  fontSize?: number;
  color?: string;
  fontWeight?: string;
  style?: React.CSSProperties;
}

export const AnimatedText: React.FC<AnimatedTextProps> = ({
  text,
  startFrame,
  fontSize = 48,
  color = '#FFFFFF',
  fontWeight = '700',
  style = {},
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const translateY = interpolate(progress, [0, 1], [30, 0]);

  if (frame < startFrame) return null;

  return (
    <div
      style={{
        fontSize,
        color,
        fontWeight,
        fontFamily: 'Inter, sans-serif',
        opacity,
        transform: `translateY(${translateY}px)`,
        ...style,
      }}
    >
      {text}
    </div>
  );
};
