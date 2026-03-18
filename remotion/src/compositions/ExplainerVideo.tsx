import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
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

// ── Persistent Logo Watermark (top-left) ────────────────────────────────────
const LogoWatermark: React.FC = () => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        top: 50,
        left: 30,
        zIndex: 30,
        opacity,
        padding: '6px 10px',
        background: 'rgba(0,0,0,0.35)',
        borderRadius: 10,
      }}
    >
      <Img
        src={staticFile('images/logo.png')}
        style={{
          height: 44,
          width: 'auto',
          filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.6))',
        }}
      />
    </div>
  );
};

// ── Animated Text ────────────────────────────────────────────────────────────
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
  const { fps } = useVideoConfig();

  // Lifestyle image slideshow
  const images = [
    'images/happy-vendor-restaurant.png',
    'images/customer-phone-deal.png',
    'images/happy-vendor-salon.png',
  ];

  const cycleDuration = 100;
  const imageIndex = Math.floor(frame / cycleDuration) % images.length;
  const nextIndex = (imageIndex + 1) % images.length;
  const progress = (frame % cycleDuration) / cycleDuration;
  const fadeZone = 0.8;
  const crossfade = progress > fadeZone
    ? interpolate(progress, [fadeZone, 1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 0;
  const zoom = interpolate(progress, [0, 1], [1, 1.06]);

  const logoScale = spring({ frame: frame - 8, fps, config: { damping: 10, stiffness: 80 } });

  return (
    <AbsoluteFill>
      {/* Current image */}
      <div style={{ position: 'absolute', width: '100%', height: '100%', transform: `scale(${zoom})`, opacity: 1 - crossfade }}>
        <Img src={staticFile(images[imageIndex])} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      {crossfade > 0 && (
        <div style={{ position: 'absolute', width: '100%', height: '100%', opacity: crossfade }}>
          <Img src={staticFile(images[nextIndex])} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}

      {/* Dark overlay */}
      <div style={{ position: 'absolute', width: '100%', height: '100%', background: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.7) 100%)' }} />

      {/* Content */}
      <div style={{ position: 'absolute', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: '80px 50px' }}>
        <div style={{ opacity: logoScale, transform: `scale(${logoScale})` }}>
          <Img
            src={staticFile('images/logo.png')}
            style={{ height: 100, width: 'auto', filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.5))' }}
          />
        </div>

        <VText
          text="Attract Customers. Build Loyalty. Grow Revenue."
          startFrame={25}
          fontSize={40}
          fontWeight="800"
          style={{ textAlign: 'center', lineHeight: 1.2, maxWidth: 500, textShadow: '0 3px 16px rgba(0,0,0,0.6)' }}
        />

        <VText
          text="The easiest way to create deals and keep customers coming back."
          startFrame={45}
          fontSize={22}
          color="rgba(255,255,255,0.85)"
          style={{ textAlign: 'center', maxWidth: 420, textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}
        />
      </div>
    </AbsoluteFill>
  );
};

const ProblemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const zoom = interpolate(frame, [0, 400], [1, 1.06], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill>
      {/* Lifestyle background */}
      <div style={{ position: 'absolute', width: '100%', height: '100%', transform: `scale(${zoom})` }}>
        <Img src={staticFile('images/problem-struggling-ads.png')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div style={{ position: 'absolute', width: '100%', height: '100%', background: 'rgba(0,0,0,0.75)' }} />

      <div style={{ position: 'absolute', width: '100%', height: '100%', padding: '140px 50px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <VText text="THE CHALLENGE" startFrame={5} fontSize={16} color="#E8632B" fontWeight="800" style={{ letterSpacing: 3, marginBottom: 20 }} />
        <VText text="You Want More Customers — And You Want Them Coming Back" startFrame={15} fontSize={36} fontWeight="800" style={{ lineHeight: 1.2, marginBottom: 36, maxWidth: 500, textShadow: '0 2px 12px rgba(0,0,0,0.5)' }} />
        <VText text="Creating deals takes time. Most platforms take a cut of every sale. There has to be a better way." startFrame={35} fontSize={20} color="rgba(255,255,255,0.7)" style={{ lineHeight: 1.6, maxWidth: 460 }} />
      </div>
    </AbsoluteFill>
  );
};

const SolutionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const zoom = interpolate(frame, [0, 600], [1, 1.06], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', width: '100%', height: '100%', transform: `scale(${zoom})` }}>
        <Img src={staticFile('images/solution-flash-deal.png')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div style={{ position: 'absolute', width: '100%', height: '100%', background: 'rgba(0,0,0,0.82)' }} />

    <div style={{ position: 'absolute', width: '100%', height: '100%', padding: '100px 50px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 24 }}>
      <VText text="CREATE DEALS IN MINUTES" startFrame={5} fontSize={16} color="#E8632B" fontWeight="800" style={{ letterSpacing: 3 }} />
      <VText text="AI Does the Work. You Hit Publish." startFrame={15} fontSize={36} fontWeight="800" style={{ textAlign: 'center', lineHeight: 1.2, marginBottom: 20 }} />

      <VerticalDealCard title="50% Off All Appetizers" discount="50% OFF" type="sponti" startFrame={30} />
      <VText text="Paste your website URL — Ava extracts everything and creates deals for you." startFrame={40} fontSize={18} color="rgba(255,255,255,0.6)" style={{ textAlign: 'center', maxWidth: 400, marginBottom: 8 }} />

      <VerticalDealCard title="Buy 1 Get 1 Free Haircut" discount="BOGO" type="steady" startFrame={55} />
      <VText text="Or describe your idea — Ava writes the title, description, terms, and image." startFrame={65} fontSize={18} color="rgba(255,255,255,0.6)" style={{ textAlign: 'center', maxWidth: 400 }} />
    </div>
    </AbsoluteFill>
  );
};

const HowItWorksScene: React.FC = () => {
  const steps = [
    { num: '1', title: 'Sponti Deals', desc: 'Flash offers lasting hours — create urgency and attract new customers fast.' },
    { num: '2', title: 'Steady Deals', desc: 'Run for days — bring consistent traffic and repeat business.' },
    { num: '3', title: 'Quick QR Scan', desc: 'Customers show up, you scan their code. Simple and professional.' },
    { num: '4', title: 'Keep 100%', desc: 'Zero commissions. Every dollar goes directly to you.' },
  ];

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const zoom = interpolate(frame, [0, 600], [1, 1.06], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill>
      {/* Lifestyle background */}
      <div style={{ position: 'absolute', width: '100%', height: '100%', transform: `scale(${zoom})` }}>
        <Img src={staticFile('images/how-it-works-phone-qr.png')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div style={{ position: 'absolute', width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)' }} />

    <div style={{ position: 'absolute', width: '100%', height: '100%', padding: '100px 50px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <VText text="TWO DEAL TYPES" startFrame={5} fontSize={16} color="#E8632B" fontWeight="800" style={{ letterSpacing: 3, marginBottom: 16 }} />
      <VText text="Flash Deals + Steady Deals" startFrame={12} fontSize={34} fontWeight="800" style={{ lineHeight: 1.2, marginBottom: 44, textShadow: '0 2px 12px rgba(0,0,0,0.5)' }} />

      {steps.map((step, i) => {
        const delay = 25 + i * 22;
        const progress = spring({ frame: frame - delay, fps, config: { damping: 12, stiffness: 100 } });
        if (frame < delay) return null;
        const opacity = interpolate(progress, [0, 1], [0, 1]);
        const translateY = interpolate(progress, [0, 1], [20, 0]);

        return (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 32, opacity, transform: `translateY(${translateY}px)` }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, #E8632B, #FF8C42)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: '900', color: '#FFF', fontFamily: 'Inter, sans-serif', flexShrink: 0 }}>
              {step.num}
            </div>
            <div>
              <div style={{ color: '#FFF', fontSize: 22, fontWeight: '700', fontFamily: 'Inter, sans-serif', marginBottom: 4 }}>{step.title}</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 17, fontFamily: 'Inter, sans-serif', lineHeight: 1.4 }}>{step.desc}</div>
            </div>
          </div>
        );
      })}
    </div>
    </AbsoluteFill>
  );
};

const DifferenceScene: React.FC = () => {
  const frame = useCurrentFrame();
  const zoom = interpolate(frame, [0, 600], [1, 1.06], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', width: '100%', height: '100%', transform: `scale(${zoom})` }}>
        <Img src={staticFile('images/difference-direct-payment.png')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div style={{ position: 'absolute', width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)' }} />

      <div style={{ position: 'absolute', width: '100%', height: '100%', padding: '100px 50px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <VText text="KEEP CUSTOMERS COMING BACK" startFrame={5} fontSize={16} color="#E8632B" fontWeight="800" style={{ letterSpacing: 3, marginBottom: 16 }} />
        <VText text="Built-In Loyalty Programs" startFrame={15} fontSize={40} fontWeight="800" style={{ lineHeight: 1.2, marginBottom: 44, textShadow: '0 2px 12px rgba(0,0,0,0.5)' }} />

        <CheckLine text="Zero commissions — keep 100% of every dollar" delay={25} />
        <CheckLine text="Punch cards and points rewards built in" delay={35} />
        <CheckLine text="Customers auto-enroll when they redeem" delay={45} />
        <CheckLine text="Turn first-time visitors into loyal regulars" delay={55} />
        <CheckLine text="Your first deal live in under 5 minutes" delay={65} />
      </div>
    </AbsoluteFill>
  );
};

const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const zoom = interpolate(frame, [0, 400], [1, 1.06], { extrapolateRight: 'clamp' });
  const logoScale = spring({ frame: frame - 5, fps, config: { damping: 10, stiffness: 80 } });

  return (
    <AbsoluteFill>
      {/* Lifestyle background */}
      <div style={{ position: 'absolute', width: '100%', height: '100%', transform: `scale(${zoom})` }}>
        <Img src={staticFile('images/busy-local-shop.png')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div style={{ position: 'absolute', width: '100%', height: '100%', background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.6), rgba(0,0,0,0.8))' }} />

      <div style={{ position: 'absolute', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: '80px 50px' }}>
        <div style={{ opacity: logoScale, transform: `scale(${logoScale})` }}>
          <Img
            src={staticFile('images/logo.png')}
            style={{ height: 90, width: 'auto', filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.5))' }}
          />
        </div>

        <VText text="More Customers. More Loyalty. More Revenue." startFrame={18} fontSize={40} fontWeight="800" style={{ textAlign: 'center', lineHeight: 1.2, maxWidth: 460, textShadow: '0 3px 16px rgba(0,0,0,0.6)' }} />
        <VText text="Your first deal could be live in five minutes." startFrame={35} fontSize={22} color="rgba(255,255,255,0.85)" style={{ textAlign: 'center', maxWidth: 400, textShadow: '0 2px 8px rgba(0,0,0,0.5)' }} />
        <VText text="sponticoupon.com" startFrame={50} fontSize={26} color="#E8632B" fontWeight="700" style={{ textAlign: 'center', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }} />
      </div>
    </AbsoluteFill>
  );
};

// ── Main Composition ────────────────────────────────────────────────────────

export const ExplainerVideo: React.FC<ExplainerVideoProps> = ({ avatarVideoUrl }) => {
  const FPS = 30;

  // Scene durations matched to ElevenLabs voiceover audio (Rachel voice) + 2s buffer
  const sceneDefs = [
    { key: 'intro', seconds: 9 },        // audio: 6.3s
    { key: 'problem', seconds: 17 },     // audio: 15.0s
    { key: 'solution', seconds: 30 },    // audio: 28.1s
    { key: 'howItWorks', seconds: 25 },  // audio: 22.4s
    { key: 'difference', seconds: 23 },  // audio: 21.2s
    { key: 'cta', seconds: 12 },         // audio: 9.2s
  ];

  let currentFrame = 0;
  const SCENES: Record<string, { start: number; duration: number }> = {};
  for (const s of sceneDefs) {
    const duration = s.seconds * FPS;
    SCENES[s.key] = { start: currentFrame, duration };
    currentFrame += duration;
  }

  const totalFrames = currentFrame; // ~106 seconds

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

      {/* Persistent logo watermark */}
      <Sequence from={0} durationInFrames={totalFrames}>
        <LogoWatermark />
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
