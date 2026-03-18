import React from 'react';
import { Composition } from 'remotion';
import { ExplainerVideo } from './compositions/ExplainerVideo';
import { TutorialVideo } from './compositions/TutorialVideo';
import { OnboardingVideo } from './compositions/OnboardingVideo';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ExplainerVideo"
        component={ExplainerVideo as unknown as React.ComponentType<Record<string, unknown>>}
        durationInFrames={30 * 116} // ~116 seconds — matched to Rachel voiceover audio
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          avatarVideoUrl: '',
        }}
      />
      <Composition
        id="TutorialVideo"
        component={TutorialVideo as unknown as React.ComponentType<Record<string, unknown>>}
        durationInFrames={30 * 230} // ~230 seconds — matched to voiceover audio
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          avatarVideoUrl: '',
        }}
      />
      <Composition
        id="OnboardingVideo"
        component={OnboardingVideo as unknown as React.ComponentType<Record<string, unknown>>}
        durationInFrames={30 * 74} // ~74 seconds — quick action-oriented onboarding
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
