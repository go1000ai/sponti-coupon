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
import { PhoneFrame } from '../components/MockupChrome';
import {
  PhoneDealDetail,
  PhoneMyDeals,
  PhoneStripeCheckout,
} from '../components/CustomerMockups';

// ════════════════════════════════════════════════════════════════════════════
//  Customer-facing "How SpontiCoupon Works" — vertical 9:16 explainer.
//  Sibling to CustomerRedemptionTutorial (which is the vendor-side payment
//  deep-dive). This one speaks to the CUSTOMER: browse → claim → code →
//  redeem → rewards. Brand: Sponti orange #E8632B, Steady blue #29ABE2,
//  rewards green #15803D.
// ════════════════════════════════════════════════════════════════════════════

const ORANGE = '#E8632B';
const BLUE = '#29ABE2';
const GREEN = '#15803D';

// ── Persistent watermark ───────────────────────────────────────────────────────
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
        top: 34,
        left: 34,
        zIndex: 30,
        opacity,
        padding: '8px 12px',
        background: 'rgba(0,0,0,0.35)',
        borderRadius: 12,
      }}
    >
      <Img
        src={staticFile('images/logo.png')}
        style={{ height: 52, width: 'auto', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.6))' }}
      />
    </div>
  );
};

// ── Scene background (radial glow) ─────────────────────────────────────────────
const SceneBg: React.FC<{ tone?: 'sponti' | 'steady' | 'green' }> = ({ tone = 'sponti' }) => {
  const from = tone === 'steady' ? '#0e2230' : tone === 'green' ? '#0d2417' : '#1f1208';
  const dot =
    tone === 'steady' ? 'rgba(41,171,226,0.20)' : tone === 'green' ? 'rgba(21,128,61,0.22)' : 'rgba(232,99,43,0.20)';
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 42%, ${from} 0%, #000 100%)` }}>
      <div
        style={{
          position: 'absolute',
          width: 1100,
          height: 1100,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${dot}, transparent 60%)`,
          top: '38%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          filter: 'blur(34px)',
        }}
      />
    </AbsoluteFill>
  );
};

// ── Bottom info bar (vertical-optimized) ───────────────────────────────────────
const InfoBar: React.FC<{
  step?: string;
  title: string;
  subtitle: string;
  accent?: string;
}> = ({ step, title, subtitle, accent = ORANGE }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const slideUp = spring({ frame: frame - 5, fps, config: { damping: 14, stiffness: 100 } });
  const barY = interpolate(slideUp, [0, 1], [160, 0]);
  const textOpacity = interpolate(frame, [12, 24], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, transform: `translateY(${barY}px)`, zIndex: 20 }}>
      <div
        style={{
          background: 'linear-gradient(transparent, rgba(0,0,0,0.88) 28%, rgba(0,0,0,0.97))',
          padding: '110px 64px 80px',
        }}
      >
        {step && (
          <div
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: accent,
              fontFamily: 'Inter, sans-serif',
              letterSpacing: 4,
              textTransform: 'uppercase',
              marginBottom: 12,
              opacity: textOpacity,
            }}
          >
            {step}
          </div>
        )}
        <div
          style={{
            fontSize: 52,
            fontWeight: 800,
            color: '#FFFFFF',
            fontFamily: 'Inter, sans-serif',
            lineHeight: 1.18,
            marginBottom: 14,
            opacity: textOpacity,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 400,
            color: 'rgba(255,255,255,0.80)',
            fontFamily: 'Inter, sans-serif',
            lineHeight: 1.45,
            opacity: textOpacity,
          }}
        >
          {subtitle}
        </div>
      </div>
    </div>
  );
};

// ── Reusable stage wrapper (centers content above the info bar) ────────────────
const Stage: React.FC<{ children: React.ReactNode; gap?: number; pt?: number }> = ({
  children,
  gap = 40,
  pt = 150,
}) => (
  <AbsoluteFill
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap,
      paddingTop: pt,
      paddingBottom: 560,
      fontFamily: 'Inter, sans-serif',
    }}
  >
    {children}
  </AbsoluteFill>
);

// ── Scale wrapper so a fixed-width mockup can be shrunk cleanly ─────────────────
const Scaled: React.FC<{ scale: number; w: number; h: number; children: React.ReactNode }> = ({
  scale,
  w,
  h,
  children,
}) => (
  <div style={{ width: w * scale, height: h * scale, position: 'relative' }}>
    <div style={{ position: 'absolute', top: 0, left: 0, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
      {children}
    </div>
  </div>
);

// ── Spring-in helper ───────────────────────────────────────────────────────────
const useEnter = (delaySec: number) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delaySec * fps, fps, config: { damping: 15, stiffness: 100 } });
  return { opacity: s, y: interpolate(s, [0, 1], [50, 0]) };
};

// ════════════════════════════════════════════════════════════════════════════
//  SCENE 1 · HOOK
// ════════════════════════════════════════════════════════════════════════════
const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logoScale = spring({ frame: frame - 6, fps, config: { damping: 10, stiffness: 80 } });
  const titleOp = interpolate(frame, [16, 30], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const titleY = interpolate(frame, [16, 30], [40, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const subOp = interpolate(frame, [40, 56], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: 'radial-gradient(ellipse at center, #221206 0%, #000 100%)' }}>
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 34,
          padding: 70,
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <div style={{ opacity: logoScale, transform: `scale(${logoScale})` }}>
          <Img src={staticFile('images/logo.png')} style={{ height: 170, filter: 'drop-shadow(0 6px 24px rgba(0,0,0,0.5))' }} />
        </div>
        <div
          style={{
            fontSize: 92,
            fontWeight: 900,
            color: '#FFF',
            textAlign: 'center',
            lineHeight: 1.08,
            opacity: titleOp,
            transform: `translateY(${titleY}px)`,
            textShadow: '0 4px 24px rgba(0,0,0,0.6)',
          }}
        >
          Local deals.<br />
          <span style={{ color: ORANGE }}>For free.</span>
        </div>
        <div
          style={{
            fontSize: 34,
            color: 'rgba(255,255,255,0.85)',
            textAlign: 'center',
            opacity: subOp,
            maxWidth: 820,
            lineHeight: 1.4,
          }}
        >
          Exclusive offers from the businesses near you — here&apos;s how it works.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ════════════════════════════════════════════════════════════════════════════
//  SCENE 2 · BROWSE — two deal types in a phone feed
// ════════════════════════════════════════════════════════════════════════════
const Countdown: React.FC = () => {
  const frame = useCurrentFrame();
  // tick a fake countdown so it feels live
  const total = 4 * 3600 + 23 * 60 + 14 - Math.floor(frame / 3);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
      {pad(h)}:{pad(m)}:{pad(s)} left
    </span>
  );
};

const DealFeedCard: React.FC<{
  type: 'flash' | 'steady';
  title: string;
  vendor: string;
  price: string;
  orig: string;
  off: string;
}> = ({ type, title, vendor, price, orig, off }) => {
  const isFlash = type === 'flash';
  const accent = isFlash ? ORANGE : BLUE;
  return (
    <div
      style={{
        background: '#FFF',
        borderRadius: 18,
        overflow: 'hidden',
        boxShadow: '0 10px 30px rgba(0,0,0,0.10)',
        border: '1px solid rgba(0,0,0,0.05)',
      }}
    >
      <div
        style={{
          height: 96,
          background: isFlash
            ? 'linear-gradient(135deg, #E8632B, #FF8C42)'
            : 'linear-gradient(135deg, #29ABE2, #5BC3EE)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          padding: 12,
        }}
      >
        <div
          style={{
            background: 'rgba(0,0,0,0.45)',
            color: '#FFF',
            padding: '5px 11px',
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: 1,
            borderRadius: 999,
          }}
        >
          {isFlash ? '🔥 SPONTI COUPON' : '🏷️ STEADY DEAL'}
        </div>
        <div style={{ background: '#FFF', color: accent, padding: '5px 11px', fontSize: 13, fontWeight: 900, borderRadius: 999 }}>
          {off}
        </div>
      </div>
      <div style={{ padding: '12px 14px 14px' }}>
        <div style={{ fontSize: 11, color: '#999', fontWeight: 700, letterSpacing: 1 }}>{vendor}</div>
        <div style={{ fontSize: 18, fontWeight: 800, marginTop: 2, color: '#111', lineHeight: 1.15 }}>{title}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: accent }}>{price}</div>
          <div style={{ fontSize: 14, color: '#999', textDecoration: 'line-through' }}>{orig}</div>
        </div>
        <div
          style={{
            marginTop: 10,
            fontSize: 13,
            fontWeight: 800,
            color: isFlash ? ORANGE : '#16A34A',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {isFlash ? <>⏱ <Countdown /></> : <>✓ Available now</>}
        </div>
      </div>
    </div>
  );
};

const BrowseScene: React.FC = () => {
  const flash = useEnter(0.5);
  const steady = useEnter(1.4);
  return (
    <Stage gap={28}>
      <PhoneFrame width={420}>
        <div style={{ height: 30 }} />
        <div style={{ padding: '12px 18px 4px' }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#111' }}>Deals near you</div>
          <div
            style={{
              marginTop: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: '#F1F1EE',
              borderRadius: 12,
              padding: '9px 12px',
              fontSize: 13,
              color: '#888',
            }}
          >
            🔍 Search · Category · Within 25 mi
          </div>
        </div>
        <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ opacity: flash.opacity, transform: `translateY(${flash.y}px)` }}>
            <DealFeedCard
              type="flash"
              vendor="LUNA TACO BAR — ORLANDO"
              title="2-for-1 Street Tacos"
              price="$8"
              orig="$16"
              off="50% OFF"
            />
          </div>
          <div style={{ opacity: steady.opacity, transform: `translateY(${steady.y}px)` }}>
            <DealFeedCard
              type="steady"
              vendor="BLOOM NAIL STUDIO — ORLANDO"
              title="Signature Gel Manicure"
              price="$29"
              orig="$45"
              off="35% OFF"
            />
          </div>
        </div>
      </PhoneFrame>
      <InfoBar
        step="Step 1 · Browse"
        title="Two kinds of deals."
        subtitle="Sponti Coupons are flash deals — limited time, limited spots. Steady Deals stick around. Filter by category or distance to find what's near you."
      />
    </Stage>
  );
};

// ════════════════════════════════════════════════════════════════════════════
//  SCENE 3 · CLAIM & PAY
// ════════════════════════════════════════════════════════════════════════════
const PayChip: React.FC<{ label: string; icon: string }> = ({ label, icon }) => (
  <div
    style={{
      background: 'rgba(255,255,255,0.10)',
      border: '1px solid rgba(255,255,255,0.18)',
      color: '#FFF',
      padding: '12px 18px',
      borderRadius: 14,
      fontSize: 24,
      fontWeight: 700,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      backdropFilter: 'blur(6px)',
    }}
  >
    <span style={{ fontSize: 26 }}>{icon}</span> {label}
  </div>
);

const ClaimPayScene: React.FC = () => {
  const phone = useEnter(0.3);
  const chips = useEnter(1.6);
  const rule = useEnter(3.4);
  return (
    <Stage gap={36} pt={120}>
      <div style={{ opacity: phone.opacity, transform: `translateY(${phone.y}px)` }}>
        <Scaled scale={0.92} w={360} h={780}>
          <PhoneDealDetail variant="deposit" />
        </Scaled>
      </div>

      <div
        style={{
          opacity: chips.opacity,
          transform: `translateY(${chips.y}px)`,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 14,
          justifyContent: 'center',
          maxWidth: 820,
        }}
      >
        <PayChip icon="💳" label="Card" />
        <PayChip icon="🅥" label="Venmo" />
        <PayChip icon="⚡" label="Zelle" />
        <PayChip icon="💲" label="Cash App" />
      </div>

      <div
        style={{
          opacity: rule.opacity,
          transform: `translateY(${rule.y}px)`,
          background: 'rgba(232,99,43,0.14)',
          border: '1px solid rgba(232,99,43,0.5)',
          color: '#FFF',
          borderRadius: 16,
          padding: '16px 26px',
          fontSize: 25,
          fontWeight: 700,
          textAlign: 'center',
          lineHeight: 1.4,
          maxWidth: 880,
        }}
      >
        Deposit: card · Venmo · Zelle · Cash App&nbsp;&nbsp;|&nbsp;&nbsp;Pay in full:{' '}
        <strong style={{ color: '#FF9F6F' }}>card</strong>&nbsp;&nbsp;|&nbsp;&nbsp;Balance left over:{' '}
        <strong style={{ color: '#FF9F6F' }}>cash, at the business</strong>
      </div>

      <InfoBar
        step="Step 2 · Claim &amp; Pay"
        title="Tap Claim Deal."
        subtitle="Most deals are instant and free. Flash deals may ask for a small deposit, or full price up front — then you pay any balance at the business."
      />
    </Stage>
  );
};

// ════════════════════════════════════════════════════════════════════════════
//  SCENE 4 · YOUR CODE
// ════════════════════════════════════════════════════════════════════════════
const YourCodeScene: React.FC = () => {
  const phone = useEnter(0.3);
  const tag = useEnter(1.4);
  return (
    <Stage gap={34}>
      <div style={{ opacity: phone.opacity, transform: `translateY(${phone.y}px)` }}>
        <Scaled scale={1.05} w={360} h={780}>
          <PhoneMyDeals status="deposit-paid" code="8 1 4 2 6 5" />
        </Scaled>
      </div>
      <div
        style={{
          opacity: tag.opacity,
          transform: `translateY(${tag.y}px)`,
          display: 'flex',
          gap: 16,
          alignItems: 'center',
        }}
      >
        <div
          style={{
            background: '#FFF',
            color: ORANGE,
            borderRadius: 999,
            padding: '14px 26px',
            fontSize: 26,
            fontWeight: 900,
            boxShadow: '0 10px 30px rgba(232,99,43,0.4)',
          }}
        >
          📱 6-digit code
        </div>
        <div style={{ color: '#FFF', fontSize: 30, fontWeight: 800 }}>+</div>
        <div
          style={{
            background: '#FFF',
            color: '#111',
            borderRadius: 999,
            padding: '14px 26px',
            fontSize: 26,
            fontWeight: 900,
            boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
          }}
        >
          ▦ QR code
        </div>
      </div>
      <InfoBar
        step="Step 3 · Your Code"
        title="Instant redemption code."
        subtitle="The moment you claim, you get a 6-digit code and a QR code. Find them any time under My Deals."
      />
    </Stage>
  );
};

// ════════════════════════════════════════════════════════════════════════════
//  SCENE 5 · REDEEM AT THE BUSINESS (customer POV)
// ════════════════════════════════════════════════════════════════════════════
const RedeemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const phone = useEnter(0.3);
  // The green "Redeemed" stamp drops in ~3.4s, after the "they scan it" beat.
  const stampStart = 3.4 * fps;
  const stamp = spring({ frame: frame - stampStart, fps, config: { damping: 11, stiffness: 120 } });
  const stampShow = frame >= stampStart;
  const sweep = interpolate(frame % 70, [0, 70], [0, 1]);

  return (
    <Stage gap={40}>
      <div style={{ position: 'relative', opacity: phone.opacity, transform: `translateY(${phone.y}px)` }}>
        <Scaled scale={1.05} w={360} h={780}>
          <PhoneMyDeals status="deposit-paid" code="8 1 4 2 6 5" />
        </Scaled>

        {/* scan sweep over the phone before it's verified */}
        {!stampShow && (
          <div
            style={{
              position: 'absolute',
              left: 30,
              right: 30,
              top: interpolate(sweep, [0, 1], [180, 600]),
              height: 4,
              background: 'linear-gradient(90deg, transparent, #29ABE2, transparent)',
              boxShadow: '0 0 14px 3px rgba(41,171,226,0.7)',
              borderRadius: 4,
            }}
          />
        )}

        {/* green verified stamp */}
        {stampShow && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: `translate(-50%, -50%) scale(${stamp})`,
              opacity: stamp,
              background: GREEN,
              color: '#FFF',
              borderRadius: 28,
              padding: '28px 40px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
              boxShadow: '0 20px 60px rgba(21,128,61,0.6)',
              border: '4px solid rgba(255,255,255,0.5)',
            }}
          >
            <div style={{ fontSize: 72, lineHeight: 1 }}>✓</div>
            <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: 1 }}>REDEEMED</div>
          </div>
        )}
      </div>

      <InfoBar
        step="Step 4 · Redeem"
        title="Show it. They scan it. Done."
        subtitle="Show your code or QR to the staff — they scan it and it's verified instantly. Pay anything you still owe right there, directly to the business."
        accent={BLUE}
      />
    </Stage>
  );
};

// ════════════════════════════════════════════════════════════════════════════
//  SCENE 6 · TWO KINDS OF REWARDS
// ════════════════════════════════════════════════════════════════════════════
const BusinessRewardCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // punches fill up over time, then "reward ready" lights
  const filled = Math.min(10, 6 + Math.floor(interpolate(frame, [10, 70], [0, 4], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })));
  const ready = filled >= 10;
  const readySpring = spring({ frame: frame - 72, fps, config: { damping: 12, stiffness: 120 } });
  return (
    <div
      style={{
        flex: 1,
        background: 'linear-gradient(160deg, #FFF4EC 0%, #FFFBF8 100%)',
        borderRadius: 26,
        padding: 30,
        border: '1px solid #F6DCC8',
        boxShadow: '0 18px 50px rgba(232,99,43,0.18)',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: 'linear-gradient(135deg, #E8632B, #FF8C42)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 26,
          }}
        >
          ☕
        </div>
        <div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#2A1B12' }}>Business Rewards</div>
          <div style={{ fontSize: 18, color: '#9A7A68' }}>Luna Taco Bar · punch card</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
        {Array.from({ length: 10 }).map((_, i) => {
          const punched = i < filled;
          return (
            <div
              key={i}
              style={{
                aspectRatio: '1 / 1',
                borderRadius: '50%',
                border: punched ? 'none' : '3px solid #F1C9AE',
                background: punched ? 'radial-gradient(circle at 36% 30%, #FF8C42, #E8632B 72%)' : '#FFF',
                boxShadow: punched ? '0 3px 8px rgba(232,99,43,0.35)' : 'inset 0 1px 3px rgba(232,99,43,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFF',
                fontWeight: 800,
                fontSize: 26,
              }}
            >
              {punched ? '✓' : ''}
            </div>
          );
        })}
      </div>
      {ready ? (
        <div
          style={{
            transform: `scale(${readySpring})`,
            opacity: readySpring,
            background: GREEN,
            color: '#FFF',
            borderRadius: 14,
            padding: '14px',
            textAlign: 'center',
            fontWeight: 900,
            fontSize: 24,
          }}
        >
          🎁 Free taco plate — ready!
        </div>
      ) : (
        <div style={{ textAlign: 'center', fontWeight: 800, color: ORANGE, fontSize: 22 }}>
          {filled} of 10 — keep going!
        </div>
      )}
      <div style={{ fontSize: 19, color: '#7d5b48', textAlign: 'center', lineHeight: 1.35 }}>
        Redeemable <strong>only at that business</strong>.
      </div>
    </div>
  );
};

const SpontiPointsCard: React.FC = () => {
  const frame = useCurrentFrame();
  const pts = Math.round(interpolate(frame, [10, 75], [475, 620], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  return (
    <div
      style={{
        flex: 1,
        background: 'linear-gradient(160deg, #E8632B 0%, #F59E0B 60%, #FF8C42 100%)',
        borderRadius: 26,
        padding: 30,
        boxShadow: '0 18px 50px rgba(232,99,43,0.35)',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        color: '#FFF',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
          }}
        >
          ✨
        </div>
        <div>
          <div style={{ fontSize: 26, fontWeight: 900 }}>SpontiPoints</div>
          <div style={{ fontSize: 18, opacity: 0.9 }}>Your cash-back wallet</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <div style={{ fontSize: 76, fontWeight: 900, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{pts}</div>
        <div style={{ fontSize: 26, fontWeight: 700, opacity: 0.9 }}>pts</div>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1, background: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 900 }}>+25</div>
          <div style={{ fontSize: 16, opacity: 0.9 }}>per redeem</div>
        </div>
        <div style={{ flex: 1, background: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 900 }}>100 = $1</div>
          <div style={{ fontSize: 16, opacity: 0.9 }}>credit</div>
        </div>
      </div>
      <div style={{ background: '#FFF', color: ORANGE, borderRadius: 14, padding: '14px', textAlign: 'center', fontWeight: 900, fontSize: 24 }}>
        Redeem for Credit →
      </div>
      <div style={{ fontSize: 19, textAlign: 'center', opacity: 0.95, lineHeight: 1.35 }}>
        Spend it with <strong>any Sponti vendor</strong>.
      </div>
    </div>
  );
};

const RewardsScene: React.FC = () => {
  const left = useEnter(0.6);
  const right = useEnter(2.6);
  return (
    <Stage gap={30} pt={150}>
      <div
        style={{
          fontSize: 30,
          fontWeight: 800,
          color: 'rgba(255,255,255,0.65)',
          letterSpacing: 4,
          textTransform: 'uppercase',
        }}
      >
        Two ways you earn
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 26, width: 920 }}>
        <div style={{ opacity: left.opacity, transform: `translateY(${left.y}px)`, display: 'flex' }}>
          <BusinessRewardCard />
        </div>
        <div style={{ opacity: right.opacity, transform: `translateY(${right.y}px)`, display: 'flex' }}>
          <SpontiPointsCard />
        </div>
      </div>
      <InfoBar
        step="Step 5 · Rewards"
        title="Two kinds of rewards."
        subtitle="Business Rewards = free stuff from that shop. SpontiPoints = cash-back credit you can use with any Sponti vendor. When one's ready, you'll see the Reward Ready banner."
        accent={GREEN}
      />
    </Stage>
  );
};

// ════════════════════════════════════════════════════════════════════════════
//  SCENE 7 · OUTRO / CTA
// ════════════════════════════════════════════════════════════════════════════
const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logoScale = spring({ frame: frame - 5, fps, config: { damping: 10, stiffness: 80 } });
  const headOp = interpolate(frame, [16, 32], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const ctaOp = interpolate(frame, [44, 60], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 45%, #221206, #000)' }}>
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 30,
          padding: 70,
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <div style={{ opacity: logoScale, transform: `scale(${logoScale})` }}>
          <Img src={staticFile('images/logo.png')} style={{ height: 130, filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.5))' }} />
        </div>
        <div style={{ fontSize: 78, fontWeight: 900, color: '#FFF', textAlign: 'center', lineHeight: 1.1, opacity: headOp }}>
          Real deals.<br />
          <span style={{ color: ORANGE }}>Zero cost to you.</span>
        </div>
        <div style={{ fontSize: 32, color: 'rgba(255,255,255,0.85)', textAlign: 'center', opacity: headOp, maxWidth: 760 }}>
          Start saving with SpontiCoupon today.
        </div>
        <div
          style={{
            marginTop: 10,
            padding: '22px 44px',
            background: ORANGE,
            color: '#FFF',
            borderRadius: 16,
            fontSize: 34,
            fontWeight: 900,
            opacity: ctaOp,
            boxShadow: '0 14px 40px rgba(232,99,43,0.5)',
          }}
        >
          Browse Deals → sponticoupon.com
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ════════════════════════════════════════════════════════════════════════════
//  MAIN COMPOSITION
// ════════════════════════════════════════════════════════════════════════════
// Scene durations are padded ~1.5s above the ElevenLabs (Rachel) voiceover so
// narration never clips. VO files live in public/audio/customer-how-it-works/.
const SCENES = [
  { key: 'hook', seconds: 9, audio: 'hook' },
  { key: 'browse', seconds: 18, audio: 'browse' },
  { key: 'claim', seconds: 29, audio: 'claim' },
  { key: 'code', seconds: 12, audio: 'code' },
  { key: 'redeem', seconds: 15, audio: 'redeem' },
  { key: 'rewards', seconds: 34, audio: 'rewards' },
  { key: 'outro', seconds: 9, audio: 'outro' },
] as const;

const FPS = 30;
const AUDIO_DIR = 'audio/customer-how-it-works';

export const CustomerHowItWorks: React.FC = () => {
  let cursor = 0;
  const S: Record<string, { start: number; duration: number; audio: string }> = {};
  for (const s of SCENES) {
    const d = s.seconds * FPS;
    S[s.key] = { start: cursor, duration: d, audio: s.audio };
    cursor += d;
  }

  return (
    <AbsoluteFill style={{ backgroundColor: '#000', fontFamily: 'Inter, sans-serif' }}>
      <Sequence from={S.hook.start} durationInFrames={S.hook.duration}>
        <HookScene />
      </Sequence>

      <Sequence from={S.browse.start} durationInFrames={S.browse.duration}>
        <SceneBg tone="sponti" />
        <BrowseScene />
      </Sequence>

      <Sequence from={S.claim.start} durationInFrames={S.claim.duration}>
        <SceneBg tone="sponti" />
        <ClaimPayScene />
      </Sequence>

      <Sequence from={S.code.start} durationInFrames={S.code.duration}>
        <SceneBg tone="sponti" />
        <YourCodeScene />
      </Sequence>

      <Sequence from={S.redeem.start} durationInFrames={S.redeem.duration}>
        <SceneBg tone="steady" />
        <RedeemScene />
      </Sequence>

      <Sequence from={S.rewards.start} durationInFrames={S.rewards.duration}>
        <SceneBg tone="green" />
        <RewardsScene />
      </Sequence>

      <Sequence from={S.outro.start} durationInFrames={S.outro.duration}>
        <OutroScene />
      </Sequence>

      {/* Watermark across the whole video (hide on hook + outro for clean title cards) */}
      <Sequence from={S.browse.start} durationInFrames={S.rewards.start + S.rewards.duration - S.browse.start}>
        <LogoWatermark />
      </Sequence>

      {/* Voiceover */}
      {SCENES.map((s) => (
        <Sequence key={s.key} from={S[s.key].start} durationInFrames={S[s.key].duration}>
          <Audio src={staticFile(`${AUDIO_DIR}/${s.audio}.mp3`)} volume={1} />
        </Sequence>
      ))}

      {/* Scene transitions */}
      {SCENES.slice(1).map((s, i) => (
        <SceneTransition key={i} startFrame={S[s.key].start - 8} />
      ))}
    </AbsoluteFill>
  );
};

export const CUSTOMER_HOWITWORKS_FRAMES = FPS * SCENES.reduce((sum, s) => sum + s.seconds, 0);
