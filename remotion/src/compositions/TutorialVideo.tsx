import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Sequence,
  Img,
  OffthreadVideo,
  interpolate,
  useCurrentFrame,
  spring,
  useVideoConfig,
  staticFile,
} from 'remotion';
import { SceneTransition } from '../components/SceneTransition';

interface TutorialVideoProps {
  avatarVideoUrl: string;
}

// ── Persistent Logo Watermark (top-left) ─────────────────────────────────────
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
        top: 40,
        left: 36,
        zIndex: 30,
        opacity,
        padding: '8px 12px',
        background: 'rgba(0,0,0,0.35)',
        borderRadius: 10,
      }}
    >
      <Img
        src={staticFile('images/logo.png')}
        style={{
          height: 50,
          width: 'auto',
          filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.6))',
        }}
      />
    </div>
  );
};

// ── Animated Intro with Lifestyle Image Slideshow ────────────────────────────
const AnimatedIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const images = [
    'images/happy-vendor-restaurant.png',
    'images/happy-vendor-salon.png',
    'images/customer-phone-deal.png',
    'images/vendor-tablet-dashboard.png',
    'images/busy-local-shop.png',
  ];

  // Each image shows for ~70 frames (~2.3s), crossfading
  const cycleDuration = 70;
  const imageIndex = Math.floor(frame / cycleDuration) % images.length;
  const nextIndex = (imageIndex + 1) % images.length;
  const progress = (frame % cycleDuration) / cycleDuration;

  // Crossfade in last 20% of each cycle
  const fadeZone = 0.8;
  const crossfade = progress > fadeZone
    ? interpolate(progress, [fadeZone, 1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 0;

  // Ken Burns on each image
  const zoom = interpolate(progress, [0, 1], [1, 1.08]);
  const panX = interpolate(progress, [0, 1], [0, -15]);

  // Text animations
  const logoScale = spring({ frame: frame - 8, fps, config: { damping: 10, stiffness: 80 } });
  const titleOpacity = interpolate(frame, [20, 35], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const titleY = interpolate(frame, [20, 35], [30, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const subOpacity = interpolate(frame, [40, 55], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill>
      {/* Current image */}
      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          transform: `scale(${zoom}) translateX(${panX}px)`,
          opacity: 1 - crossfade,
        }}
      >
        <Img
          src={staticFile(images[imageIndex])}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>

      {/* Next image (crossfade in) */}
      {crossfade > 0 && (
        <div
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            opacity: crossfade,
          }}
        >
          <Img
            src={staticFile(images[nextIndex])}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      )}

      {/* Dark overlay for text readability */}
      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.7) 100%)',
        }}
      />

      {/* Centered content */}
      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 20,
        }}
      >
        {/* Logo */}
        <div
          style={{
            opacity: logoScale,
            transform: `scale(${logoScale})`,
          }}
        >
          <Img
            src={staticFile('images/logo.png')}
            style={{
              height: 140,
              width: 'auto',
              filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.5))',
            }}
          />
        </div>

        <div
          style={{
            fontSize: 48,
            fontWeight: '800',
            color: '#FFFFFF',
            fontFamily: 'Inter, sans-serif',
            textAlign: 'center',
            maxWidth: 800,
            lineHeight: 1.2,
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            textShadow: '0 3px 16px rgba(0,0,0,0.6)',
            marginTop: 12,
          }}
        >
          Vendor Dashboard Tutorial
        </div>

        <div
          style={{
            fontSize: 24,
            color: 'rgba(255,255,255,0.9)',
            fontFamily: 'Inter, sans-serif',
            textAlign: 'center',
            maxWidth: 600,
            opacity: subOpacity,
            textShadow: '0 2px 8px rgba(0,0,0,0.5)',
          }}
        >
          Everything you need to know to get started
        </div>
      </div>
    </AbsoluteFill>
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
            maxWidth: 900,
            opacity: textOpacity,
          }}
        >
          {subtitle}
        </div>
      </div>
    </div>
  );
};

// ── Screenshot Scene (full-screen with Ken Burns + info bar) ─────────────────
const ScreenshotScene: React.FC<{
  screenshot: string;
  step?: string;
  title: string;
  subtitle: string;
  panDirection?: 'left' | 'right' | 'up' | 'down';
}> = ({ screenshot, step, title, subtitle, panDirection = 'left' }) => {
  const frame = useCurrentFrame();

  // Dynamic Ken Burns — zoom + pan in specified direction
  const zoom = interpolate(frame, [0, 600], [1.05, 1.12], {
    extrapolateRight: 'clamp',
  });

  const panAmount = interpolate(frame, [0, 600], [0, 20], {
    extrapolateRight: 'clamp',
  });

  const panX = panDirection === 'left' ? -panAmount
    : panDirection === 'right' ? panAmount : 0;
  const panY = panDirection === 'up' ? -panAmount
    : panDirection === 'down' ? panAmount : 0;

  // Subtle animated highlight border at bottom of screenshot area
  const glowPulse = Math.sin(frame * 0.05) * 0.15 + 0.35;

  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          transform: `scale(${zoom}) translate(${panX}px, ${panY}px)`,
          transformOrigin: 'center center',
        }}
      >
        <Img
          src={staticFile(`screenshots/${screenshot}`)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>

      {/* Top vignette */}
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

      {/* Subtle orange accent line above info bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 155,
          left: 60,
          width: 80,
          height: 3,
          background: `rgba(232, 99, 43, ${glowPulse})`,
          borderRadius: 2,
          zIndex: 21,
        }}
      />

      <InfoBar step={step} title={title} subtitle={subtitle} />
    </AbsoluteFill>
  );
};

// ── CTA Outro with lifestyle background ────────────────────────────────────────
const CTAOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pulse = Math.sin(frame * 0.08) * 4;
  const zoom = interpolate(frame, [0, 400], [1, 1.06], { extrapolateRight: 'clamp' });

  const logoScale = spring({ frame: frame - 5, fps, config: { damping: 10, stiffness: 80 } });

  const titleOpacity = interpolate(frame, [15, 28], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const subOpacity = interpolate(frame, [30, 42], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill>
      {/* Lifestyle background image */}
      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          transform: `scale(${zoom})`,
        }}
      >
        <Img
          src={staticFile('images/busy-local-shop.png')}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>

      {/* Dark overlay */}
      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.6), rgba(0,0,0,0.8))',
        }}
      />

      {/* Content */}
      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
        }}
      >
        {/* Logo */}
        <div
          style={{
            opacity: logoScale,
            transform: `scale(${logoScale})`,
          }}
        >
          <Img
            src={staticFile('images/logo.png')}
            style={{
              height: 72,
              width: 'auto',
              filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.5))',
            }}
          />
        </div>

        <div
          style={{
            fontSize: 48,
            fontWeight: '800',
            color: '#FFFFFF',
            fontFamily: 'Inter, sans-serif',
            textAlign: 'center',
            maxWidth: 800,
            lineHeight: 1.2,
            opacity: titleOpacity,
            marginTop: 12,
            textShadow: '0 3px 16px rgba(0,0,0,0.6)',
          }}
        >
          You're All Set!
        </div>

        <div
          style={{
            fontSize: 22,
            color: 'rgba(255,255,255,0.85)',
            fontFamily: 'Inter, sans-serif',
            textAlign: 'center',
            maxWidth: 600,
            opacity: subOpacity,
            textShadow: '0 2px 8px rgba(0,0,0,0.5)',
          }}
        >
          Create your first deal and start bringing in customers today.
        </div>

        {frame >= 50 && (
          <div
            style={{
              marginTop: 20,
              fontSize: 28,
              fontWeight: '700',
              fontFamily: 'Inter, sans-serif',
              color: '#E8632B',
              textShadow: '0 2px 8px rgba(0,0,0,0.5)',
              letterSpacing: 1,
            }}
          >
            sponticoupon.com
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

// ── Main Tutorial Video ────────────────────────────────────────────────────────

export const TutorialVideo: React.FC<TutorialVideoProps> = ({ avatarVideoUrl }) => {
  const FPS = 30;

  // Scene durations matched to ElevenLabs voiceover audio + 2s buffer
  const scenes = [
    { key: 'intro', seconds: 12 },          // audio: 9.6s
    { key: 'dashboard', seconds: 18 },       // audio: 15.6s
    { key: 'fromWebsite', seconds: 31 },     // ★ audio: 28.8s
    { key: 'avaAI', seconds: 30 },           // ★ audio: 27.5s
    { key: 'dealTypes', seconds: 22 },       // audio: 19.3s
    { key: 'payments', seconds: 21 },        // audio: 18.9s
    { key: 'scanRedeem', seconds: 20 },      // audio: 17.6s
    { key: 'analytics', seconds: 23 },       // ★ audio: 20.8s
    { key: 'social', seconds: 25 },          // ★ audio: 22.5s
    { key: 'loyalty', seconds: 15 },         // audio: 12.5s
    { key: 'outro', seconds: 13 },           // audio: 11.1s
  ];

  let currentFrame = 0;
  const SCENES: Record<string, { start: number; duration: number }> = {};
  for (const s of scenes) {
    const duration = s.seconds * FPS;
    SCENES[s.key] = { start: currentFrame, duration };
    currentFrame += duration;
  }

  // Total: ~230 seconds

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>

      {/* ── Intro (animated lifestyle slideshow) ─────────────── */}
      <Sequence from={SCENES.intro.start} durationInFrames={SCENES.intro.duration}>
        <AnimatedIntro />
      </Sequence>

      {/* ── Dashboard Overview ──────────────────────────────────── */}
      <Sequence from={SCENES.dashboard.start} durationInFrames={SCENES.dashboard.duration}>
        <ScreenshotScene
          screenshot="vendor-dashboard.png"
          step="Your Home Base"
          title="The Vendor Dashboard"
          subtitle="See active deals, claims, and redemptions at a glance. Quick-create a new deal or redeem a customer. Monitor revenue and conversion rates in real time."
          panDirection="right"
        />
      </Sequence>

      {/* ── ★ Website Extraction (Featured) ─────────────────────── */}
      <Sequence from={SCENES.fromWebsite.start} durationInFrames={SCENES.fromWebsite.duration}>
        <ScreenshotScene
          screenshot="from-website.png"
          step="★ Fastest Way to Get Started"
          title="Import Deals from Your Website"
          subtitle="Paste your website URL — AI scrapes your services, pricing, descriptions, and images. Generates ready-to-publish deals automatically. Go from zero to a full deal catalog in under 2 minutes."
          panDirection="down"
        />
      </Sequence>

      {/* ── ★ Ava AI (Featured) ─────────────────────────────────── */}
      <Sequence from={SCENES.avaAI.start} durationInFrames={SCENES.avaAI.duration}>
        <ScreenshotScene
          screenshot="create-deal.png"
          step="★ Your AI Deal Strategist"
          title="Meet Ava — She Writes Your Deals"
          subtitle="Describe your offer in plain English. Ava generates the title, description, terms, discount, and a professional deal image for you. Review, adjust if needed, and publish — done in minutes."
          panDirection="right"
        />
      </Sequence>

      {/* ── Deal Types ─────────────────────────────────────────── */}
      <Sequence from={SCENES.dealTypes.start} durationInFrames={SCENES.dealTypes.duration}>
        <ScreenshotScene
          screenshot="deal-type-selection.png"
          step="Two Deal Types"
          title="Sponti vs. Steady"
          subtitle="Sponti Deals are flash offers (4-24 hrs) that create urgency. Steady Deals run 1-30 days for consistent traffic. Use both to maximize reach and revenue."
          panDirection="up"
        />
      </Sequence>

      {/* ── Payments ───────────────────────────────────────────── */}
      <Sequence from={SCENES.payments.start} durationInFrames={SCENES.payments.duration}>
        <ScreenshotScene
          screenshot="payments.png"
          step="Set Up Payments"
          title="Get Paid Directly"
          subtitle="Connect Stripe or PayPal for online deposits. Add Venmo, Zelle, or Cash App for in-person. Zero commissions — you keep every dollar."
          panDirection="right"
        />
      </Sequence>

      {/* ── Scan & Redeem ──────────────────────────────────────── */}
      <Sequence from={SCENES.scanRedeem.start} durationInFrames={SCENES.scanRedeem.duration}>
        <ScreenshotScene
          screenshot="scan-redeem.png"
          step="Redeem Customers"
          title="Scan & Collect"
          subtitle="Customer shows their QR code or 6-digit code. Tap Redeem to verify and complete the deal. Collect any remaining balance in person or via Stripe link."
          panDirection="down"
        />
      </Sequence>

      {/* ── ★ Analytics (Featured) ──────────────────────────────── */}
      <Sequence from={SCENES.analytics.start} durationInFrames={SCENES.analytics.duration}>
        <ScreenshotScene
          screenshot="analytics.png"
          step="★ Know What's Working"
          title="Real-Time Analytics Dashboard"
          subtitle="Track claims, redemptions, and conversion rates live. See revenue per deal. Compare Sponti vs. Steady performance. Identify your best-performing offers and double down."
          panDirection="right"
        />
      </Sequence>

      {/* ── ★ Social Media Auto-Posting (Featured) ──────────────── */}
      <Sequence from={SCENES.social.start} durationInFrames={SCENES.social.duration}>
        <ScreenshotScene
          screenshot="social.png"
          step="★ Coming Soon — Auto Social Posts"
          title="Publish a Deal, Post Everywhere"
          subtitle="Connect Facebook, Instagram, X, and TikTok. AI generates platform-optimized captions. Posts go out automatically when your deal goes live. More visibility, zero extra work."
          panDirection="up"
        />
      </Sequence>

      {/* ── Loyalty ────────────────────────────────────────────── */}
      <Sequence from={SCENES.loyalty.start} durationInFrames={SCENES.loyalty.duration}>
        <ScreenshotScene
          screenshot="loyalty.png"
          step="Loyalty Programs"
          title="Turn Visitors Into Regulars"
          subtitle="Set up punch cards or points rewards. Customers enroll automatically when they redeem a deal."
          panDirection="right"
        />
      </Sequence>

      {/* ── Outro / CTA ────────────────────────────────────────── */}
      <Sequence from={SCENES.outro.start} durationInFrames={SCENES.outro.duration}>
        <CTAOutro />
      </Sequence>

      {/* ── Persistent Logo Watermark ──────────────────────────── */}
      <Sequence from={0} durationInFrames={currentFrame}>
        <LogoWatermark />
      </Sequence>

      {/* ── Avatar overlay ──────────────────────────────────────── */}
      {avatarVideoUrl && (
        <Sequence from={0} durationInFrames={currentFrame}>
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

      {/* ── Voiceover Audio ──────────────────────────────────── */}
      <Sequence from={SCENES.intro.start} durationInFrames={SCENES.intro.duration}>
        <Audio src={staticFile('audio/tutorial/intro.mp3')} volume={1} />
      </Sequence>
      <Sequence from={SCENES.dashboard.start} durationInFrames={SCENES.dashboard.duration}>
        <Audio src={staticFile('audio/tutorial/dashboard.mp3')} volume={1} />
      </Sequence>
      <Sequence from={SCENES.fromWebsite.start} durationInFrames={SCENES.fromWebsite.duration}>
        <Audio src={staticFile('audio/tutorial/from-website.mp3')} volume={1} />
      </Sequence>
      <Sequence from={SCENES.avaAI.start} durationInFrames={SCENES.avaAI.duration}>
        <Audio src={staticFile('audio/tutorial/ava-ai.mp3')} volume={1} />
      </Sequence>
      <Sequence from={SCENES.dealTypes.start} durationInFrames={SCENES.dealTypes.duration}>
        <Audio src={staticFile('audio/tutorial/deal-types.mp3')} volume={1} />
      </Sequence>
      <Sequence from={SCENES.payments.start} durationInFrames={SCENES.payments.duration}>
        <Audio src={staticFile('audio/tutorial/payments.mp3')} volume={1} />
      </Sequence>
      <Sequence from={SCENES.scanRedeem.start} durationInFrames={SCENES.scanRedeem.duration}>
        <Audio src={staticFile('audio/tutorial/scan-redeem.mp3')} volume={1} />
      </Sequence>
      <Sequence from={SCENES.analytics.start} durationInFrames={SCENES.analytics.duration}>
        <Audio src={staticFile('audio/tutorial/analytics.mp3')} volume={1} />
      </Sequence>
      <Sequence from={SCENES.social.start} durationInFrames={SCENES.social.duration}>
        <Audio src={staticFile('audio/tutorial/social.mp3')} volume={1} />
      </Sequence>
      <Sequence from={SCENES.loyalty.start} durationInFrames={SCENES.loyalty.duration}>
        <Audio src={staticFile('audio/tutorial/loyalty.mp3')} volume={1} />
      </Sequence>
      <Sequence from={SCENES.outro.start} durationInFrames={SCENES.outro.duration}>
        <Audio src={staticFile('audio/tutorial/outro.mp3')} volume={1} />
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
