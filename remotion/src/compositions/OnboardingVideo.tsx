import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Sequence,
  Img,
  interpolate,
  useCurrentFrame,
  spring,
  useVideoConfig,
  staticFile,
} from 'remotion';
import { SceneTransition } from '../components/SceneTransition';

// ── Persistent Logo Watermark ────────────────────────────────────────────────
const LogoWatermark: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div style={{ position: 'absolute', top: 24, left: 28, zIndex: 30, opacity, padding: '6px 10px', background: 'rgba(0,0,0,0.35)', borderRadius: 10 }}>
      <Img src={staticFile('images/logo.png')} style={{ height: 50, width: 'auto', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.6))' }} />
    </div>
  );
};

// ── Step Number Badge ────────────────────────────────────────────────────────
const StepBadge: React.FC<{ num: number; startFrame: number }> = ({ num, startFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({ frame: frame - startFrame, fps, config: { damping: 10, stiffness: 100 } });
  if (frame < startFrame) return null;

  return (
    <div
      style={{
        width: 64,
        height: 64,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #E8632B, #FF8C42)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 30,
        fontWeight: '900',
        color: '#FFF',
        fontFamily: 'Inter, sans-serif',
        boxShadow: '0 4px 20px rgba(232,99,43,0.5)',
        transform: `scale(${scale})`,
        opacity: scale,
      }}
    >
      {num}
    </div>
  );
};

// ── Bottom Info Bar ────────────────────────────────────────────────────────────
const InfoBar: React.FC<{
  step?: string;
  title: string;
  subtitle: string;
}> = ({ step, title, subtitle }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const slideUp = spring({ frame: frame - 5, fps, config: { damping: 14, stiffness: 100 } });
  const barY = interpolate(slideUp, [0, 1], [120, 0]);
  const textOpacity = interpolate(frame, [12, 22], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, transform: `translateY(${barY}px)`, zIndex: 20 }}>
      <div style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.85) 30%, rgba(0,0,0,0.95))', padding: '50px 60px 40px' }}>
        {step && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, opacity: textOpacity }}>
            <div style={{ fontSize: 15, fontWeight: '800', color: '#E8632B', fontFamily: 'Inter, sans-serif', letterSpacing: 3, textTransform: 'uppercase' }}>
              {step}
            </div>
          </div>
        )}
        <div style={{ fontSize: 36, fontWeight: '800', color: '#FFFFFF', fontFamily: 'Inter, sans-serif', lineHeight: 1.2, marginBottom: 8, opacity: textOpacity }}>
          {title}
        </div>
        <div style={{ fontSize: 18, fontWeight: '400', color: 'rgba(255,255,255,0.75)', fontFamily: 'Inter, sans-serif', lineHeight: 1.5, maxWidth: 900, opacity: textOpacity }}>
          {subtitle}
        </div>
      </div>
    </div>
  );
};

// ── Screenshot Scene with Step Badge ─────────────────────────────────────────
const ActionScene: React.FC<{
  screenshot: string;
  stepNum: number;
  step: string;
  title: string;
  subtitle: string;
  panDirection?: 'left' | 'right' | 'up' | 'down';
}> = ({ screenshot, stepNum, step, title, subtitle, panDirection = 'left' }) => {
  const frame = useCurrentFrame();

  const zoom = interpolate(frame, [0, 600], [1.05, 1.12], { extrapolateRight: 'clamp' });
  const panAmount = interpolate(frame, [0, 600], [0, 20], { extrapolateRight: 'clamp' });
  const panX = panDirection === 'left' ? -panAmount : panDirection === 'right' ? panAmount : 0;
  const panY = panDirection === 'up' ? -panAmount : panDirection === 'down' ? panAmount : 0;

  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', width: '100%', height: '100%', transform: `scale(${zoom}) translate(${panX}px, ${panY}px)`, transformOrigin: 'center center' }}>
        <Img src={staticFile(`screenshots/${screenshot}`)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>

      {/* Top vignette */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 120, background: 'linear-gradient(rgba(0,0,0,0.3), transparent)' }} />

      {/* Step badge - top right */}
      <div style={{ position: 'absolute', top: 24, right: 28, zIndex: 25 }}>
        <StepBadge num={stepNum} startFrame={3} />
      </div>

      <InfoBar step={step} title={title} subtitle={subtitle} />
    </AbsoluteFill>
  );
};

// ── Welcome Scene ────────────────────────────────────────────────────────────
const WelcomeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const images = [
    'images/happy-vendor-restaurant.png',
    'images/customer-phone-deal.png',
  ];

  const cycleDuration = 120;
  const imageIndex = Math.floor(frame / cycleDuration) % images.length;
  const progress = (frame % cycleDuration) / cycleDuration;
  const zoom = interpolate(progress, [0, 1], [1, 1.06]);

  const logoScale = spring({ frame: frame - 5, fps, config: { damping: 10, stiffness: 80 } });
  const titleOpacity = interpolate(frame, [15, 28], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const subOpacity = interpolate(frame, [32, 45], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const arrowOpacity = interpolate(frame, [50, 60], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const arrowBounce = Math.sin(frame * 0.1) * 6;

  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', width: '100%', height: '100%', transform: `scale(${zoom})` }}>
        <Img src={staticFile(images[imageIndex])} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div style={{ position: 'absolute', width: '100%', height: '100%', background: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.7) 100%)' }} />

      <div style={{ position: 'absolute', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div style={{ opacity: logoScale, transform: `scale(${logoScale})` }}>
          <Img src={staticFile('images/logo.png')} style={{ height: 120, width: 'auto', filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.5))' }} />
        </div>

        <div style={{ fontSize: 46, fontWeight: '800', color: '#FFF', fontFamily: 'Inter, sans-serif', textAlign: 'center', maxWidth: 800, lineHeight: 1.2, opacity: titleOpacity, textShadow: '0 3px 16px rgba(0,0,0,0.6)', marginTop: 12 }}>
          Welcome! Let's Get You Started
        </div>

        <div style={{ fontSize: 24, color: 'rgba(255,255,255,0.9)', fontFamily: 'Inter, sans-serif', textAlign: 'center', maxWidth: 600, opacity: subOpacity, textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
          3 quick steps to your first live deal
        </div>

        {/* Animated down arrow */}
        <div style={{ opacity: arrowOpacity, transform: `translateY(${arrowBounce}px)`, marginTop: 20, fontSize: 36, color: '#E8632B' }}>
          ▼
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── Done Scene ───────────────────────────────────────────────────────────────
const DoneScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const zoom = interpolate(frame, [0, 400], [1, 1.06], { extrapolateRight: 'clamp' });
  const logoScale = spring({ frame: frame - 5, fps, config: { damping: 10, stiffness: 80 } });
  const titleOpacity = interpolate(frame, [15, 28], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const subOpacity = interpolate(frame, [30, 42], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const urlOpacity = interpolate(frame, [45, 55], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', width: '100%', height: '100%', transform: `scale(${zoom})` }}>
        <Img src={staticFile('images/busy-local-shop.png')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div style={{ position: 'absolute', width: '100%', height: '100%', background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.55), rgba(0,0,0,0.8))' }} />

      <div style={{ position: 'absolute', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
        <div style={{ opacity: logoScale, transform: `scale(${logoScale})` }}>
          <Img src={staticFile('images/logo.png')} style={{ height: 90, width: 'auto', filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.5))' }} />
        </div>

        <div style={{ fontSize: 46, fontWeight: '800', color: '#FFF', fontFamily: 'Inter, sans-serif', textAlign: 'center', maxWidth: 700, lineHeight: 1.2, opacity: titleOpacity, textShadow: '0 3px 16px rgba(0,0,0,0.6)', marginTop: 8 }}>
          That's It — You're Live!
        </div>

        <div style={{ fontSize: 22, color: 'rgba(255,255,255,0.85)', fontFamily: 'Inter, sans-serif', textAlign: 'center', maxWidth: 500, opacity: subOpacity, textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
          Customers can now find and claim your deals. Watch your dashboard for results.
        </div>

        <div style={{ fontSize: 28, fontWeight: '700', color: '#E8632B', fontFamily: 'Inter, sans-serif', opacity: urlOpacity, textShadow: '0 2px 8px rgba(0,0,0,0.5)', marginTop: 8 }}>
          sponticoupon.com
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── Main Onboarding Video ──────────────────────────────────────────────────────

export const OnboardingVideo: React.FC = () => {
  const FPS = 30;

  // Scene durations matched to voiceover audio + 2s buffer
  const scenes = [
    { key: 'welcome', seconds: 7 },      // audio: 4.6s
    { key: 'step1', seconds: 23 },       // audio: 20.4s
    { key: 'step2', seconds: 17 },       // audio: 14.9s
    { key: 'step3', seconds: 18 },       // audio: 15.4s
    { key: 'done', seconds: 9 },         // audio: 6.3s
  ];

  let currentFrame = 0;
  const SCENES: Record<string, { start: number; duration: number }> = {};
  for (const s of scenes) {
    const duration = s.seconds * FPS;
    SCENES[s.key] = { start: currentFrame, duration };
    currentFrame += duration;
  }

  // Total: ~74 seconds

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>

      {/* ── Welcome ────────────────────────────────────────────── */}
      <Sequence from={SCENES.welcome.start} durationInFrames={SCENES.welcome.duration}>
        <WelcomeScene />
      </Sequence>

      {/* ── Step 1: Import from your website ───────────────────── */}
      <Sequence from={SCENES.step1.start} durationInFrames={SCENES.step1.duration}>
        <ActionScene
          screenshot="from-website.png"
          stepNum={1}
          step="Do This First"
          title="Import Deals from Your Website"
          subtitle="Paste your URL — Ava extracts your services, pricing, and images. Review the generated deals, tweak if needed, and publish. You'll have a full deal catalog in under 2 minutes."
          panDirection="down"
        />
      </Sequence>

      {/* ── Step 2: Set up payments ────────────────────────────── */}
      <Sequence from={SCENES.step2.start} durationInFrames={SCENES.step2.duration}>
        <ActionScene
          screenshot="payments.png"
          stepNum={2}
          step="Connect Your Payments"
          title="So Customers Can Pay You Directly"
          subtitle="Go to your Get Paid page and connect your payment method. Deposits go straight to you — zero commissions, zero middleman."
          panDirection="right"
        />
      </Sequence>

      {/* ── Step 3: Publish your first deal ─────────────────────── */}
      <Sequence from={SCENES.step3.start} durationInFrames={SCENES.step3.duration}>
        <ActionScene
          screenshot="create-deal.png"
          stepNum={3}
          step="Go Live"
          title="Publish Your First Deal"
          subtitle="Pick Sponti for a flash offer or Steady for ongoing. Hit publish — customers in your area can now find and claim it."
          panDirection="up"
        />
      </Sequence>

      {/* ── Done ───────────────────────────────────────────────── */}
      <Sequence from={SCENES.done.start} durationInFrames={SCENES.done.duration}>
        <DoneScene />
      </Sequence>

      {/* ── Logo Watermark ─────────────────────────────────────── */}
      <Sequence from={0} durationInFrames={currentFrame}>
        <LogoWatermark />
      </Sequence>

      {/* ── Voiceover Audio ────────────────────────────────────── */}
      <Sequence from={SCENES.welcome.start} durationInFrames={SCENES.welcome.duration}>
        <Audio src={staticFile('audio/onboarding/welcome.mp3')} volume={1} />
      </Sequence>
      <Sequence from={SCENES.step1.start} durationInFrames={SCENES.step1.duration}>
        <Audio src={staticFile('audio/onboarding/step1.mp3')} volume={1} />
      </Sequence>
      <Sequence from={SCENES.step2.start} durationInFrames={SCENES.step2.duration}>
        <Audio src={staticFile('audio/onboarding/step2.mp3')} volume={1} />
      </Sequence>
      <Sequence from={SCENES.step3.start} durationInFrames={SCENES.step3.duration}>
        <Audio src={staticFile('audio/onboarding/step3.mp3')} volume={1} />
      </Sequence>
      <Sequence from={SCENES.done.start} durationInFrames={SCENES.done.duration}>
        <Audio src={staticFile('audio/onboarding/done.mp3')} volume={1} />
      </Sequence>

      {/* ── Scene Transitions ──────────────────────────────────── */}
      {Object.values(SCENES)
        .slice(1)
        .map((scene, i) => (
          <SceneTransition key={i} startFrame={scene.start - 8} />
        ))}
    </AbsoluteFill>
  );
};
