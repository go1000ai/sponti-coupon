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

// ── Logo Watermark ───────────────────────────────────────────────────────────
const LogoWatermark: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', top: 24, left: 28, zIndex: 30, opacity, padding: '6px 10px', background: 'rgba(0,0,0,0.35)', borderRadius: 10 }}>
      <Img src={staticFile('images/logo.png')} style={{ height: 50, width: 'auto', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.6))' }} />
    </div>
  );
};

// ── Math Line (slides in one at a time) ──────────────────────────────────────
const MathLine: React.FC<{ text: string; color?: string; fontSize?: number; startFrame: number; bold?: boolean }> = ({ text, color = '#FFF', fontSize = 36, startFrame, bold }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame: frame - startFrame, fps, config: { damping: 10, stiffness: 120 } });
  if (frame < startFrame) return null;
  return (
    <div style={{ opacity: progress, transform: `translateX(${interpolate(progress, [0, 1], [-30, 0])}px)`, fontSize, fontWeight: bold ? '900' : '600', color, fontFamily: 'Inter, sans-serif', textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
      {text}
    </div>
  );
};

// ── Info Bar ─────────────────────────────────────────────────────────────────
const InfoBar: React.FC<{ step?: string; title: string; subtitle: string }> = ({ step, title, subtitle }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const slideUp = spring({ frame: frame - 3, fps, config: { damping: 12, stiffness: 120 } });
  const barY = interpolate(slideUp, [0, 1], [100, 0]);
  const textOpacity = interpolate(frame, [8, 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, transform: `translateY(${barY}px)`, zIndex: 20 }}>
      <div style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.88) 25%, rgba(0,0,0,0.96))', padding: '45px 60px 35px' }}>
        {step && <div style={{ fontSize: 14, fontWeight: '800', color: '#E8632B', fontFamily: 'Inter, sans-serif', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 6, opacity: textOpacity }}>{step}</div>}
        <div style={{ fontSize: 36, fontWeight: '800', color: '#FFF', fontFamily: 'Inter, sans-serif', lineHeight: 1.2, marginBottom: 6, opacity: textOpacity }}>{title}</div>
        <div style={{ fontSize: 18, fontWeight: '400', color: 'rgba(255,255,255,0.75)', fontFamily: 'Inter, sans-serif', lineHeight: 1.5, maxWidth: 900, opacity: textOpacity }}>{subtitle}</div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SCENES
// ═══════════════════════════════════════════════════════════════════════════════

// ── 1. HOOK — "They take 20-50%" ─────────────────────────────────────────────
const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const zoom = interpolate(frame, [0, 400], [1, 1.08], { extrapolateRight: 'clamp' });
  const logoScale = spring({ frame: frame - 3, fps, config: { damping: 8, stiffness: 100 } });
  const t1 = interpolate(frame, [10, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const t2 = interpolate(frame, [22, 34], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', width: '100%', height: '100%', transform: `scale(${zoom})` }}>
        <Img src={staticFile('images/problem-struggling-ads.png')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div style={{ position: 'absolute', width: '100%', height: '100%', background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.35) 40%, rgba(0,0,0,0.75) 100%)' }} />
      <div style={{ position: 'absolute', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
        <div style={{ opacity: logoScale, transform: `scale(${logoScale})` }}>
          <Img src={staticFile('images/logo.png')} style={{ height: 90, width: 'auto', filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.5))' }} />
        </div>
        <div style={{ fontSize: 48, fontWeight: '800', color: '#FFF', fontFamily: 'Inter, sans-serif', textAlign: 'center', maxWidth: 850, lineHeight: 1.1, opacity: t1, textShadow: '0 3px 16px rgba(0,0,0,0.6)' }}>
          They Take <span style={{ color: '#EF4444' }}>20-50%</span> of Every Sale
        </div>
        <div style={{ fontSize: 26, color: 'rgba(255,255,255,0.9)', fontFamily: 'Inter, sans-serif', textAlign: 'center', maxWidth: 600, opacity: t2, textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
          It's time to stop giving away your money.
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── 2. PAIN MATH — step-by-step calculation ──────────────────────────────────
const PainMathScene: React.FC = () => {
  const frame = useCurrentFrame();
  const zoom = interpolate(frame, [0, 900], [1, 1.06], { extrapolateRight: 'clamp' });
  const glowPulse = frame > 570 ? Math.sin((frame - 570) * 0.08) * 0.15 + 0.85 : 0;

  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', width: '100%', height: '100%', transform: `scale(${zoom})` }}>
        <Img src={staticFile('images/vendor-tablet-dashboard.png')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div style={{ position: 'absolute', width: '100%', height: '100%', background: 'rgba(0,0,0,0.88)' }} />
      <div style={{ position: 'absolute', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', padding: '60px 120px', gap: 12 }}>
        {/* Audio: 28.5s = 855 frames
            0-2s:   "Fifty dollar deal?"
            2-5s:   "They take half. You only get twenty-five."
            5-9s:   "Multiply that by twenty customers a month"
            9-13s:  "That's five hundred dollars a month — lost to commissions"
            13-16s: "Over a year?"
            16-19s: "Six thousand dollars — gone."
            19-23s: "What would you do with an extra six thousand?"
            23-28s: "And those customers never come back..." */}
        <MathLine text="Your deal: $50" startFrame={5} fontSize={42} color="#FFF" bold />
        <MathLine text="Platform takes 50%  →  You get $25" startFrame={60} fontSize={38} color="#EF4444" />
        <MathLine text="× 20 customers / month" startFrame={160} fontSize={38} color="rgba(255,255,255,0.8)" />
        <MathLine text="= $500 / month lost to commissions" startFrame={270} fontSize={40} color="#EF4444" bold />
        <MathLine text="× 12 months" startFrame={400} fontSize={38} color="rgba(255,255,255,0.8)" />
        <MathLine text="= $6,000 / year — gone." startFrame={460} fontSize={50} color="#EF4444" bold />
        {frame >= 570 && (
          <div style={{ marginTop: 16, fontSize: 42, fontWeight: '800', color: `rgba(34, 197, 94, ${glowPulse + 0.15})`, fontFamily: 'Inter, sans-serif', textShadow: '0 2px 16px rgba(34,197,94,0.3)' }}>
            What would you do with an extra $6,000?
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

// ── 3. WHY SPONTICOUPON — big logo + no commissions, flat rate ────────────────
const WhySpontiScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logoScale = spring({ frame: frame - 5, fps, config: { damping: 8, stiffness: 60 } });

  // Synced to voice (26.2s = 786 frames):
  // 0-3s:   "This is exactly why we created SpontiCoupon"
  // 3-6s:   "We're not just a platform — we're your partner"
  // 6-10s:  "We do not take any commissions. Not a penny."
  // 10-16s: "You keep 100% of every deal, every dollar, every time."
  // 16-21s: "All we charge is a simple flat monthly rate"
  // 21-26s: "one single deal pays for your entire month. That's it."
  const line1 = interpolate(frame, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const line1b = interpolate(frame, [90, 100], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const line2 = interpolate(frame, [180, 190], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const line3 = interpolate(frame, [300, 310], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const line4 = interpolate(frame, [480, 490], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const line5 = interpolate(frame, [630, 640], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 40%, #1a1008 0%, #0a0a0a 55%, #000 100%)' }}>
      <div style={{ position: 'absolute', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(232,99,43,0.18) 0%, transparent 70%)', top: '10%', left: '25%' }} />

      <div style={{ position: 'absolute', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
        {/* Big logo */}
        <div style={{ opacity: logoScale, transform: `scale(${logoScale})` }}>
          <Img src={staticFile('images/logo.png')} style={{ height: 150, width: 'auto', filter: 'drop-shadow(0 8px 32px rgba(232,99,43,0.4))' }} />
        </div>

        {/* "This is why we created SpontiCoupon" */}
        <div style={{ marginTop: 12, fontSize: 24, fontWeight: '700', color: '#E8632B', fontFamily: 'Inter, sans-serif', letterSpacing: 2, textTransform: 'uppercase', opacity: line1 }}>
          This Is Why We Created SpontiCoupon
        </div>

        {/* "We're not just a platform — we're your partner" */}
        <div style={{ fontSize: 32, fontWeight: '700', color: 'rgba(255,255,255,0.9)', fontFamily: 'Inter, sans-serif', textAlign: 'center', opacity: line1b }}>
          We're Not Just a Platform — We're Your Partner
        </div>

        {/* "Zero commissions. Not a penny." */}
        <div style={{ fontSize: 42, fontWeight: '900', color: '#22C55E', fontFamily: 'Inter, sans-serif', textAlign: 'center', opacity: line2, textShadow: '0 2px 16px rgba(34,197,94,0.3)' }}>
          Zero Commissions. Not a Penny.
        </div>

        {/* "You keep 100%" */}
        <div style={{ fontSize: 34, fontWeight: '800', color: '#FFF', fontFamily: 'Inter, sans-serif', textAlign: 'center', maxWidth: 700, opacity: line3 }}>
          You Keep 100% — Every Deal, Every Dollar, Every Time
        </div>

        {/* "Flat monthly rate" */}
        <div style={{ fontSize: 26, fontWeight: '600', color: 'rgba(255,255,255,0.8)', fontFamily: 'Inter, sans-serif', textAlign: 'center', maxWidth: 600, opacity: line4 }}>
          All we charge is a simple flat monthly rate
        </div>

        {/* "One deal pays for itself" */}
        <div style={{ fontSize: 28, fontWeight: '700', color: '#E8632B', fontFamily: 'Inter, sans-serif', textAlign: 'center', opacity: line5 }}>
          One deal pays for your entire month. That's it.
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── 4. MEET AVA — 3 screenshots synced to voice ─────────────────────────────
const MeetAvaScene: React.FC = () => {
  const frame = useCurrentFrame();

  // Audio: 29.9s = 897 frames
  // 0-12s (0-360): "paste your website URL, Ava extracts..." → from-website
  // 12-20s (360-600): "Or just tell Ava..." → create-deal (Ava input)
  // 20-30s (600-897): "she writes title, description..." → ava-deal-form (generated output)
  const phase = frame < 360 ? 0 : frame < 600 ? 1 : 2;

  const zoom = interpolate(frame, [0, 900], [1.05, 1.12], { extrapolateRight: 'clamp' });
  const fade1 = interpolate(frame, [340, 380], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const fade2 = interpolate(frame, [580, 620], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const screenshots = ['screenshots/from-website.png', 'screenshots/create-deal.png', 'screenshots/ava-deal-form.png'];
  const steps = ['Meet Ava — Paste Your Website', 'Or Tell Ava What You Want', 'She Writes Everything'];
  const titles = ['Ava Extracts & Creates Your Deals', 'Describe Your Offer', 'Title, Description, Terms, Image — Done'];
  const subtitles = [
    'Services, pricing, images — extracted automatically. Ready to publish in minutes.',
    'Just tell Ava your deal idea in plain English.',
    'Review it, hit publish, and you\'re open for business.',
  ];

  return (
    <AbsoluteFill>
      {/* Phase 0: from-website */}
      <div style={{ position: 'absolute', width: '100%', height: '100%', transform: `scale(${zoom})`, opacity: phase === 0 ? 1 - fade1 : 0 }}>
        <Img src={staticFile(screenshots[0])} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      {/* Phase 1: create-deal */}
      <div style={{ position: 'absolute', width: '100%', height: '100%', transform: `scale(${zoom})`, opacity: phase === 0 ? fade1 : phase === 1 ? 1 - fade2 : 0 }}>
        <Img src={staticFile(screenshots[1])} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      {/* Phase 2: ava-deal-form */}
      {fade2 > 0 && (
        <div style={{ position: 'absolute', width: '100%', height: '100%', transform: `scale(${zoom})`, opacity: fade2 }}>
          <Img src={staticFile(screenshots[2])} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}

      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 120, background: 'linear-gradient(rgba(0,0,0,0.3), transparent)' }} />

      {/* Ava badge */}
      <div style={{ position: 'absolute', top: 24, right: 28, zIndex: 25, display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', borderRadius: 12, padding: '8px 14px' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #10B981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: '900', color: '#FFF', fontFamily: 'Inter, sans-serif' }}>A</div>
        <span style={{ color: '#FFF', fontSize: 14, fontWeight: '700', fontFamily: 'Inter, sans-serif' }}>Ava AI</span>
      </div>

      <InfoBar step={steps[phase]} title={titles[phase]} subtitle={subtitles[phase]} />
    </AbsoluteFill>
  );
};

// ── 5. DEAL TYPES — Sponti screenshot → Steady screenshot ────────────────────
const DealTypesScene: React.FC = () => {
  const frame = useCurrentFrame();
  // Audio 17.2s = 516 frames
  // 0-9s (0-270): Sponti deals
  // 9-17s (270-516): Steady deals
  const isSecondHalf = frame > 270;
  const zoom = interpolate(frame, [0, 500], [1.05, 1.12], { extrapolateRight: 'clamp' });
  const crossfade = interpolate(frame, [250, 290], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const step = isSecondHalf ? 'Steady Deals' : 'Sponti Deals';
  const title = isSecondHalf ? 'Consistent Traffic Around the Clock' : 'Flash Offers That Create Urgency';
  const subtitle = isSecondHalf
    ? 'Run for days or weeks — keep a constant flow of business coming in. Use both to maximize revenue.'
    : 'Time-limited deals that bring new customers fast. Countdowns drive action.';

  return (
    <AbsoluteFill>
      {/* Sponti screenshot */}
      <div style={{ position: 'absolute', width: '100%', height: '100%', transform: `scale(${zoom})`, opacity: 1 - crossfade }}>
        <Img src={staticFile('screenshots/sponti-deals.png')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      {/* Steady screenshot (crossfade in) */}
      {crossfade > 0 && (
        <div style={{ position: 'absolute', width: '100%', height: '100%', transform: `scale(${zoom})`, opacity: crossfade }}>
          <Img src={staticFile('screenshots/steady-deals.png')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 120, background: 'linear-gradient(rgba(0,0,0,0.3), transparent)' }} />
      <InfoBar step={step} title={title} subtitle={subtitle} />
    </AbsoluteFill>
  );
};

// ── 6. LOYALTY — 2 phases: loyalty → social auto-post ─────────────────────────
const LoyaltyScene: React.FC = () => {
  const frame = useCurrentFrame();

  // Audio: 36.8s = 1104 frames (steady deals section removed, clean cuts at silence gaps)
  // 0-25s (0-750):     Loyalty points, punch cards, auto-enroll, SpontiCoupon points → loyalty screenshot
  // 25-37s (750-1104):  Social auto-post → social screenshot + platform logos
  const phase = frame < 750 ? 0 : 1;

  const zoom = interpolate(frame, [0, 1100], [1.05, 1.12], { extrapolateRight: 'clamp' });
  const fade1 = interpolate(frame, [730, 770], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const screenshots = ['screenshots/loyalty.png', 'screenshots/social.png'];
  const steps = ['Keep Them Coming Back', 'Coming Soon — Social Auto-Post'];
  const titles = [
    'Your Loyalty + SpontiCoupon Points',
    'Auto-Post to All Your Channels',
  ];
  const subtitles = [
    'Punch cards, points rewards, auto-enrollment. SpontiCoupon points redeemable at all partners — a win-win.',
    'Connect Facebook, Instagram, X, and TikTok. AI generates platform-optimized captions and posts automatically when your deal goes live. More visibility, zero extra work.',
  ];

  // Social platform logos (phase 1)
  const logoOpacity = interpolate(frame, [770, 800], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill>
      {/* Phase 0: loyalty */}
      <div style={{ position: 'absolute', width: '100%', height: '100%', transform: `scale(${zoom})`, opacity: phase === 0 ? 1 - fade1 : 0 }}>
        <Img src={staticFile(screenshots[0])} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      {/* Phase 1: social */}
      {fade1 > 0 && (
        <div style={{ position: 'absolute', width: '100%', height: '100%', transform: `scale(${zoom})`, opacity: fade1 }}>
          <Img src={staticFile(screenshots[1])} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}

      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 120, background: 'linear-gradient(rgba(0,0,0,0.3), transparent)' }} />

      {/* Social platform logos overlay (phase 1) */}
      {phase === 1 && (
        <div style={{ position: 'absolute', top: 24, right: 28, zIndex: 25, display: 'flex', gap: 12, opacity: logoOpacity }}>
          {['Facebook', 'Instagram', 'X', 'TikTok'].map((name, i) => (
            <div key={i} style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', borderRadius: 10, padding: '6px 14px', color: '#FFF', fontSize: 13, fontWeight: '700', fontFamily: 'Inter, sans-serif' }}>
              {name}
            </div>
          ))}
        </div>
      )}

      <InfoBar step={steps[phase]} title={titles[phase]} subtitle={subtitles[phase]} />
    </AbsoluteFill>
  );
};

// ── 7. FOUNDERS SPECIAL ───────────────────────────────────────────────────────
const FoundersScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logoScale = spring({ frame: frame - 5, fps, config: { damping: 8, stiffness: 60 } });

  const badge = interpolate(frame, [30, 45], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const line1 = interpolate(frame, [60, 75], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const line2 = interpolate(frame, [120, 135], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const line3 = interpolate(frame, [200, 215], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const urgencyPulse = Math.sin(frame * 0.06) * 0.12 + 0.88;

  return (
    <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 40%, #0a1a08 0%, #0a0a0a 55%, #000 100%)' }}>
      <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,197,94,0.12) 0%, transparent 70%)', top: '15%', left: '30%' }} />

      <div style={{ position: 'absolute', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
        <div style={{ opacity: logoScale, transform: `scale(${logoScale})` }}>
          <Img src={staticFile('images/logo.png')} style={{ height: 100, width: 'auto', filter: 'drop-shadow(0 6px 24px rgba(232,99,43,0.4))' }} />
        </div>

        {/* Badge */}
        <div style={{ opacity: badge, transform: `scale(${badge})`, background: 'linear-gradient(135deg, #22C55E, #16A34A)', color: '#FFF', fontSize: 16, fontWeight: '800', fontFamily: 'Inter, sans-serif', padding: '8px 24px', borderRadius: 30, letterSpacing: 2, textTransform: 'uppercase', boxShadow: '0 4px 20px rgba(34,197,94,0.4)' }}>
          Founders Special — Limited Time
        </div>

        <div style={{ fontSize: 48, fontWeight: '900', color: '#FFF', fontFamily: 'Inter, sans-serif', textAlign: 'center', opacity: line1, textShadow: '0 2px 16px rgba(0,0,0,0.5)' }}>
          2 Months <span style={{ color: '#22C55E' }}>FREE</span> + 20% Off <span style={{ color: '#22C55E' }}>For Life</span>
        </div>

        <div style={{ fontSize: 26, fontWeight: '600', color: 'rgba(255,255,255,0.8)', fontFamily: 'Inter, sans-serif', textAlign: 'center', maxWidth: 600, opacity: line2 }}>
          No contracts. Cancel anytime. Zero risk — try it free for two months.
        </div>

        <div style={{ fontSize: 24, fontWeight: '700', color: `rgba(239, 68, 68, ${urgencyPulse})`, fontFamily: 'Inter, sans-serif', textAlign: 'center', opacity: line3 }}>
          Limited offer — once it's gone, it's gone.
        </div>

        {/* Fine print */}
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontFamily: 'Inter, sans-serif', textAlign: 'center', position: 'absolute', bottom: 24, opacity: line3 }}>
          *Free trial and 20% discount apply to Pro and Business plans. AI features available on Business and Enterprise plans.
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── 8. CTA — "They take 20-50%. We take zero." ──────────────────────────────
const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const zoom = interpolate(frame, [0, 600], [1, 1.06], { extrapolateRight: 'clamp' });
  const logoScale = spring({ frame: frame - 3, fps, config: { damping: 8, stiffness: 100 } });
  const t1 = interpolate(frame, [10, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const t2 = interpolate(frame, [22, 32], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const arrowOpacity = interpolate(frame, [38, 48], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const arrowBounce = Math.sin(frame * 0.14) * 8;

  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', width: '100%', height: '100%', transform: `scale(${zoom})` }}>
        <Img src={staticFile('images/busy-local-shop.png')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div style={{ position: 'absolute', width: '100%', height: '100%', background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.55), rgba(0,0,0,0.82))' }} />
      <div style={{ position: 'absolute', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <div style={{ opacity: logoScale, transform: `scale(${logoScale})` }}>
          <Img src={staticFile('images/logo.png')} style={{ height: 85, width: 'auto', filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.5))' }} />
        </div>
        <div style={{ fontSize: 48, fontWeight: '800', color: '#FFF', fontFamily: 'Inter, sans-serif', textAlign: 'center', maxWidth: 750, lineHeight: 1.1, opacity: t1, textShadow: '0 3px 16px rgba(0,0,0,0.6)' }}>
          They Take 20-50%. <span style={{ color: '#22C55E' }}>We Take Zero.</span>
        </div>
        <div style={{ fontSize: 24, color: 'rgba(255,255,255,0.9)', fontFamily: 'Inter, sans-serif', textAlign: 'center', maxWidth: 550, opacity: t2, textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
          No contracts. No risk. Try it free for two months.
        </div>
        <div style={{ opacity: arrowOpacity, transform: `translateY(${arrowBounce}px)`, marginTop: 12, fontSize: 40, color: '#E8632B' }}>▼</div>
      </div>
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPOSITION
// ═══════════════════════════════════════════════════════════════════════════════

export const DemoVideo: React.FC = () => {
  const FPS = 30;

  // Scene durations = audio + 1s buffer
  const sceneDefs = [
    { key: 'hook', seconds: 13 },           // audio: 11.9s
    { key: 'painMath', seconds: 30 },        // audio: 28.5s
    { key: 'whySponti', seconds: 25 },       // audio: 23.4s
    { key: 'meetAva', seconds: 32 },         // audio: 29.9s
    { key: 'dealTypes', seconds: 18 },       // audio: 17.2s
    { key: 'loyalty', seconds: 38 },         // audio: 36.8s (steady deals removed, clean silence cuts)
    { key: 'founders', seconds: 24 },        // audio: 22.8s
    { key: 'cta', seconds: 24 },             // audio: 22.2s
  ];

  let currentFrame = 0;
  const SCENES: Record<string, { start: number; duration: number }> = {};
  for (const s of sceneDefs) {
    const duration = s.seconds * FPS;
    SCENES[s.key] = { start: currentFrame, duration };
    currentFrame += duration;
  }

  // Total: ~164 seconds (~2:44)

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <Sequence from={SCENES.hook.start} durationInFrames={SCENES.hook.duration}><HookScene /></Sequence>
      <Sequence from={SCENES.painMath.start} durationInFrames={SCENES.painMath.duration}><PainMathScene /></Sequence>
      <Sequence from={SCENES.whySponti.start} durationInFrames={SCENES.whySponti.duration}><WhySpontiScene /></Sequence>
      <Sequence from={SCENES.meetAva.start} durationInFrames={SCENES.meetAva.duration}><MeetAvaScene /></Sequence>
      <Sequence from={SCENES.dealTypes.start} durationInFrames={SCENES.dealTypes.duration}><DealTypesScene /></Sequence>
      <Sequence from={SCENES.loyalty.start} durationInFrames={SCENES.loyalty.duration}><LoyaltyScene /></Sequence>
      <Sequence from={SCENES.founders.start} durationInFrames={SCENES.founders.duration}><FoundersScene /></Sequence>
      <Sequence from={SCENES.cta.start} durationInFrames={SCENES.cta.duration}><CTAScene /></Sequence>

      <Sequence from={0} durationInFrames={currentFrame}><LogoWatermark /></Sequence>

      {/* Voiceover — synced to scenes */}
      <Sequence from={SCENES.hook.start} durationInFrames={SCENES.hook.duration}><Audio src={staticFile('audio/demo/hook.mp3')} volume={1} /></Sequence>
      <Sequence from={SCENES.painMath.start} durationInFrames={SCENES.painMath.duration}><Audio src={staticFile('audio/demo/pain-math.mp3')} volume={1} /></Sequence>
      <Sequence from={SCENES.whySponti.start} durationInFrames={SCENES.whySponti.duration}><Audio src={staticFile('audio/demo/why-sponti.mp3')} volume={1} /></Sequence>
      <Sequence from={SCENES.meetAva.start} durationInFrames={SCENES.meetAva.duration}><Audio src={staticFile('audio/demo/meet-ava.mp3')} volume={1} /></Sequence>
      <Sequence from={SCENES.dealTypes.start} durationInFrames={SCENES.dealTypes.duration}><Audio src={staticFile('audio/demo/deal-types.mp3')} volume={1} /></Sequence>
      <Sequence from={SCENES.loyalty.start} durationInFrames={SCENES.loyalty.duration}><Audio src={staticFile('audio/demo/loyalty.mp3')} volume={1} /></Sequence>
      <Sequence from={SCENES.founders.start} durationInFrames={SCENES.founders.duration}><Audio src={staticFile('audio/demo/founders.mp3')} volume={1} /></Sequence>
      <Sequence from={SCENES.cta.start} durationInFrames={SCENES.cta.duration}><Audio src={staticFile('audio/demo/cta.mp3')} volume={1} /></Sequence>

      {/* Transitions */}
      {Object.values(SCENES).slice(1).map((scene, i) => (
        <SceneTransition key={i} startFrame={scene.start - 6} duration={12} />
      ))}
    </AbsoluteFill>
  );
};
