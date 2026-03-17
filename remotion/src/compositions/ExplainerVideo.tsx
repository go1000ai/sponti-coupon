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
import { SceneTransition } from '../components/SceneTransition';

interface ExplainerVideoProps {
  avatarVideoUrl: string;
}

// ── Vertical 9:16 layout (1080×1920) for social media reels ──────────────────

// ── Brand Logo (compact vertical version) ────────────────────────────────────
const VerticalLogo: React.FC<{ startFrame: number }> = ({ startFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 10, stiffness: 80 },
  });

  if (frame < startFrame) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        opacity: scale,
        transform: `scale(${scale})`,
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #E8632B, #FF8C42)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 6px 24px rgba(232,99,43,0.4)',
        }}
      >
        <span style={{ color: '#FFF', fontSize: 26, fontWeight: '900', fontFamily: 'Inter, sans-serif' }}>S</span>
      </div>
      <span style={{ color: '#FFF', fontSize: 28, fontWeight: '800', fontFamily: 'Inter, sans-serif' }}>
        Sponti<span style={{ color: '#E8632B' }}>Coupon</span>
      </span>
    </div>
  );
};

// ── Animated Text (vertical-friendly) ────────────────────────────────────────
const VText: React.FC<{
  text: string;
  startFrame: number;
  fontSize?: number;
  color?: string;
  fontWeight?: string;
  style?: React.CSSProperties;
}> = ({ text, startFrame, fontSize = 40, color = '#FFF', fontWeight = '700', style = {} }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const translateY = interpolate(progress, [0, 1], [24, 0]);

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

// ── Checkmark feature line ──────────────────────────────────────────────────
const CheckLine: React.FC<{ text: string; delay: number }> = ({ text, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  if (frame < delay) return null;

  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const translateX = interpolate(progress, [0, 1], [-20, 0]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        marginBottom: 20,
        opacity,
        transform: `translateX(${translateX}px)`,
      }}
    >
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: '50%',
          background: '#E8632B',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16,
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
          fontSize: 24,
          fontWeight: '600',
          fontFamily: 'Inter, sans-serif',
          lineHeight: 1.3,
        }}
      >
        {text}
      </span>
    </div>
  );
};

// ── Deal Card (vertical layout) ─────────────────────────────────────────────
const VerticalDealCard: React.FC<{
  title: string;
  discount: string;
  type: 'sponti' | 'steady';
  startFrame: number;
}> = ({ title, discount, type, startFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 12, stiffness: 80 },
  });

  if (frame < startFrame) return null;

  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const scale = interpolate(progress, [0, 1], [0.9, 1]);
  const color = type === 'sponti' ? '#E8632B' : '#29ABE2';
  const label = type === 'sponti' ? 'SPONTI DEAL' : 'STEADY DEAL';
  const bgGradient =
    type === 'sponti'
      ? 'linear-gradient(135deg, #1a1a1a, #2a1a14)'
      : 'linear-gradient(135deg, #1a1a1a, #142028)';

  return (
    <div
      style={{
        opacity,
        transform: `scale(${scale})`,
        width: '100%',
        maxWidth: 420,
      }}
    >
      <div
        style={{
          background: bgGradient,
          borderRadius: 20,
          border: `2px solid ${color}33`,
          padding: 24,
          boxShadow: `0 12px 40px ${color}22`,
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            background: color,
            color: '#FFF',
            fontSize: 12,
            fontWeight: '800',
            padding: '4px 12px',
            borderRadius: 16,
            fontFamily: 'Inter, sans-serif',
            letterSpacing: '1px',
            marginBottom: 12,
          }}
        >
          {label}
        </div>
        <div style={{ color: '#FFF', fontSize: 20, fontWeight: '700', fontFamily: 'Inter, sans-serif', marginBottom: 6 }}>
          {title}
        </div>
        <div style={{ color, fontSize: 36, fontWeight: '900', fontFamily: 'Inter, sans-serif' }}>
          {discount}
        </div>
        {type === 'sponti' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, color: 'rgba(255,255,255,0.5)', fontSize: 14, fontFamily: 'Inter, sans-serif' }}>
            <span style={{ color: '#E8632B' }}>⏱</span> Expires in 23h 45m
          </div>
        )}
      </div>
    </div>
  );
};

// ── Scene Components ────────────────────────────────────────────────────────

const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const pulse = Math.sin(frame * 0.03) * 0.015 + 1;

  return (
    <AbsoluteFill
      style={{
        background: 'radial-gradient(ellipse at 50% 35%, #1a1008 0%, #0a0a0a 60%, #000 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 32,
        padding: '80px 50px',
        transform: `scale(${pulse})`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(232,99,43,0.15) 0%, transparent 70%)',
          top: '20%',
        }}
      />

      <VerticalLogo startFrame={8} />

      <VText
        text="The Smartest Way to Grow Your Business"
        startFrame={25}
        fontSize={44}
        fontWeight="800"
        style={{ textAlign: 'center', lineHeight: 1.2, maxWidth: 500 }}
      />

      <VText
        text="Local deals that bring customers through your door — today."
        startFrame={45}
        fontSize={22}
        color="rgba(255,255,255,0.6)"
        style={{ textAlign: 'center', maxWidth: 420 }}
      />
    </AbsoluteFill>
  );
};

const ProblemScene: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(180deg, #0a0a0a, #111)',
        padding: '120px 50px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <VText
        text="THE PROBLEM"
        startFrame={5}
        fontSize={16}
        color="#E8632B"
        fontWeight="800"
        style={{ letterSpacing: 3, marginBottom: 20 }}
      />

      <VText
        text="Empty tables. Open slots. Unsold inventory."
        startFrame={15}
        fontSize={42}
        fontWeight="800"
        style={{ lineHeight: 1.2, marginBottom: 36, maxWidth: 500 }}
      />

      <VText
        text="Local businesses lose thousands every week on unfilled capacity. Traditional ads are expensive and slow. By the time customers see your ad, the moment has passed."
        startFrame={35}
        fontSize={20}
        color="rgba(255,255,255,0.6)"
        style={{ lineHeight: 1.6, maxWidth: 460 }}
      />
    </AbsoluteFill>
  );
};

const SolutionScene: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(180deg, #0a0a0a, #1a0e08)',
        padding: '100px 50px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 24,
      }}
    >
      <VText
        text="THE SOLUTION"
        startFrame={5}
        fontSize={16}
        color="#E8632B"
        fontWeight="800"
        style={{ letterSpacing: 3 }}
      />

      <VText
        text="Two deal types. One powerful platform."
        startFrame={15}
        fontSize={38}
        fontWeight="800"
        style={{ textAlign: 'center', lineHeight: 1.2, marginBottom: 20 }}
      />

      <VerticalDealCard
        title="50% Off All Appetizers"
        discount="50% OFF"
        type="sponti"
        startFrame={30}
      />

      <VText
        text="Flash offers that expire in hours. Create urgency, drive customers now."
        startFrame={40}
        fontSize={18}
        color="rgba(255,255,255,0.6)"
        style={{ textAlign: 'center', maxWidth: 400, marginBottom: 8 }}
      />

      <VerticalDealCard
        title="Buy 1 Get 1 Free Haircut"
        discount="BOGO"
        type="steady"
        startFrame={55}
      />

      <VText
        text="Ongoing offers for consistent foot traffic, day after day."
        startFrame={65}
        fontSize={18}
        color="rgba(255,255,255,0.6)"
        style={{ textAlign: 'center', maxWidth: 400 }}
      />
    </AbsoluteFill>
  );
};

const HowItWorksScene: React.FC = () => {
  const steps = [
    { num: '1', title: 'Create Your Deal', desc: 'Set your offer, price, and time window in minutes.' },
    { num: '2', title: 'Customers Claim It', desc: 'They browse, claim, and pay the deposit directly to you.' },
    { num: '3', title: 'They Show Up', desc: 'Scan their QR code. Collect the balance. Done.' },
    { num: '4', title: 'You Keep Every Dollar', desc: 'No commissions. Payments go straight to your account.' },
  ];

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(180deg, #0a0a0a, #0a0a14)',
        padding: '100px 50px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <VText
        text="HOW IT WORKS"
        startFrame={5}
        fontSize={16}
        color="#E8632B"
        fontWeight="800"
        style={{ letterSpacing: 3, marginBottom: 16 }}
      />

      <VText
        text="Simple for you. Irresistible for customers."
        startFrame={12}
        fontSize={36}
        fontWeight="800"
        style={{ lineHeight: 1.2, marginBottom: 44 }}
      />

      {steps.map((step, i) => {
        const delay = 25 + i * 22;
        const progress = spring({
          frame: frame - delay,
          fps,
          config: { damping: 12, stiffness: 100 },
        });

        if (frame < delay) return null;

        const opacity = interpolate(progress, [0, 1], [0, 1]);
        const translateY = interpolate(progress, [0, 1], [20, 0]);

        return (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 16,
              marginBottom: 32,
              opacity,
              transform: `translateY(${translateY}px)`,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: 'linear-gradient(135deg, #E8632B, #FF8C42)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                fontWeight: '900',
                color: '#FFF',
                fontFamily: 'Inter, sans-serif',
                flexShrink: 0,
              }}
            >
              {step.num}
            </div>
            <div>
              <div style={{ color: '#FFF', fontSize: 22, fontWeight: '700', fontFamily: 'Inter, sans-serif', marginBottom: 4 }}>
                {step.title}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 17, fontFamily: 'Inter, sans-serif', lineHeight: 1.4 }}>
                {step.desc}
              </div>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const DifferenceScene: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(180deg, #0a0a0a, #140a08)',
        padding: '100px 50px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <VText
        text="WHY WE'RE DIFFERENT"
        startFrame={5}
        fontSize={16}
        color="#E8632B"
        fontWeight="800"
        style={{ letterSpacing: 3, marginBottom: 16 }}
      />

      <VText
        text="We never touch your money."
        startFrame={15}
        fontSize={42}
        fontWeight="800"
        style={{ lineHeight: 1.2, marginBottom: 44 }}
      />

      <CheckLine text="No commissions on sales" delay={25} />
      <CheckLine text="Payments go directly to you" delay={35} />
      <CheckLine text="Flash deals create real urgency" delay={45} />
      <CheckLine text="Deposits protect you from no-shows" delay={55} />
      <CheckLine text="Works with Stripe, PayPal, and more" delay={65} />
    </AbsoluteFill>
  );
};

const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const pulse = Math.sin(frame * 0.08) * 4;

  return (
    <AbsoluteFill
      style={{
        background: 'radial-gradient(ellipse at 50% 45%, #1a0e08 0%, #0a0a0a 60%, #000 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 28,
        padding: '80px 50px',
      }}
    >
      <div
        style={{
          position: 'absolute',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(232,99,43,0.12) 0%, transparent 70%)',
        }}
      />

      <VerticalLogo startFrame={5} />

      <VText
        text="Ready to Grow Your Business?"
        startFrame={18}
        fontSize={44}
        fontWeight="800"
        style={{ textAlign: 'center', lineHeight: 1.2, maxWidth: 460 }}
      />

      <VText
        text="Join hundreds of local businesses already growing with SpontiCoupon."
        startFrame={35}
        fontSize={20}
        color="rgba(255,255,255,0.6)"
        style={{ textAlign: 'center', maxWidth: 400 }}
      />

      {frame >= 50 && (
        <div
          style={{
            marginTop: 12,
            background: 'linear-gradient(135deg, #E8632B, #FF8C42)',
            color: '#FFFFFF',
            fontSize: 24,
            fontWeight: '800',
            fontFamily: 'Inter, sans-serif',
            padding: '18px 44px',
            borderRadius: 14,
            boxShadow: `0 ${8 + pulse}px ${32 + pulse * 2}px rgba(232,99,43,0.5)`,
            transform: `translateY(${-pulse}px)`,
          }}
        >
          Get Started Free
        </div>
      )}

      <VText
        text="sponticoupon.com"
        startFrame={60}
        fontSize={18}
        color="rgba(255,255,255,0.5)"
        style={{ textAlign: 'center' }}
      />
    </AbsoluteFill>
  );
};

// ── Main Composition ────────────────────────────────────────────────────────

export const ExplainerVideo: React.FC<ExplainerVideoProps> = ({ avatarVideoUrl }) => {
  const SCENES = {
    intro: { start: 0, duration: 120 },        // 0-4s
    problem: { start: 120, duration: 150 },     // 4-9s
    solution: { start: 270, duration: 270 },    // 9-18s
    howItWorks: { start: 540, duration: 270 },  // 18-27s
    difference: { start: 810, duration: 240 },  // 27-35s
    cta: { start: 1050, duration: 180 },        // 35-41s
  };

  const totalFrames = SCENES.cta.start + SCENES.cta.duration;

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <Sequence from={SCENES.intro.start} durationInFrames={SCENES.intro.duration}>
        <IntroScene />
      </Sequence>

      <Sequence from={SCENES.problem.start} durationInFrames={SCENES.problem.duration}>
        <ProblemScene />
      </Sequence>

      <Sequence from={SCENES.solution.start} durationInFrames={SCENES.solution.duration}>
        <SolutionScene />
      </Sequence>

      <Sequence from={SCENES.howItWorks.start} durationInFrames={SCENES.howItWorks.duration}>
        <HowItWorksScene />
      </Sequence>

      <Sequence from={SCENES.difference.start} durationInFrames={SCENES.difference.duration}>
        <DifferenceScene />
      </Sequence>

      <Sequence from={SCENES.cta.start} durationInFrames={SCENES.cta.duration}>
        <CTAScene />
      </Sequence>

      {/* Avatar overlay — bottom center for vertical */}
      {avatarVideoUrl && (
        <Sequence from={0} durationInFrames={totalFrames}>
          <div
            style={{
              position: 'absolute',
              bottom: 60,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 280,
              height: 280,
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

      {/* Voiceover audio */}
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
