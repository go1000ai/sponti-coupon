import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';

interface SceneTransitionProps {
  startFrame: number;
  duration?: number;
  color?: string;
}

export const SceneTransition: React.FC<SceneTransitionProps> = ({
  startFrame,
  duration = 15,
  color = '#E8632B',
}) => {
  const frame = useCurrentFrame();

  if (frame < startFrame || frame > startFrame + duration) return null;

  const progress = interpolate(frame, [startFrame, startFrame + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const scaleX = interpolate(progress, [0, 0.5, 1], [0, 1, 0]);

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: color,
        transformOrigin: progress < 0.5 ? 'left' : 'right',
        transform: `scaleX(${scaleX})`,
        zIndex: 100,
      }}
    />
  );
};
