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

// ── Bottom Info Bar ────────────────────────────────────────────────────────────
// Clean bottom bar with step label, title, and subtitle over a dark gradient
const InfoBar: React.FC<{
  step?: string;
  title: string;
  subtitle: string;
}> = ({ step, title, subtitle }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const slideUp = spring({
    frame: frame - 5,
    fps,
    config: { damping: 14, stiffness: 100 },
  });

  const barY = interpolate(slideUp, [0, 1], [120, 0]);
  const textOpacity = interpolate(frame, [12, 22], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        transform: `translateY(${barY}px)`,
        zIndex: 20,
      }}
    >
      {/* Gradient backdrop */}
      <div
        style={{
          background: 'linear-gradient(transparent, rgba(0,0,0,0.85) 30%, rgba(0,0,0,0.95))',
          padding: '50px 60px 40px',
        }}
      >
        {step && (
          <div
            style={{
              fontSize: 15,
              fontWeight: '800',
              color: '#E8632B',
              fontFamily: 'Inter, sans-serif',
              letterSpacing: 3,
              textTransform: 'uppercase',
              marginBottom: 8,
              opacity: textOpacity,
            }}
          >
            {step}
          </div>
        )}
        <div
          style={{
            fontSize: 36,
            fontWeight: '800',
            color: '#FFFFFF',
            fontFamily: 'Inter, sans-serif',
            lineHeight: 1.2,
            marginBottom: 8,
            opacity: textOpacity,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 18,
            fontWeight: '400',
            color: 'rgba(255,255,255,0.75)',
            fontFamily: 'Inter, sans-serif',
            lineHeight: 1.5,
            maxWidth: 800,
            opacity: textOpacity,
          }}
        >
          {subtitle}
        </div>
      </div>
    </div>
  );
};

// ── Screenshot Scene ───────────────────────────────────────────────────────────
const ScreenshotScene: React.FC<{
  screenshot: string;
  step?: string;
  title: string;
  subtitle: string;
}> = ({ screenshot, step, title, subtitle }) => {
  const frame = useCurrentFrame();

  // Subtle slow zoom
  const zoom = interpolate(frame, [0, 300], [1, 1.04], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill>
      {/* Screenshot background with slow zoom */}
      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          transform: `scale(${zoom})`,
          transformOrigin: 'top center',
        }}
      >
        <Img
          src={staticFile(`screenshots/${screenshot}`)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>

      {/* Subtle top vignette for depth */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 120,
          background: 'linear-gradient(rgba(0,0,0,0.3), transparent)',
        }}
      />

      {/* Info bar at bottom */}
      <InfoBar step={step} title={title} subtitle={subtitle} />
    </AbsoluteFill>
  );
};

// ── Intro/Outro Scene ──────────────────────────────────────────────────────────
const BrandScene: React.FC<{
  title: string;
  subtitle: string;
  showLogo?: boolean;
}> = ({ title, subtitle, showLogo = true }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({
    frame: frame - 8,
    fps,
    config: { damping: 10, stiffness: 80 },
  });

  const titleOpacity = interpolate(frame, [18, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleY = interpolate(frame, [18, 30], [20, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const subOpacity = interpolate(frame, [35, 48], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: 'radial-gradient(ellipse at 40% 45%, #1a1008 0%, #0a0a0a 55%, #000 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
      }}
    >
      {/* Decorative glow */}
      <div
        style={{
          position: 'absolute',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(232,99,43,0.12) 0%, transparent 70%)',
          top: '25%',
          left: '35%',
        }}
      />

      {showLogo && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            opacity: logoScale,
            transform: `scale(${logoScale})`,
          }}
        >
          <div
            style={{
              width: 70,
              height: 70,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #E8632B, #FF8C42)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 6px 24px rgba(232,99,43,0.4)',
            }}
          >
            <span style={{ color: '#FFF', fontSize: 32, fontWeight: '900', fontFamily: 'Inter, sans-serif' }}>S</span>
          </div>
          <span style={{ color: '#FFF', fontSize: 36, fontWeight: '800', fontFamily: 'Inter, sans-serif' }}>
            Sponti<span style={{ color: '#E8632B' }}>Coupon</span>
          </span>
        </div>
      )}

      <div
        style={{
          fontSize: 44,
          fontWeight: '800',
          color: '#FFFFFF',
          fontFamily: 'Inter, sans-serif',
          textAlign: 'center',
          maxWidth: 800,
          lineHeight: 1.2,
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          marginTop: 16,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 22,
          color: 'rgba(255,255,255,0.6)',
          fontFamily: 'Inter, sans-serif',
          textAlign: 'center',
          maxWidth: 600,
          opacity: subOpacity,
        }}
      >
        {subtitle}
      </div>
    </AbsoluteFill>
  );
};

// ── Main Onboarding Video ──────────────────────────────────────────────────────

export const OnboardingVideo: React.FC = () => {
  const FPS = 30;

  // Scene durations matched to voiceover audio length + 1s buffer
  const scenes = [
    { key: 'intro', seconds: 15 },
    { key: 'dashboard', seconds: 17 },
    { key: 'fromWebsite', seconds: 19 },
    { key: 'createDeal', seconds: 21 },
    { key: 'dealTypes', seconds: 22 },
    { key: 'payments', seconds: 24 },
    { key: 'scanRedeem', seconds: 16 },
    { key: 'analytics', seconds: 14 },
    { key: 'social', seconds: 18 },
    { key: 'loyalty', seconds: 18 },
    { key: 'outro', seconds: 15 },
  ];

  let currentFrame = 0;
  const SCENES: Record<string, { start: number; duration: number }> = {};
  for (const s of scenes) {
    const duration = s.seconds * FPS;
    SCENES[s.key] = { start: currentFrame, duration };
    currentFrame += duration;
  }

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>

      {/* ── Intro ─────────────────────────────────────────────── */}
      <Sequence from={SCENES.intro.start} durationInFrames={SCENES.intro.duration}>
        <BrandScene
          title="Thank You for Joining SpontiCoupon!"
          subtitle="Here's how to maximize the platform and grow your business"
        />
      </Sequence>

      {/* ── Dashboard ─────────────────────────────────────────── */}
      <Sequence from={SCENES.dashboard.start} durationInFrames={SCENES.dashboard.duration}>
        <ScreenshotScene
          screenshot="vendor-dashboard.png"
          step="Your Dashboard"
          title="Everything You Need in One Place"
          subtitle="Track your active deals, claims, redemptions, and revenue. Create deals and redeem customers directly from here."
        />
      </Sequence>

      {/* ── Import from Website (moved up — key feature) ──────── */}
      <Sequence from={SCENES.fromWebsite.start} durationInFrames={SCENES.fromWebsite.duration}>
        <ScreenshotScene
          screenshot="from-website.png"
          step="Import from Your Website"
          title="Let AI Build Your Deals for You"
          subtitle="Paste your website URL and our AI will extract your services, pricing, and images — then generate ready-to-publish deals in seconds. No typing needed."
        />
      </Sequence>

      {/* ── Create a Deal ─────────────────────────────────────── */}
      <Sequence from={SCENES.createDeal.start} durationInFrames={SCENES.createDeal.duration}>
        <ScreenshotScene
          screenshot="create-deal.png"
          step="Create a Deal"
          title="AI Writes Your Content, You Publish"
          subtitle="Describe your deal idea and Ava generates the title, description, discount, terms, and image. You review, adjust if needed, and publish. Your deal is live in minutes."
        />
      </Sequence>

      {/* ── Deal Types ────────────────────────────────────────── */}
      <Sequence from={SCENES.dealTypes.start} durationInFrames={SCENES.dealTypes.duration}>
        <ScreenshotScene
          screenshot="deal-type-selection.png"
          step="Two Ways to Attract Customers"
          title="Sponti Deals & Steady Deals"
          subtitle="Sponti deals are flash offers (4-24 hours) that create urgency and drive new customers fast. Steady deals run 1-30 days for consistent business. Use both to grow."
        />
      </Sequence>

      {/* ── Payments ──────────────────────────────────────────── */}
      <Sequence from={SCENES.payments.start} durationInFrames={SCENES.payments.duration}>
        <ScreenshotScene
          screenshot="payments.png"
          step="Get Paid Directly"
          title="100% of Every Dollar Goes to You"
          subtitle="Connect Stripe or PayPal for online deposits. Add Venmo, Zelle, or Cash App for in-person. Zero commissions — we never touch your money."
        />
      </Sequence>

      {/* ── Scan & Redeem ─────────────────────────────────────── */}
      <Sequence from={SCENES.scanRedeem.start} durationInFrames={SCENES.scanRedeem.duration}>
        <ScreenshotScene
          screenshot="scan-redeem.png"
          step="Redeem Customers"
          title="Scan QR Code or Enter 6-Digit Code"
          subtitle="When a customer arrives, verify their deal in seconds. Collect any remaining balance in person or through a Stripe payment link."
        />
      </Sequence>

      {/* ── Analytics ─────────────────────────────────────────── */}
      <Sequence from={SCENES.analytics.start} durationInFrames={SCENES.analytics.duration}>
        <ScreenshotScene
          screenshot="analytics.png"
          step="Track Your Growth"
          title="Real-Time Analytics & Insights"
          subtitle="See what's working — claims, redemptions, conversion rate, and revenue. Compare deal types and optimize your strategy with data."
        />
      </Sequence>

      {/* ── Social ────────────────────────────────────────────── */}
      <Sequence from={SCENES.social.start} durationInFrames={SCENES.social.duration}>
        <ScreenshotScene
          screenshot="social.png"
          step="Coming Soon"
          title="Social Media Auto-Posting"
          subtitle="Connect Facebook, Instagram, X, and TikTok. When you publish a deal, it automatically posts with AI-generated captions. More visibility, zero extra work."
        />
      </Sequence>

      {/* ── Loyalty ───────────────────────────────────────────── */}
      <Sequence from={SCENES.loyalty.start} durationInFrames={SCENES.loyalty.duration}>
        <ScreenshotScene
          screenshot="loyalty.png"
          step="Build Repeat Business"
          title="Loyalty Programs That Work"
          subtitle="Set up punch cards or points-based rewards. Customers are automatically enrolled when they redeem. Turn first-time visitors into loyal regulars."
        />
      </Sequence>

      {/* ── Outro ─────────────────────────────────────────────── */}
      <Sequence from={SCENES.outro.start} durationInFrames={SCENES.outro.duration}>
        <BrandScene
          title="You're Ready to Grow"
          subtitle="Zero commissions. More customers. More loyalty. More revenue."
        />
      </Sequence>

      {/* ── Voiceover Audio ──────────────────────────────────── */}
      <Sequence from={SCENES.intro.start} durationInFrames={SCENES.intro.duration}>
        <Audio src={staticFile('audio/onboarding/intro.mp3')} volume={1} />
      </Sequence>
      <Sequence from={SCENES.dashboard.start} durationInFrames={SCENES.dashboard.duration}>
        <Audio src={staticFile('audio/onboarding/dashboard.mp3')} volume={1} />
      </Sequence>
      <Sequence from={SCENES.fromWebsite.start} durationInFrames={SCENES.fromWebsite.duration}>
        <Audio src={staticFile('audio/onboarding/from-website.mp3')} volume={1} />
      </Sequence>
      <Sequence from={SCENES.createDeal.start} durationInFrames={SCENES.createDeal.duration}>
        <Audio src={staticFile('audio/onboarding/create-deal.mp3')} volume={1} />
      </Sequence>
      <Sequence from={SCENES.dealTypes.start} durationInFrames={SCENES.dealTypes.duration}>
        <Audio src={staticFile('audio/onboarding/deal-types.mp3')} volume={1} />
      </Sequence>
      <Sequence from={SCENES.payments.start} durationInFrames={SCENES.payments.duration}>
        <Audio src={staticFile('audio/onboarding/payments.mp3')} volume={1} />
      </Sequence>
      <Sequence from={SCENES.scanRedeem.start} durationInFrames={SCENES.scanRedeem.duration}>
        <Audio src={staticFile('audio/onboarding/scan-redeem.mp3')} volume={1} />
      </Sequence>
      <Sequence from={SCENES.analytics.start} durationInFrames={SCENES.analytics.duration}>
        <Audio src={staticFile('audio/onboarding/analytics.mp3')} volume={1} />
      </Sequence>
      <Sequence from={SCENES.social.start} durationInFrames={SCENES.social.duration}>
        <Audio src={staticFile('audio/onboarding/social.mp3')} volume={1} />
      </Sequence>
      <Sequence from={SCENES.loyalty.start} durationInFrames={SCENES.loyalty.duration}>
        <Audio src={staticFile('audio/onboarding/loyalty.mp3')} volume={1} />
      </Sequence>
      <Sequence from={SCENES.outro.start} durationInFrames={SCENES.outro.duration}>
        <Audio src={staticFile('audio/onboarding/outro.mp3')} volume={1} />
      </Sequence>

      {/* ── Scene Transitions ─────────────────────────────────── */}
      {Object.values(SCENES)
        .slice(1)
        .map((scene, i) => (
          <SceneTransition key={i} startFrame={scene.start - 8} />
        ))}
    </AbsoluteFill>
  );
};
