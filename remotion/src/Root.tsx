import React from 'react';
import { Composition } from 'remotion';
import { ExplainerVideo } from './compositions/ExplainerVideo';
import { TutorialVideo } from './compositions/TutorialVideo';
import { OnboardingVideo } from './compositions/OnboardingVideo';
import { DemoVideo } from './compositions/DemoVideo';
import {
  CustomerRedemptionTutorial,
  CUSTOMER_REDEMPTION_FRAMES,
} from './compositions/CustomerRedemptionTutorial';
import {
  LoyaltyProgramTutorial,
  LOYALTY_PROGRAM_FRAMES,
} from './compositions/LoyaltyProgramTutorial';
import {
  CustomerHowItWorks,
  CUSTOMER_HOWITWORKS_FRAMES,
} from './compositions/CustomerHowItWorks';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ExplainerVideo"
        component={ExplainerVideo as unknown as React.ComponentType<Record<string, unknown>>}
        durationInFrames={30 * 116}
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
        durationInFrames={30 * 230}
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
        durationInFrames={30 * 74}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="DemoVideo"
        component={DemoVideo as unknown as React.ComponentType<Record<string, unknown>>}
        durationInFrames={30 * 206}
        fps={30}
        width={1920}
        height={1080}
      />
      {/* ── New: customer payment + redemption walkthrough ───────────────── */}
      <Composition
        id="CustomerRedemptionTutorial"
        component={CustomerRedemptionTutorial as unknown as React.ComponentType<Record<string, unknown>>}
        durationInFrames={CUSTOMER_REDEMPTION_FRAMES}
        fps={30}
        width={1920}
        height={1080}
      />
      {/* ── New: loyalty program walkthrough ─────────────────────────────── */}
      <Composition
        id="LoyaltyProgramTutorial"
        component={LoyaltyProgramTutorial as unknown as React.ComponentType<Record<string, unknown>>}
        durationInFrames={LOYALTY_PROGRAM_FRAMES}
        fps={30}
        width={1920}
        height={1080}
      />
      {/* ── New: customer-facing "How It Works" explainer ────────────────────── */}
      {/* Vertical 9:16 for mobile */}
      <Composition
        id="CustomerHowItWorks"
        component={CustomerHowItWorks as unknown as React.ComponentType<Record<string, unknown>>}
        durationInFrames={CUSTOMER_HOWITWORKS_FRAMES}
        fps={30}
        width={1080}
        height={1920}
      />
      {/* Horizontal 16:9 for desktop — same composition, orientation-aware layout */}
      <Composition
        id="CustomerHowItWorksWide"
        component={CustomerHowItWorks as unknown as React.ComponentType<Record<string, unknown>>}
        durationInFrames={CUSTOMER_HOWITWORKS_FRAMES}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
