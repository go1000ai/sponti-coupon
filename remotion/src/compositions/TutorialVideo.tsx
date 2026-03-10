import React from 'react';
import { AbsoluteFill, Sequence, OffthreadVideo } from 'remotion';
import { AnimatedText } from '../components/AnimatedText';
import { BrandLogo } from '../components/BrandLogo';
import { FeaturePoint } from '../components/FeaturePoint';
import { SceneTransition } from '../components/SceneTransition';

interface TutorialVideoProps {
  avatarVideoUrl: string;
}

// Placeholder — will be built out with dashboard screenshots/mockups
const TitleCard: React.FC<{ title: string; subtitle: string; step?: string }> = ({
  title,
  subtitle,
  step,
}) => {
  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #0a0a0a, #1a0e08)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
      }}
    >
      {step && (
        <AnimatedText
          text={step}
          startFrame={5}
          fontSize={20}
          color="#E8632B"
          fontWeight="800"
          style={{ letterSpacing: 3, textTransform: 'uppercase' }}
        />
      )}
      <AnimatedText
        text={title}
        startFrame={10}
        fontSize={52}
        color="#FFFFFF"
        fontWeight="800"
        style={{ textAlign: 'center', maxWidth: 900 }}
      />
      <AnimatedText
        text={subtitle}
        startFrame={25}
        fontSize={24}
        color="rgba(255,255,255,0.6)"
        style={{ textAlign: 'center', maxWidth: 700 }}
      />
    </AbsoluteFill>
  );
};

export const TutorialVideo: React.FC<TutorialVideoProps> = ({ avatarVideoUrl }) => {
  // Scene timing at 30fps
  const SCENES = {
    intro: { start: 0, duration: 120 },
    step1: { start: 120, duration: 240 },   // Creating a deal
    step2: { start: 360, duration: 210 },   // Setting up payments
    step3: { start: 570, duration: 210 },   // Customer claims
    step4: { start: 780, duration: 210 },   // Scanning & redeeming
    step5: { start: 990, duration: 180 },   // Analytics & reviews
    outro: { start: 1170, duration: 120 },  // CTA
  };

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <Sequence from={SCENES.intro.start} durationInFrames={SCENES.intro.duration}>
        <AbsoluteFill
          style={{
            background: 'radial-gradient(ellipse at 30% 50%, #1a1008 0%, #0a0a0a 60%, #000 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 30,
          }}
        >
          <BrandLogo startFrame={10} size={120} />
          <AnimatedText
            text="Vendor Dashboard Tutorial"
            startFrame={25}
            fontSize={52}
            color="#FFFFFF"
            fontWeight="800"
            style={{ textAlign: 'center' }}
          />
          <AnimatedText
            text="Everything you need to know in under 2 minutes"
            startFrame={45}
            fontSize={24}
            color="rgba(255,255,255,0.6)"
            style={{ textAlign: 'center' }}
          />
        </AbsoluteFill>
      </Sequence>

      <Sequence from={SCENES.step1.start} durationInFrames={SCENES.step1.duration}>
        <TitleCard
          step="Step 1"
          title="Create Your First Deal"
          subtitle="Choose Sponti (flash) or Steady (ongoing), set your discount, upload a photo, and publish in minutes."
        />
      </Sequence>

      <Sequence from={SCENES.step2.start} durationInFrames={SCENES.step2.duration}>
        <TitleCard
          step="Step 2"
          title="Set Up Your Payments"
          subtitle="Connect Stripe or PayPal for online deposits. Add Venmo, Zelle, or Cash App for in-person payments."
        />
      </Sequence>

      <Sequence from={SCENES.step3.start} durationInFrames={SCENES.step3.duration}>
        <TitleCard
          step="Step 3"
          title="Customers Claim & Pay"
          subtitle="Customers find your deal, claim it, and pay the deposit directly to your connected account. No middleman."
        />
      </Sequence>

      <Sequence from={SCENES.step4.start} durationInFrames={SCENES.step4.duration}>
        <TitleCard
          step="Step 4"
          title="Scan & Redeem"
          subtitle="When the customer arrives, scan their QR code or enter their 6-digit code. Collect any remaining balance."
        />
      </Sequence>

      <Sequence from={SCENES.step5.start} durationInFrames={SCENES.step5.duration}>
        <TitleCard
          step="Step 5"
          title="Track Your Results"
          subtitle="See real-time analytics — claims, redemptions, revenue, and customer reviews — all from your dashboard."
        />
      </Sequence>

      <Sequence from={SCENES.outro.start} durationInFrames={SCENES.outro.duration}>
        <AbsoluteFill
          style={{
            background: 'radial-gradient(ellipse at 50% 50%, #1a0e08 0%, #0a0a0a 60%, #000 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 30,
          }}
        >
          <BrandLogo startFrame={5} size={100} />
          <AnimatedText
            text="Start Growing Your Business Today"
            startFrame={15}
            fontSize={48}
            color="#FFFFFF"
            fontWeight="800"
            style={{ textAlign: 'center' }}
          />
          <AnimatedText
            text="sponticoupon.com"
            startFrame={30}
            fontSize={32}
            color="#E8632B"
            fontWeight="700"
            style={{ textAlign: 'center' }}
          />
        </AbsoluteFill>
      </Sequence>

      {/* Avatar overlay */}
      {avatarVideoUrl && (
        <Sequence from={0} durationInFrames={SCENES.outro.start + SCENES.outro.duration}>
          <div
            style={{
              position: 'absolute',
              bottom: 40,
              right: 40,
              width: 320,
              height: 320,
              borderRadius: 24,
              overflow: 'hidden',
              border: '3px solid rgba(232,99,43,0.4)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
            }}
          >
            <OffthreadVideo
              src={avatarVideoUrl}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        </Sequence>
      )}

      {/* Transitions */}
      <SceneTransition startFrame={SCENES.step1.start - 8} />
      <SceneTransition startFrame={SCENES.step2.start - 8} />
      <SceneTransition startFrame={SCENES.step3.start - 8} />
      <SceneTransition startFrame={SCENES.step4.start - 8} />
      <SceneTransition startFrame={SCENES.step5.start - 8} />
      <SceneTransition startFrame={SCENES.outro.start - 8} />
    </AbsoluteFill>
  );
};
