import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
  OffthreadVideo,
  staticFile,
} from 'remotion';
import { AnimatedText } from '../components/AnimatedText';
import { BrandLogo } from '../components/BrandLogo';
import { DealCard } from '../components/DealCard';
import { FeaturePoint } from '../components/FeaturePoint';
import { SceneTransition } from '../components/SceneTransition';

interface ExplainerVideoProps {
  avatarVideoUrl: string;
}

// --- Scene Components ---

const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Subtle background pulse
  const pulse = Math.sin(frame * 0.03) * 0.02 + 1;

  return (
    <AbsoluteFill
      style={{
        background: 'radial-gradient(ellipse at 30% 50%, #1a1008 0%, #0a0a0a 60%, #000 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 40,
        transform: `scale(${pulse})`,
      }}
    >
      {/* Decorative glow */}
      <div
        style={{
          position: 'absolute',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(232,99,43,0.15) 0%, transparent 70%)',
          top: '20%',
          left: '30%',
        }}
      />

      <BrandLogo startFrame={10} size={140} />

      <AnimatedText
        text="The Smartest Way to Fill Empty Seats"
        startFrame={30}
        fontSize={52}
        color="#FFFFFF"
        fontWeight="800"
        style={{ textAlign: 'center', maxWidth: 900, lineHeight: 1.2 }}
      />

      <AnimatedText
        text="Local deals that bring customers through your door — today."
        startFrame={50}
        fontSize={26}
        color="rgba(255,255,255,0.6)"
        style={{ textAlign: 'center', maxWidth: 700 }}
      />
    </AbsoluteFill>
  );
};

const ProblemScene: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #0a0a0a, #111)',
        padding: 100,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <AnimatedText
        text="The Problem"
        startFrame={5}
        fontSize={22}
        color="#E8632B"
        fontWeight="800"
        style={{ letterSpacing: 3, textTransform: 'uppercase', marginBottom: 20 }}
      />

      <AnimatedText
        text="Empty tables. Open slots. Unsold inventory."
        startFrame={15}
        fontSize={52}
        color="#FFFFFF"
        fontWeight="800"
        style={{ lineHeight: 1.2, marginBottom: 40, maxWidth: 800 }}
      />

      <AnimatedText
        text="Local businesses lose thousands every week on unfilled capacity. Traditional advertising is expensive and slow. By the time customers see your ad, the moment has passed."
        startFrame={35}
        fontSize={24}
        color="rgba(255,255,255,0.6)"
        style={{ lineHeight: 1.6, maxWidth: 700 }}
      />
    </AbsoluteFill>
  );
};

const SolutionScene: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #0a0a0a, #1a0e08)',
        padding: 100,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      {/* Left side: text */}
      <div style={{ flex: 1, paddingRight: 60 }}>
        <AnimatedText
          text="The Solution"
          startFrame={5}
          fontSize={22}
          color="#E8632B"
          fontWeight="800"
          style={{ letterSpacing: 3, textTransform: 'uppercase', marginBottom: 20 }}
        />

        <AnimatedText
          text="Two deal types. One powerful platform."
          startFrame={15}
          fontSize={46}
          color="#FFFFFF"
          fontWeight="800"
          style={{ lineHeight: 1.2, marginBottom: 30 }}
        />

        <AnimatedText
          text="Sponti Deals — flash offers that expire in hours. Create urgency, fill seats now."
          startFrame={35}
          fontSize={22}
          color="rgba(255,255,255,0.7)"
          style={{ lineHeight: 1.5, marginBottom: 16 }}
        />

        <AnimatedText
          text="Steady Deals — ongoing offers for consistent foot traffic, day after day."
          startFrame={55}
          fontSize={22}
          color="rgba(255,255,255,0.7)"
          style={{ lineHeight: 1.5 }}
        />
      </div>

      {/* Right side: deal cards */}
      <div style={{ flex: 1, position: 'relative', height: '100%' }}>
        <DealCard
          title="50% Off All Appetizers"
          discount="50% OFF"
          type="sponti"
          startFrame={25}
          position={{ x: 40, y: 180 }}
        />
        <DealCard
          title="Buy 1 Get 1 Free Haircut"
          discount="BOGO"
          type="steady"
          startFrame={45}
          position={{ x: 80, y: 500 }}
        />
      </div>
    </AbsoluteFill>
  );
};

const HowItWorksScene: React.FC = () => {
  const steps = [
    {
      icon: '📋',
      title: 'Create Your Deal',
      description: 'Set your offer, price, and time window in minutes.',
    },
    {
      icon: '📱',
      title: 'Customers Claim It',
      description: 'They browse, claim, and pay the deposit directly to you.',
    },
    {
      icon: '✅',
      title: 'They Show Up & Redeem',
      description: 'Scan their QR code. Collect the balance. Done.',
    },
    {
      icon: '💰',
      title: 'You Keep Every Dollar',
      description: 'No commissions. No middleman. Payments go straight to your account.',
    },
  ];

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #0a0a0a, #0a0a14)',
        padding: 100,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <AnimatedText
        text="How It Works"
        startFrame={5}
        fontSize={22}
        color="#E8632B"
        fontWeight="800"
        style={{ letterSpacing: 3, textTransform: 'uppercase', marginBottom: 20 }}
      />

      <AnimatedText
        text="Simple for you. Irresistible for customers."
        startFrame={15}
        fontSize={46}
        color="#FFFFFF"
        fontWeight="800"
        style={{ lineHeight: 1.2, marginBottom: 50 }}
      />

      {steps.map((step, i) => (
        <FeaturePoint
          key={i}
          icon={step.icon}
          title={step.title}
          description={step.description}
          startFrame={30}
          index={i}
        />
      ))}
    </AbsoluteFill>
  );
};

const DifferenceScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const features = [
    { label: 'No commissions on sales', delay: 20 },
    { label: 'Payments go directly to you', delay: 30 },
    { label: 'Flash deals create real urgency', delay: 40 },
    { label: 'Deposits protect you from no-shows', delay: 50 },
    { label: 'Works with Stripe, PayPal, and more', delay: 60 },
  ];

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #0a0a0a, #140a08)',
        padding: 100,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <AnimatedText
        text="Why We're Different"
        startFrame={5}
        fontSize={22}
        color="#E8632B"
        fontWeight="800"
        style={{ letterSpacing: 3, textTransform: 'uppercase', marginBottom: 20 }}
      />

      <AnimatedText
        text="We never touch your money."
        startFrame={15}
        fontSize={52}
        color="#FFFFFF"
        fontWeight="800"
        style={{ lineHeight: 1.2, marginBottom: 50 }}
      />

      {features.map((feat, i) => {
        const progress = spring({
          frame: frame - feat.delay,
          fps,
          config: { damping: 12, stiffness: 100 },
        });
        const opacity = interpolate(progress, [0, 1], [0, 1]);
        const translateX = interpolate(progress, [0, 1], [-30, 0]);

        return frame >= feat.delay ? (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              marginBottom: 24,
              opacity,
              transform: `translateX(${translateX}px)`,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: '#E8632B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                color: '#FFF',
                fontWeight: '900',
                flexShrink: 0,
              }}
            >
              ✓
            </div>
            <span
              style={{
                color: '#FFFFFF',
                fontSize: 28,
                fontWeight: '600',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {feat.label}
            </span>
          </div>
        ) : null;
      })}
    </AbsoluteFill>
  );
};

const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();

  // Button pulse effect
  const pulse = Math.sin(frame * 0.08) * 4;

  return (
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
      {/* Glow */}
      <div
        style={{
          position: 'absolute',
          width: 800,
          height: 800,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(232,99,43,0.12) 0%, transparent 70%)',
        }}
      />

      <BrandLogo startFrame={5} size={100} />

      <AnimatedText
        text="Ready to Fill Your Empty Seats?"
        startFrame={20}
        fontSize={56}
        color="#FFFFFF"
        fontWeight="800"
        style={{ textAlign: 'center', maxWidth: 800, lineHeight: 1.2 }}
      />

      <AnimatedText
        text="Join hundreds of local businesses already growing with SpontiCoupon."
        startFrame={40}
        fontSize={24}
        color="rgba(255,255,255,0.6)"
        style={{ textAlign: 'center', maxWidth: 600 }}
      />

      {/* CTA Button */}
      {frame >= 55 && (
        <div
          style={{
            marginTop: 20,
            background: 'linear-gradient(135deg, #E8632B, #FF8C42)',
            color: '#FFFFFF',
            fontSize: 28,
            fontWeight: '800',
            fontFamily: 'Inter, sans-serif',
            padding: '20px 60px',
            borderRadius: 16,
            boxShadow: `0 ${8 + pulse}px ${32 + pulse * 2}px rgba(232,99,43,0.5)`,
            transform: `translateY(${-pulse}px)`,
          }}
        >
          Get Started at sponticoupon.com
        </div>
      )}
    </AbsoluteFill>
  );
};

// --- Main Composition ---

export const ExplainerVideo: React.FC<ExplainerVideoProps> = ({ avatarVideoUrl }) => {
  // Scene timing (in frames at 30fps)
  const SCENES = {
    intro: { start: 0, duration: 120 },        // 0-4s
    problem: { start: 120, duration: 150 },     // 4-9s
    solution: { start: 270, duration: 210 },    // 9-16s
    howItWorks: { start: 480, duration: 240 },  // 16-24s
    difference: { start: 720, duration: 210 },  // 24-31s
    cta: { start: 930, duration: 150 },         // 31-36s (extended with avatar)
  };

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {/* Scene 1: Intro */}
      <Sequence from={SCENES.intro.start} durationInFrames={SCENES.intro.duration}>
        <IntroScene />
      </Sequence>

      {/* Scene 2: Problem */}
      <Sequence from={SCENES.problem.start} durationInFrames={SCENES.problem.duration}>
        <ProblemScene />
      </Sequence>

      {/* Scene 3: Solution with deal cards */}
      <Sequence from={SCENES.solution.start} durationInFrames={SCENES.solution.duration}>
        <SolutionScene />
      </Sequence>

      {/* Scene 4: How It Works */}
      <Sequence from={SCENES.howItWorks.start} durationInFrames={SCENES.howItWorks.duration}>
        <HowItWorksScene />
      </Sequence>

      {/* Scene 5: Why We're Different */}
      <Sequence from={SCENES.difference.start} durationInFrames={SCENES.difference.duration}>
        <DifferenceScene />
      </Sequence>

      {/* Scene 6: CTA */}
      <Sequence from={SCENES.cta.start} durationInFrames={SCENES.cta.duration}>
        <CTAScene />
      </Sequence>

      {/* Avatar overlay — bottom right, talking throughout */}
      {avatarVideoUrl && (
        <Sequence from={0} durationInFrames={SCENES.cta.start + SCENES.cta.duration}>
          <div
            style={{
              position: 'absolute',
              bottom: 40,
              right: 40,
              width: 360,
              height: 360,
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

      {/* Voiceover audio — one segment per scene */}
      <Sequence from={SCENES.intro.start} durationInFrames={SCENES.intro.duration}>
        <Audio src={staticFile('audio/explainer/intro.mp3')} volume={1} />
      </Sequence>
      <Sequence from={SCENES.problem.start} durationInFrames={SCENES.problem.duration}>
        <Audio src={staticFile('audio/explainer/problem.mp3')} volume={1} />
      </Sequence>
      <Sequence from={SCENES.solution.start} durationInFrames={SCENES.solution.duration}>
        <Audio src={staticFile('audio/explainer/solution.mp3')} volume={1} />
      </Sequence>
      <Sequence from={SCENES.howItWorks.start} durationInFrames={SCENES.howItWorks.duration}>
        <Audio src={staticFile('audio/explainer/how-it-works.mp3')} volume={1} />
      </Sequence>
      <Sequence from={SCENES.difference.start} durationInFrames={SCENES.difference.duration}>
        <Audio src={staticFile('audio/explainer/difference.mp3')} volume={1} />
      </Sequence>
      <Sequence from={SCENES.cta.start} durationInFrames={SCENES.cta.duration}>
        <Audio src={staticFile('audio/explainer/cta.mp3')} volume={1} />
      </Sequence>

      {/* Scene transitions */}
      <SceneTransition startFrame={SCENES.problem.start - 8} />
      <SceneTransition startFrame={SCENES.solution.start - 8} />
      <SceneTransition startFrame={SCENES.howItWorks.start - 8} />
      <SceneTransition startFrame={SCENES.difference.start - 8} />
      <SceneTransition startFrame={SCENES.cta.start - 8} />
    </AbsoluteFill>
  );
};
