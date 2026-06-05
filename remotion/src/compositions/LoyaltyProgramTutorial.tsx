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
import {
  LoyaltyChooserMockup,
  LoyaltyPunchCardActive,
  LoyaltyPointsActive,
} from '../components/LoyaltyMockup';
import { ScanRewardEarnedMockup } from '../components/ScanMockup';
import { BrowserFrame } from '../components/MockupChrome';

// ── Watermark ──────────────────────────────────────────────────────────────────
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
        top: 28,
        left: 32,
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
          height: 46,
          width: 'auto',
          filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.6))',
        }}
      />
    </div>
  );
};

// ── Info bar ──────────────────────────────────────────────────────────────────
const InfoBar: React.FC<{
  step?: string;
  title: string;
  subtitle: string;
  accent?: string;
}> = ({ step, title, subtitle, accent = '#E8632B' }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const slideUp = spring({ frame: frame - 5, fps, config: { damping: 14, stiffness: 100 } });
  const barY = interpolate(slideUp, [0, 1], [120, 0]);
  const textOp = interpolate(frame, [12, 22], [0, 1], {
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
          background:
            'linear-gradient(transparent, rgba(0,0,0,0.85) 30%, rgba(0,0,0,0.95))',
          padding: '50px 60px 40px',
        }}
      >
        {step && (
          <div
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: accent,
              fontFamily: 'Inter, sans-serif',
              letterSpacing: 3,
              textTransform: 'uppercase',
              marginBottom: 8,
              opacity: textOp,
            }}
          >
            {step}
          </div>
        )}
        <div
          style={{
            fontSize: 36,
            fontWeight: 800,
            color: '#FFFFFF',
            fontFamily: 'Inter, sans-serif',
            lineHeight: 1.2,
            marginBottom: 8,
            opacity: textOp,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 400,
            color: 'rgba(255,255,255,0.78)',
            fontFamily: 'Inter, sans-serif',
            lineHeight: 1.5,
            maxWidth: 1100,
            opacity: textOp,
          }}
        >
          {subtitle}
        </div>
      </div>
    </div>
  );
};

// ── Background ─────────────────────────────────────────────────────────────────
const SceneBg: React.FC<{ tone?: 'sponti' | 'steady' }> = ({ tone = 'sponti' }) => {
  const fromColor = tone === 'steady' ? '#0e2230' : '#1f1208';
  const dot = tone === 'steady' ? 'rgba(41,171,226,0.18)' : 'rgba(232,99,43,0.18)';
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, ${fromColor} 0%, #000 100%)` }}>
      <div
        style={{
          position: 'absolute',
          width: 1100,
          height: 1100,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${dot}, transparent 60%)`,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          filter: 'blur(28px)',
        }}
      />
    </AbsoluteFill>
  );
};

// ── Hook: paper card vs digital ─────────────────────────────────────────────────
const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cardTilt = interpolate(frame, [0, 90], [-4, -16]);
  const cardOpacity = interpolate(frame, [80, 130], [1, 0.35], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const phoneScale = spring({ frame: frame - 90, fps, config: { damping: 12, stiffness: 90 } });
  const titleOp = interpolate(frame, [12, 28], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const subOp = interpolate(frame, [120, 145], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill>
      <SceneBg tone="sponti" />
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) rotate(${cardTilt}deg)`,
          opacity: cardOpacity,
        }}
      >
        {/* Paper punch card — charming, but easy to lose (the old way) */}
        <div
          style={{
            position: 'relative',
            width: 540,
            height: 332,
            background: 'linear-gradient(158deg, #f6fcfe 0%, #e7f6fc 55%, #d6eefa 100%)',
            borderRadius: 18,
            padding: '30px 34px',
            boxShadow:
              '0 28px 64px rgba(12,60,84,0.40), inset 0 1px 0 rgba(255,255,255,0.9), inset 0 0 0 1px rgba(41,171,226,0.25)',
            fontFamily: 'Inter, sans-serif',
            overflow: 'hidden',
          }}
        >
          {/* top accent ribbon — logo blue */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 7,
              background: 'linear-gradient(90deg, #1B86B8, #29ABE2, #1B86B8)',
            }}
          />
          {/* subtle ring mark */}
          <div
            style={{
              position: 'absolute',
              top: 158,
              right: 34,
              width: 96,
              height: 96,
              borderRadius: '50%',
              border: '9px solid rgba(41,171,226,0.10)',
            }}
          />
          <div style={{ fontSize: 13, color: '#1B86B8', fontWeight: 800, letterSpacing: 2.5, textTransform: 'uppercase' }}>
            Joe's Coffee
          </div>
          <div style={{ fontSize: 27, fontWeight: 800, color: '#0e3a4e', marginTop: 3 }}>
            Buy 10, Get 1 Free
          </div>
          <div style={{ fontSize: 13, color: '#4a8ba8', marginTop: 3, fontWeight: 500 }}>
            Thanks for being a regular ♥
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 15, marginTop: 22 }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
              const punched = n <= 3;
              return (
                <div
                  key={n}
                  style={{
                    aspectRatio: '1 / 1',
                    borderRadius: '50%',
                    border: punched ? 'none' : '2px solid rgba(41,171,226,0.45)',
                    background: punched
                      ? 'radial-gradient(circle at 36% 30%, #5cc3ec, #1E96CE 70%)'
                      : 'rgba(255,255,255,0.55)',
                    boxShadow: punched
                      ? 'inset 0 2px 5px rgba(8,60,86,0.40), 0 1px 0 rgba(255,255,255,0.6)'
                      : 'inset 0 1px 3px rgba(41,171,226,0.18)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFF',
                    fontWeight: 800,
                    fontSize: 16,
                  }}
                >
                  {punched ? '✓' : ''}
                </div>
              );
            })}
          </div>
          {/* a little corner of tape — feels real, not a harsh stamp */}
          <div
            style={{
              position: 'absolute',
              top: -8,
              right: 36,
              width: 78,
              height: 26,
              transform: 'rotate(6deg)',
              background: 'linear-gradient(180deg, rgba(150,210,236,0.75), rgba(110,190,224,0.7))',
              boxShadow: '0 2px 6px rgba(12,60,84,0.22)',
            }}
          />
        </div>
      </div>

      {/* Bouncy digital replacement */}
      <div
        style={{
          position: 'absolute',
          top: '52%',
          left: '50%',
          transform: `translate(-50%, -50%) scale(${phoneScale})`,
          opacity: phoneScale,
        }}
      >
        <div
          style={{
            width: 420,
            height: 220,
            background: 'linear-gradient(135deg, #E8632B, #FF8C42)',
            borderRadius: 28,
            padding: 22,
            boxShadow: '0 40px 80px rgba(232,99,43,0.5)',
            fontFamily: 'Inter, sans-serif',
            color: '#FFF',
            position: 'relative',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 2, opacity: 0.9 }}>
            COFFEE CLUB · DIGITAL LOYALTY
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8 }}>7 / 10 Punches</div>
          <div style={{ marginTop: 18, height: 16, background: 'rgba(255,255,255,0.25)', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: '70%', background: '#FFF' }} />
          </div>
          <div style={{ marginTop: 14, fontSize: 14, opacity: 0.95 }}>
            3 more for your free coffee — auto-tracked.
          </div>
        </div>
      </div>

      {/* Title */}
      <div
        style={{
          position: 'absolute',
          top: 100,
          left: 0,
          right: 0,
          textAlign: 'center',
          color: '#FFF',
          fontFamily: 'Inter, sans-serif',
          opacity: titleOp,
        }}
      >
        <div style={{ fontSize: 52, fontWeight: 800, lineHeight: 1.15 }}>
          Most deals are one-and-done.
          <br />
          <span style={{ color: '#E8632B' }}>Loyalty brings them back.</span>
        </div>
      </div>

      {/* Subtitle once phone arrives */}
      <div
        style={{
          position: 'absolute',
          bottom: 140,
          left: 0,
          right: 0,
          textAlign: 'center',
          color: 'rgba(255,255,255,0.85)',
          fontFamily: 'Inter, sans-serif',
          fontSize: 22,
          opacity: subOp,
        }}
      >
        Built in — automatic, and made to bring customers back.
      </div>
    </AbsoluteFill>
  );
};

// ── Browser shell for vendor pages ────────────────────────────────────────────
const VendorBrowser: React.FC<{ children: React.ReactNode; url: string }> = ({ children, url }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - 6, fps, config: { damping: 16, stiffness: 100 } });
  const y = interpolate(enter, [0, 1], [40, 0]);
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: 60,
        paddingBottom: 240,
      }}
    >
      <div style={{ transform: `translateY(${y}px)`, opacity: enter }}>
        <BrowserFrame url={url} width={1450} height={760}>
          {children}
        </BrowserFrame>
      </div>
    </div>
  );
};

// ── Outro CTA ──────────────────────────────────────────────────────────────────
const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logoScale = spring({ frame: frame - 5, fps, config: { damping: 10, stiffness: 80 } });
  const headOp = interpolate(frame, [15, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const subOp = interpolate(frame, [35, 50], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const urlOp = interpolate(frame, [55, 70], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 50%, #1a1a1a, #000)' }}>
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 22,
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <div style={{ opacity: logoScale, transform: `scale(${logoScale})` }}>
          <Img src={staticFile('images/logo.png')} style={{ height: 90 }} />
        </div>
        <div
          style={{
            fontSize: 48,
            fontWeight: 800,
            color: '#FFF',
            textAlign: 'center',
            opacity: headOp,
            maxWidth: 1300,
            lineHeight: 1.15,
          }}
        >
          Included <span style={{ color: '#E8632B' }}>free</span> on <span style={{ color: '#E8632B' }}>Pro</span> and <span style={{ color: '#E8632B' }}>Business</span>.
        </div>
        <div
          style={{
            fontSize: 24,
            color: 'rgba(255,255,255,0.85)',
            textAlign: 'center',
            opacity: subOp,
            maxWidth: 900,
          }}
        >
          We're your partner — when your customers come back, you grow, and so do we.
        </div>
        <div
          style={{
            marginTop: 14,
            padding: '14px 28px',
            background: '#E8632B',
            color: '#FFF',
            borderRadius: 12,
            fontSize: 22,
            fontWeight: 800,
            opacity: urlOp,
            boxShadow: '0 10px 30px rgba(232,99,43,0.45)',
          }}
        >
          sponticoupon.com/vendor/loyalty
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── Main composition ──────────────────────────────────────────────────────────
export const LoyaltyProgramTutorial: React.FC = () => {
  const FPS = 30;

  // Durations padded ~1.5s above the ElevenLabs (Rachel) voiceover lengths.
  const scenes = [
    { key: 'hook', seconds: 21 },         // VO 19.6s
    { key: 'twoTypes', seconds: 14 },     // 12.6s
    { key: 'punchCard', seconds: 24 },    // 19.2s
    { key: 'points', seconds: 22 },       // 20.5s
    { key: 'rewardEarned', seconds: 17 }, // 13.9s
    { key: 'outro', seconds: 23 },        // 21.5s
  ];

  let cursor = 0;
  const S: Record<string, { start: number; duration: number }> = {};
  for (const s of scenes) {
    const d = s.seconds * FPS;
    S[s.key] = { start: cursor, duration: d };
    cursor += d;
  }
  // total = 91s — a touch over 80s target, but close enough.

  return (
    <AbsoluteFill style={{ backgroundColor: '#000', fontFamily: 'Inter, sans-serif' }}>
      {/* 1: Hook */}
      <Sequence from={S.hook.start} durationInFrames={S.hook.duration}>
        <HookScene />
      </Sequence>

      {/* 2: Two program types */}
      <Sequence from={S.twoTypes.start} durationInFrames={S.twoTypes.duration}>
        <SceneBg tone="sponti" />
        <VendorBrowser url="sponticoupon.com/vendor/loyalty">
          <LoyaltyChooserMockup />
        </VendorBrowser>
        <InfoBar
          step="Pick a Program"
          title="Two options — Punch Card or Points."
          subtitle="From /vendor/loyalty, choose whichever fits your business. You can switch later."
        />
      </Sequence>

      {/* 3: Punch card */}
      <Sequence from={S.punchCard.start} durationInFrames={S.punchCard.duration}>
        <SceneBg tone="sponti" />
        <VendorBrowser url="sponticoupon.com/vendor/loyalty/punch-card">
          <LoyaltyPunchCardActive />
        </VendorBrowser>
        <InfoBar
          step="Punch Cards"
          title='"Buy 10, get 1 free." Auto-punched on every claim.'
          subtitle="Customers see live progress on their phone. No paper card, no app to install, no extra step for you at the counter."
        />
      </Sequence>

      {/* 4: Points */}
      <Sequence from={S.points.start} durationInFrames={S.points.duration}>
        <SceneBg tone="steady" />
        <VendorBrowser url="sponticoupon.com/vendor/loyalty/points">
          <LoyaltyPointsActive />
        </VendorBrowser>
        <InfoBar
          step="Points"
          title="1 point per dollar. Redeem 100 for $10 off."
          subtitle="Better for higher-ticket businesses — restaurants, salons, auto shops. Customers earn on every dollar and cash in at threshold."
          accent="#29ABE2"
        />
      </Sequence>

      {/* 5: Reward earned at scan */}
      <Sequence from={S.rewardEarned.start} durationInFrames={S.rewardEarned.duration}>
        <SceneBg tone="sponti" />
        <VendorBrowser url="sponticoupon.com/vendor/scan">
          <ScanRewardEarnedMockup />
        </VendorBrowser>
        <InfoBar
          step="At the Counter"
          title='Big "Reward Earned" badge at scan time.'
          subtitle="When the customer hits their threshold, you see it instantly. Honor the reward on the spot — and they leave happy."
        />
      </Sequence>

      {/* 6: Outro CTA */}
      <Sequence from={S.outro.start} durationInFrames={S.outro.duration}>
        <Outro />
      </Sequence>

      {/* Watermark */}
      <Sequence from={0} durationInFrames={cursor}>
        <LogoWatermark />
      </Sequence>

      {/* Voiceover */}
      <Sequence from={S.hook.start} durationInFrames={S.hook.duration}>
        <Audio src={staticFile('audio/loyalty-program/hook.mp3')} volume={1} />
      </Sequence>
      <Sequence from={S.twoTypes.start} durationInFrames={S.twoTypes.duration}>
        <Audio src={staticFile('audio/loyalty-program/two-types.mp3')} volume={1} />
      </Sequence>
      <Sequence from={S.punchCard.start} durationInFrames={S.punchCard.duration}>
        <Audio src={staticFile('audio/loyalty-program/punch-card.mp3')} volume={1} />
      </Sequence>
      <Sequence from={S.points.start} durationInFrames={S.points.duration}>
        <Audio src={staticFile('audio/loyalty-program/points.mp3')} volume={1} />
      </Sequence>
      <Sequence from={S.rewardEarned.start} durationInFrames={S.rewardEarned.duration}>
        <Audio src={staticFile('audio/loyalty-program/reward-earned.mp3')} volume={1} />
      </Sequence>
      <Sequence from={S.outro.start} durationInFrames={S.outro.duration}>
        <Audio src={staticFile('audio/loyalty-program/outro.mp3')} volume={1} />
      </Sequence>

      {/* Transitions */}
      {Object.values(S)
        .slice(1)
        .map((scene, i) => (
          <SceneTransition key={i} startFrame={scene.start - 8} />
        ))}
    </AbsoluteFill>
  );
};

export const LOYALTY_PROGRAM_FRAMES = 30 * (21 + 14 + 24 + 22 + 17 + 23);
