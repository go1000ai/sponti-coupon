import React from 'react';
import { Composition } from 'remotion';
import { ExplainerVideo } from './compositions/ExplainerVideo';
import { TutorialVideo } from './compositions/TutorialVideo';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ExplainerVideo"
        component={ExplainerVideo as unknown as React.ComponentType<Record<string, unknown>>}
        durationInFrames={30 * 90} // ~90 seconds at 30fps
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          avatarVideoUrl: '',
        }}
      />
      <Composition
        id="TutorialVideo"
        component={TutorialVideo as unknown as React.ComponentType<Record<string, unknown>>}
        durationInFrames={30 * 120} // ~2 minutes
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          avatarVideoUrl: '',
        }}
      />
    </>
  );
};
