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
  PhoneDealDetail,
  PhoneMyDeals,
  PhoneStripeCheckout,
} from '../components/CustomerMockups';
import {
  ScanPaidInFullMockup,
  ScanBalanceOwedMockup,
  ScanPayInPersonMockup,
} from '../components/ScanMockup';
import { BrowserFrame } from '../components/MockupChrome';

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

// ── Bottom info bar (animated) ─────────────────────────────────────────────────
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
              opacity: textOpacity,
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
            opacity: textOpacity,
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
            opacity: textOpacity,
          }}
        >
          {subtitle}
        </div>
      </div>
    </div>
  );
};

// ── Intro: animated title card with phone + dollars ────────────────────────────
const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame: frame - 6, fps, config: { damping: 10, stiffness: 80 } });
  const titleOp = interpolate(frame, [18, 32], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const titleY = interpolate(frame, [18, 32], [30, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const subOp = interpolate(frame, [38, 52], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ background: 'radial-gradient(ellipse at center, #1f1208 0%, #000 100%)' }}>
      {/* Soft orbit accents */}
      <div
        style={{
          position: 'absolute',
          width: 900,
          height: 900,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(232,99,43,0.18), transparent 60%)',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          filter: 'blur(20px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 18,
        }}
      >
        <div style={{ opacity: logoScale, transform: `scale(${logoScale})` }}>
          <Img
            src={staticFile('images/logo.png')}
            style={{
              height: 130,
              width: 'auto',
              filter: 'drop-shadow(0 6px 24px rgba(0,0,0,0.5))',
            }}
          />
        </div>
        <div
          style={{
            fontSize: 56,
            fontWeight: 800,
            color: '#FFF',
            fontFamily: 'Inter, sans-serif',
            textAlign: 'center',
            maxWidth: 1300,
            lineHeight: 1.15,
            opacity: titleOp,
            transform: `translateY(${titleY}px)`,
            textShadow: '0 4px 24px rgba(0,0,0,0.6)',
          }}
        >
          How Customers <span style={{ color: '#E8632B' }}>Pay & Redeem</span>
        </div>
        <div
          style={{
            fontSize: 24,
            color: 'rgba(255,255,255,0.85)',
            fontFamily: 'Inter, sans-serif',
            textAlign: 'center',
            opacity: subOp,
            textShadow: '0 2px 8px rgba(0,0,0,0.5)',
          }}
        >
          Three flows. Zero commissions. Vendor keeps 100%.
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── Side-by-side phone showcase ───────────────────────────────────────────────
const PhoneShowcase: React.FC<{
  phones: { node: React.ReactNode; caption: string }[];
  accent?: string;
}> = ({ phones, accent = '#E8632B' }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 80,
        width: '100%',
        height: '100%',
        paddingTop: 60,
        paddingBottom: 240,
      }}
    >
      {phones.map((p, i) => {
        const enter = spring({
          frame: frame - 10 - i * 14,
          fps,
          config: { damping: 14, stiffness: 110 },
        });
        const y = interpolate(enter, [0, 1], [80, 0]);
        return (
          <div
            key={i}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 18,
              opacity: enter,
              transform: `translateY(${y}px)`,
            }}
          >
            {p.node}
            <div
              style={{
                background: 'rgba(255,255,255,0.10)',
                border: `1px solid ${accent}55`,
                color: '#FFF',
                padding: '8px 18px',
                borderRadius: 999,
                fontSize: 14,
                fontWeight: 700,
                fontFamily: 'Inter, sans-serif',
                letterSpacing: 0.5,
                backdropFilter: 'blur(6px)',
              }}
            >
              {p.caption}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── Vendor laptop scene wrapper ───────────────────────────────────────────────
const VendorScanScene: React.FC<{ children: React.ReactNode; url: string }> = ({
  children,
  url,
}) => {
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
          <Img
            src={staticFile('images/logo.png')}
            style={{ height: 90, filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.5))' }}
          />
        </div>
        <div
          style={{
            fontSize: 52,
            fontWeight: 800,
            color: '#FFF',
            textAlign: 'center',
            opacity: headOp,
            maxWidth: 1300,
            lineHeight: 1.15,
          }}
        >
          Three flows. <span style={{ color: '#E8632B' }}>Zero commissions.</span>
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
          You keep 100% of every dollar customers pay.
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
          sponticoupon.com/vendor/payments
        </div>
        <div
          style={{
            color: 'rgba(255,255,255,0.6)',
            fontSize: 15,
            opacity: urlOp,
            letterSpacing: 2,
            textTransform: 'uppercase',
            marginTop: 6,
          }}
        >
          Set up your Stripe Connect
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── Scene background ───────────────────────────────────────────────────────────
const SceneBg: React.FC<{ tone?: 'sponti' | 'steady' | 'free' }> = ({ tone = 'sponti' }) => {
  const fromColor =
    tone === 'free' ? '#0e2230' : tone === 'steady' ? '#0e2230' : '#1f1208';
  const dot =
    tone === 'free' ? 'rgba(41,171,226,0.18)' : 'rgba(232,99,43,0.18)';
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

// ── Scene 6: Two ways to collect the balance (animated, staggered) ─────────────
// Option A (Stripe link) appears first; Option B (paid in person at the shop's
// own terminal) slides in when the narration reaches it (~9s into the scene).
const ScaledMockup: React.FC<{ scale: number; w: number; h: number; children: React.ReactNode }> = ({
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

const DepositOptionsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const SCALE = 0.62;

  // Option A enters at the start; Option B enters at ~6s, synced to the narration
  // pause (5.5–6.3s) right before "Option B. The customer pays cash, Venmo…".
  const B_START = 6 * fps;
  const aIn = spring({ frame: frame - 8, fps, config: { damping: 16, stiffness: 90 } });
  const bIn = spring({ frame: frame - B_START, fps, config: { damping: 16, stiffness: 90 } });
  // Dim Option A slightly once Option B arrives, to draw the eye.
  const aDim = interpolate(frame, [B_START, B_START + 20], [1, 0.55], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const col: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 14,
  };
  const badge = (bg: string, text: string): React.CSSProperties => ({
    background: bg,
    color: '#FFF',
    padding: '8px 18px',
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 800,
    letterSpacing: 2,
  });

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 70,
        paddingBottom: 210,
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {/* Option A — Stripe link */}
      <div
        style={{
          ...col,
          opacity: aIn * aDim,
          transform: `translateY(${interpolate(aIn, [0, 1], [40, 0])}px)`,
        }}
      >
        <div style={badge('#E8632B', 'OPTION A · STRIPE LINK')}>OPTION A · STRIPE LINK</div>
        <ScaledMockup scale={SCALE} w={360} h={780}>
          <PhoneStripeCheckout amount="$139.00" subtitle="Brake Pad Replacement — balance" />
        </ScaledMockup>
        <div style={{ color: '#FFF', fontSize: 15, opacity: 0.85, maxWidth: 320, textAlign: 'center' }}>
          Vendor texts a Stripe link — customer pays on their phone.
        </div>
      </div>

      {/* Divider */}
      <div
        style={{
          width: 2,
          height: 360,
          opacity: bIn,
          background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.25), transparent)',
        }}
      />

      {/* Option B — paid in person at the shop's own terminal */}
      <div
        style={{
          ...col,
          opacity: bIn,
          transform: `translateY(${interpolate(bIn, [0, 1], [40, 0])}px)`,
        }}
      >
        <div style={badge('#29ABE2', 'OPTION B · PAID IN PERSON')}>OPTION B · PAID IN PERSON</div>
        <div
          style={{
            width: 360 * SCALE + 56,
            borderRadius: 26,
            background: '#FFF',
            padding: 26,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            boxShadow: '0 26px 70px rgba(0,0,0,0.5)',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 800, color: '#1E6E92', letterSpacing: 1.5 }}>
            AT THE COUNTER
          </div>
          {/* Payment-method chips — the vendor's own terminal / cash apps */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {['💵 Cash', '💳 Card terminal', 'Venmo', 'Zelle'].map((m) => (
              <div
                key={m}
                style={{
                  background: '#EAF6FC',
                  color: '#11506E',
                  fontWeight: 700,
                  fontSize: 14,
                  padding: '8px 12px',
                  borderRadius: 10,
                  border: '1px solid #CFE9F6',
                }}
              >
                {m}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 14, color: '#444', lineHeight: 1.4 }}>
            The shop takes payment on its <strong>own terminal</strong> — Stripe is never involved. Then the vendor taps:
          </div>
          <div
            style={{
              background: '#29ABE2',
              color: '#FFF',
              padding: '15px 18px',
              borderRadius: 12,
              textAlign: 'center',
              fontWeight: 800,
              fontSize: 17,
              boxShadow: '0 10px 24px rgba(41,171,226,0.4)',
              // subtle tap pulse once Option B has fully arrived
              transform: `scale(${interpolate(
                Math.sin((frame - B_START) / 6),
                [-1, 1],
                [0.985, 1.015]
              )})`,
            }}
          >
            ✓ Mark Collected in Person
          </div>
          <div style={{ fontSize: 12, color: '#888' }}>
            Deal closed out in the scan screen. No SpontiCoupon fee.
          </div>
        </div>
        <div style={{ color: '#FFF', fontSize: 15, opacity: 0.85, maxWidth: 320, textAlign: 'center' }}>
          The vendor handles the money — SpontiCoupon just records the redemption.
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── A simulated QR block grid (matches the customer's my-deals QR) ─────────────
const QrPattern: React.FC<{ size?: number }> = ({ size = 150 }) => (
  <div
    style={{
      width: size,
      height: size,
      background: '#FFF',
      borderRadius: 12,
      display: 'grid',
      gridTemplateColumns: 'repeat(11, 1fr)',
      gridTemplateRows: 'repeat(11, 1fr)',
      padding: 6,
      gap: 1,
    }}
  >
    {Array.from({ length: 121 }).map((_, i) => {
      const x = i % 11;
      const y = Math.floor(i / 11);
      const isFinder = (x < 3 && y < 3) || (x > 7 && y < 3) || (x < 3 && y > 7);
      const hash = (x * 31 + y * 17 + (x ^ y) * 7) % 7;
      const on = isFinder || hash < 3;
      return <div key={i} style={{ background: on ? '#111' : 'transparent', borderRadius: 1 }} />;
    })}
  </div>
);

// ── Scene 2: How the vendor redeems — quick access, then QR or 6-digit code ─────
// Beat 1 (quick access, ~2.3–10.6s): Scan from the top menu or the dashboard tab.
// Beat 2 (methods): scan the QR with a camera (~11.1s) or type the 6-digit code (~17.5s).
const RedeemHowScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const reveal = (atSec: number) =>
    spring({ frame: frame - atSec * fps, fps, config: { damping: 15, stiffness: 95 } });

  // Beat 1 — three quick-access points, revealed one at a time as named.
  const accessIn = interpolate(frame, [1 * fps, 2.4 * fps], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const accessOut = interpolate(frame, [17.3 * fps, 18.6 * fps], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const accessOpacity = accessIn * accessOut;
  const acc1 = reveal(3.0); // "on the home page, tap Scan QR in the top menu"
  const acc2 = reveal(8.4); // "open Scan and Redeem from your dashboard sidebar"
  const acc3 = reveal(12.7); // "type the code into Quick Redeem"
  const tapPulse = (Math.sin(frame / 7) + 1) / 2; // gentle pulse on the highlighted Scan items

  // Beat 2 — methods. Reveal each when the narration names it.
  const aIn = reveal(19.2); // "Scan the QR code with your phone…"
  const bIn = reveal(25.8); // "Just type their six-digit code…"
  const tailIn = reveal(28.5);
  const aPulse = interpolate(frame, [19.1 * fps, 19.9 * fps, 23.3 * fps, 23.9 * fps], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const bPulse = interpolate(frame, [25.7 * fps, 26.4 * fps, 27.5 * fps, 28.1 * fps], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const sweep = interpolate(frame % 70, [0, 70], [0, 1]);

  const badge = (bg: string): React.CSSProperties => ({
    background: bg,
    color: '#FFF',
    padding: '8px 18px',
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 800,
    letterSpacing: 2,
  });
  const col: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 };
  const navItem: React.CSSProperties = { fontSize: 14, color: '#444', fontWeight: 600 };

  return (
    <AbsoluteFill>
      {/* ── Beat 1: quick access ─────────────────────────────────────────────── */}
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 34,
          paddingBottom: 190,
          opacity: accessOpacity,
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16, fontWeight: 800, letterSpacing: 4, textTransform: 'uppercase' }}>
          Three quick ways to redeem
        </div>
        <div style={{ display: 'flex', gap: 34, alignItems: 'flex-start', justifyContent: 'center' }}>
          {/* 1 · Top menu — Scan QR */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, width: 430, opacity: acc1, transform: `translateY(${interpolate(acc1, [0, 1], [40, 0])}px)` }}>
            <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.8)', fontWeight: 700 }}>
              <span style={{ color: '#E8632B', fontWeight: 800 }}>1</span> · Home page — top menu
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13, background: '#FFF', borderRadius: 14, padding: '14px 18px', boxShadow: '0 18px 50px rgba(0,0,0,0.4)' }}>
              <span style={{ fontWeight: 900, fontSize: 15 }}>
                <span style={{ color: '#E8632B' }}>sponti</span>
                <span style={{ color: '#29ABE2' }}>coupon</span>
              </span>
              <span style={navItem}>Dashboard</span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: '#FFF',
                  background: '#E8632B',
                  padding: '8px 12px',
                  borderRadius: 9,
                  boxShadow: '0 6px 18px rgba(232,99,43,0.5)',
                  transform: `scale(${1 + tapPulse * 0.05})`,
                  whiteSpace: 'nowrap',
                }}
              >
                ⛶ Scan QR
              </span>
              <span style={navItem}>Sign Out</span>
            </div>
          </div>

          {/* 2 · Dashboard sidebar — Scan / Redeem */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, width: 430, opacity: acc2, transform: `translateY(${interpolate(acc2, [0, 1], [40, 0])}px)` }}>
            <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.8)', fontWeight: 700 }}>
              <span style={{ color: '#E8632B', fontWeight: 800 }}>2</span> · Sidebar — Scan / Redeem
            </div>
            <div style={{ width: 250, background: '#0f1320', borderRadius: 14, padding: 12, boxShadow: '0 18px 50px rgba(0,0,0,0.4)' }}>
              {[
                { label: 'Dashboard', indent: false, active: false },
                { label: 'Deals', indent: false, active: false },
                { label: 'Scan / Redeem', indent: true, active: true },
                { label: 'Marketing', indent: false, active: false },
                { label: 'Billing', indent: false, active: false },
              ].map((it) => (
                <div
                  key={it.label}
                  style={{
                    padding: '10px 12px',
                    paddingLeft: it.indent ? 28 : 12,
                    borderRadius: 9,
                    marginBottom: 3,
                    fontSize: 14,
                    fontWeight: it.active ? 800 : 500,
                    color: it.active ? '#FFF' : 'rgba(255,255,255,0.55)',
                    background: it.active ? '#E8632B' : 'transparent',
                    boxShadow: it.active ? `0 6px 18px rgba(232,99,43,${0.4 + tapPulse * 0.3})` : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                  }}
                >
                  <span style={{ fontSize: 12 }}>{it.active ? '⛶' : '•'}</span> {it.label}
                </div>
              ))}
            </div>
          </div>

          {/* 3 · Dashboard home — Quick Redeem */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, width: 430, opacity: acc3, transform: `translateY(${interpolate(acc3, [0, 1], [40, 0])}px)` }}>
            <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.8)', fontWeight: 700 }}>
              <span style={{ color: '#E8632B', fontWeight: 800 }}>3</span> · Dashboard — Quick Redeem
            </div>
            <div style={{ width: 300, background: '#FFF', borderRadius: 16, padding: 20, boxShadow: '0 18px 50px rgba(0,0,0,0.4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 26, height: 26, borderRadius: 7, background: '#E8632B', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15 }}>#</div>
                <span style={{ fontWeight: 800, fontSize: 16, color: '#111' }}>Quick Redeem</span>
              </div>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 10 }}>Enter the customer&apos;s 6-digit code</div>
              <div style={{ display: 'flex', gap: 6, justifyContent: 'space-between' }}>
                {['8', '1', '4', '2', '6', '5'].map((d, i) => (
                  <div key={i} style={{ width: 38, height: 46, borderRadius: 8, background: '#F5F7FA', border: '2px solid #E8632B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: '#11506E' }}>{d}</div>
                ))}
              </div>
              <div style={{ marginTop: 12, textAlign: 'center', fontSize: 12, color: '#E8632B', fontWeight: 700 }}>⛶ Or scan QR code</div>
            </div>
          </div>
        </div>
        <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 18, fontWeight: 600 }}>
          When a customer is in front of you — redeem in seconds.
        </div>
      </AbsoluteFill>

      {/* ── Beat 2: the two methods ──────────────────────────────────────────── */}
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 26,
          paddingBottom: 190,
          fontFamily: 'Inter, sans-serif',
        }}
      >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 60 }}>
        {/* Option A — scan the QR with your phone */}
        <div style={{ ...col, opacity: aIn, transform: `translateY(${interpolate(aIn, [0, 1], [40, 0])}px)` }}>
          <div style={badge('#E8632B')}>OPTION A · SCAN THE QR</div>
          {/* vendor phone camera */}
          <div
            style={{
              width: 300,
              height: 440,
              borderRadius: 34,
              background: '#0b0b0b',
              border: `10px solid ${aPulse > 0.5 ? '#E8632B' : '#1a1a1a'}`,
              boxShadow: `0 30px 70px rgba(0,0,0,0.55), 0 0 ${aPulse * 40}px rgba(232,99,43,${aPulse * 0.6})`,
              transform: `scale(${1 + aPulse * 0.03})`,
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ position: 'absolute', top: 14, left: 0, right: 0, textAlign: 'center', color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: 800, letterSpacing: 2 }}>
              VENDOR'S PHONE
            </div>
            {/* viewfinder corner brackets */}
            {[
              { top: 110, left: 60, bt: 4, bl: 4 },
              { top: 110, right: 60, bt: 4, br: 4 },
              { bottom: 130, left: 60, bb: 4, bl: 4 },
              { bottom: 130, right: 60, bb: 4, br: 4 },
            ].map((c, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  width: 30,
                  height: 30,
                  borderColor: '#E8632B',
                  borderStyle: 'solid',
                  borderTopWidth: c.bt || 0,
                  borderBottomWidth: c.bb || 0,
                  borderLeftWidth: c.bl || 0,
                  borderRightWidth: c.br || 0,
                  top: c.top,
                  bottom: c.bottom,
                  left: c.left,
                  right: c.right,
                }}
              />
            ))}
            <QrPattern size={150} />
            {/* scan line */}
            <div
              style={{
                position: 'absolute',
                left: 56,
                right: 56,
                top: interpolate(sweep, [0, 1], [120, 290]),
                height: 3,
                background: 'linear-gradient(90deg, transparent, #E8632B, transparent)',
                boxShadow: '0 0 12px 2px rgba(232,99,43,0.7)',
              }}
            />
          </div>
          <div style={{ color: '#FFF', fontSize: 15, opacity: 0.85, maxWidth: 310, textAlign: 'center' }}>
            Use your phone — or any device with a camera.
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 2, height: 320, opacity: bIn, background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.25), transparent)' }} />

        {/* Option B — type the 6-digit code */}
        <div style={{ ...col, opacity: bIn, transform: `translateY(${interpolate(bIn, [0, 1], [40, 0])}px)` }}>
          <div style={badge('#29ABE2')}>OPTION B · ENTER THE CODE</div>
          <div
            style={{
              width: 380,
              background: '#FFF',
              borderRadius: 22,
              padding: 26,
              boxShadow: `0 26px 70px rgba(0,0,0,0.5), 0 0 ${bPulse * 40}px rgba(41,171,226,${bPulse * 0.6})`,
              border: `2px solid ${bPulse > 0.5 ? '#29ABE2' : 'transparent'}`,
              transform: `scale(${1 + bPulse * 0.03})`,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 800, color: '#1E6E92', letterSpacing: 1.5 }}>
              QUICK REDEEM · DASHBOARD
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
              {['8', '1', '4', '2', '6', '5'].map((d, i) => (
                <div
                  key={i}
                  style={{
                    width: 46,
                    height: 58,
                    borderRadius: 10,
                    background: '#F5F7FA',
                    border: '2px solid #29ABE2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 26,
                    fontWeight: 800,
                    color: '#11506E',
                  }}
                >
                  {d}
                </div>
              ))}
            </div>
            <div
              style={{
                background: '#29ABE2',
                color: '#FFF',
                padding: '14px',
                borderRadius: 12,
                textAlign: 'center',
                fontWeight: 800,
                fontSize: 17,
                boxShadow: '0 10px 24px rgba(41,171,226,0.4)',
              }}
            >
              Redeem
            </div>
            <div style={{ fontSize: 13, color: '#666', textAlign: 'center' }}>
              No camera to scan? Type the 6-digit code by hand.
            </div>
          </div>
          <div style={{ color: '#FFF', fontSize: 15, opacity: 0.85, maxWidth: 320, textAlign: 'center' }}>
            No camera? This always works.
          </div>
        </div>
      </div>

      {/* tail */}
      <div
        style={{
          marginTop: 2,
          opacity: tailIn,
          transform: `translateY(${interpolate(tailIn, [0, 1], [20, 0])}px)`,
          background: 'rgba(232,99,43,0.14)',
          border: '1px solid rgba(232,99,43,0.5)',
          color: '#FFF',
          padding: '13px 28px',
          borderRadius: 999,
          fontSize: 19,
          fontWeight: 700,
        }}
      >
        Either way, the deal opens up — and you're <strong style={{ color: '#FF8C42' }}>ready to confirm</strong>.
      </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Recap: the three ways a customer can pay ───────────────────────────────────
// Synced to narration: card 1 "full payment / Stripe" (~5.7s), card 2 "deposit"
// (~9.5s), card 3 "no online charge — a code" (~14.2s); inside card 3 the
// in-store path lights up (~17.3s) then the online-store path (~22.2s); the
// "money goes straight to the vendor" line lands last (~27.3s).
const RecapThreeWays: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const reveal = (atSec: number) =>
    spring({ frame: frame - atSec * fps, fps, config: { damping: 15, stiffness: 95 } });

  const Card: React.FC<{
    n: string;
    icon: string;
    color: string;
    title: string;
    at: number;
    children: React.ReactNode;
  }> = ({ n, icon, color, title, at, children }) => {
    const enter = reveal(at);
    return (
      <div
        style={{
          width: 360,
          background: '#FFF',
          borderRadius: 24,
          padding: '28px 26px',
          border: `3px solid ${color}`,
          boxShadow: `0 18px 50px ${color}40`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 14,
          textAlign: 'center',
          opacity: enter,
          transform: `translateY(${interpolate(enter, [0, 1], [50, 0])}px) scale(${interpolate(enter, [0, 1], [0.9, 1])})`,
        }}
      >
        <div style={{ position: 'relative' }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: `${color}1A`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 38,
            }}
          >
            {icon}
          </div>
          <div
            style={{
              position: 'absolute',
              top: -6,
              right: -6,
              width: 30,
              height: 30,
              borderRadius: '50%',
              background: color,
              color: '#FFF',
              fontWeight: 800,
              fontSize: 15,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {n}
          </div>
        </div>
        <div style={{ fontSize: 21, fontWeight: 800, color: '#111', lineHeight: 1.15 }}>{title}</div>
        {children}
      </div>
    );
  };

  // Sub-row inside card 3 that brightens when its narration plays.
  const SubRow: React.FC<{ icon: string; label: string; at: number }> = ({ icon, label, at }) => {
    const lit = reveal(at);
    const isLit = lit > 0.4;
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          textAlign: 'left',
          background: isLit ? '#EAF6FC' : '#F4F4F2',
          border: `1px solid ${isLit ? '#BFE9F6' : '#E7E7E3'}`,
          borderRadius: 12,
          padding: '11px 13px',
          opacity: interpolate(lit, [0, 1], [0.35, 1]),
          transform: `scale(${interpolate(lit, [0, 1], [0.96, 1])})`,
          width: '100%',
        }}
      >
        <span style={{ fontSize: 20 }}>{icon}</span>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: '#11506E', lineHeight: 1.3 }}>{label}</span>
      </div>
    );
  };

  const tailIn = reveal(29.4);

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 28,
        paddingBottom: 180,
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16, fontWeight: 800, letterSpacing: 4, textTransform: 'uppercase' }}>
        Recap · Three ways your customer pays
      </div>
      <div style={{ display: 'flex', gap: 30, alignItems: 'stretch' }}>
        {/* Way 1 — full payment via Stripe */}
        <Card n="1" icon="💳" color="#E8632B" title="Full payment" at={7.3}>
          <div style={{ fontSize: 14, color: '#666', lineHeight: 1.45 }}>
            Pays the full price <strong style={{ color: '#E8632B' }}>online through Stripe</strong> the moment they claim.
          </div>
          <div style={{ marginTop: 'auto', fontSize: 12.5, color: '#888', paddingTop: 8 }}>
            → Funds land in the vendor's Stripe
          </div>
        </Card>

        {/* Way 2 — partial deposit */}
        <Card n="2" icon="📲" color="#E8632B" title="Partial payment" at={11.4}>
          <div style={{ fontSize: 14, color: '#666', lineHeight: 1.45 }}>
            Pays a <strong style={{ color: '#E8632B' }}>deposit online</strong>, then settles the balance with the vendor.
          </div>
          <div style={{ marginTop: 'auto', fontSize: 12.5, color: '#888', paddingTop: 8 }}>
            → Deposit now, the rest later
          </div>
        </Card>

        {/* Way 3 — no online charge, just a code (in-store OR online store) */}
        <Card n="3" icon="🎟️" color="#29ABE2" title="No online charge — a code" at={16.3}>
          <div style={{ fontSize: 13.5, color: '#666', lineHeight: 1.4 }}>
            SpontiCoupon charges nothing — the code carries the discount.
          </div>
          <SubRow icon="🏪" label="In a shop — show the code, pay at the counter" at={19.4} />
          <SubRow icon="🌐" label="Online store — enter the code on the vendor's own website" at={24.1} />
        </Card>
      </div>

      {/* However they pay → money goes straight to the vendor */}
      <div
        style={{
          marginTop: 4,
          opacity: tailIn,
          transform: `translateY(${interpolate(tailIn, [0, 1], [20, 0])}px)`,
          background: 'rgba(232,99,43,0.14)',
          border: '1px solid rgba(232,99,43,0.5)',
          color: '#FFF',
          padding: '14px 30px',
          borderRadius: 999,
          fontSize: 20,
          fontWeight: 700,
        }}
      >
        However they pay, the money goes <strong style={{ color: '#FF8C42' }}>straight to the vendor</strong> — never SpontiCoupon.
      </div>
    </AbsoluteFill>
  );
};

// ── Main composition ──────────────────────────────────────────────────────────
export const CustomerRedemptionTutorial: React.FC = () => {
  const FPS = 30;

  // Durations chosen to comfortably contain the macOS-Samantha narration.
  // Voiceover lengths are reported in the build log.
  // intro 6.6 | full-pay 14.4 | full-store 10.5 | dep-intro 7.4 | dep-scan 6.0
  // dep-options 14.9 | in-person 15.0 | money-flow 12.2 | outro 9.4
  // (totals 96s)
  // Durations padded ~1.5s above the ElevenLabs (Rachel) voiceover lengths.
  const scenes = [
    { key: 'intro', seconds: 9 },         // VO 7.7s
    { key: 'redeemHow', seconds: 33 },     // 31.8s — 3 access points + scan QR / 6-digit code
    { key: 'fullPay', seconds: 18 },       // 16.3s
    { key: 'fullStore', seconds: 13 },     // 11.3s
    { key: 'depIntro', seconds: 10 },      // 8.4s
    { key: 'depScan', seconds: 8 },        // 7.1s
    { key: 'depOptions', seconds: 20 },    // 18.2s
    { key: 'inPerson', seconds: 18 },      // 16.0s
    { key: 'recap', seconds: 35 },         // 33.7s — "Let's recap" 3-ways summary
    { key: 'outro', seconds: 12 },         // 11.3s
  ];

  let cursor = 0;
  const S: Record<string, { start: number; duration: number }> = {};
  for (const s of scenes) {
    const d = s.seconds * FPS;
    S[s.key] = { start: cursor, duration: d };
    cursor += d;
  }
  // total = 110s? Let me check: 8+16+12+9+7+16+17+14+11 = 110s. We target 90-100s.
  // Trim a few seconds: shrink intro, outro, and some breathing room.
  // Better keep audio coverage. Use 96s budget.

  return (
    <AbsoluteFill style={{ backgroundColor: '#000', fontFamily: 'Inter, sans-serif' }}>
      {/* Scene 1: Intro */}
      <Sequence from={S.intro.start} durationInFrames={S.intro.duration}>
        <IntroScene />
      </Sequence>

      {/* Scene 1b: How the vendor redeems — scan QR or type the 6-digit code */}
      <Sequence from={S.redeemHow.start} durationInFrames={S.redeemHow.duration}>
        <SceneBg tone="sponti" />
        <RedeemHowScene />
        <InfoBar
          step="How You Redeem"
          title="Three quick ways in — then scan the QR or type the code."
          subtitle="Scan QR in the home-page menu, the Scan / Redeem sidebar tab, or Quick Redeem on your dashboard. Scan with any camera — no camera? The 6-digit code always works."
        />
      </Sequence>

      {/* Scene 2: Full payment online (customer pays) */}
      <Sequence from={S.fullPay.start} durationInFrames={S.fullPay.duration}>
        <SceneBg tone="sponti" />
        <PhoneShowcase
          phones={[
            { node: <PhoneDealDetail variant="full" />, caption: 'Customer claims & pays' },
            { node: <PhoneStripeCheckout amount="$39.99" />, caption: 'Stripe Checkout' },
          ]}
        />
        <InfoBar
          step="Scenario 1 · Full Payment Online"
          title="Customer pays the full price at claim."
          subtitle="Stripe sends the money straight to the vendor's connected Stripe account — and on to the vendor's bank. SpontiCoupon never holds your money."
        />
      </Sequence>

      {/* Scene 3: Full — in store, paid in full */}
      <Sequence from={S.fullStore.start} durationInFrames={S.fullStore.duration}>
        <SceneBg tone="sponti" />
        <VendorScanScene url="sponticoupon.com/vendor/scan">
          <ScanPaidInFullMockup />
        </VendorScanScene>
        <InfoBar
          step="At the Shop"
          title="Scan the code. Confirm. Done."
          subtitle='The scan screen reads PAID IN FULL. No payment at the counter — just verify and tap Confirm Redemption.'
        />
      </Sequence>

      {/* Scene 4: Deposit intro — customer claim with deposit */}
      <Sequence from={S.depIntro.start} durationInFrames={S.depIntro.duration}>
        <SceneBg tone="sponti" />
        <PhoneShowcase
          phones={[
            { node: <PhoneDealDetail variant="deposit" />, caption: 'Deposit at claim' },
            { node: <PhoneMyDeals status="deposit-paid" code="8 1 4 2 6 5" />, caption: 'Code + QR ready' },
          ]}
        />
        <InfoBar
          step="Scenario 2 · Deposit + Balance"
          title="Customer pays a partial deposit through Stripe to lock in the deal."
          subtitle="The balance is owed at the store. The customer brings their code as proof of the deposit."
        />
      </Sequence>

      {/* Scene 5: Balance owed — vendor sees the amount */}
      <Sequence from={S.depScan.start} durationInFrames={S.depScan.duration}>
        <SceneBg tone="sponti" />
        <VendorScanScene url="sponticoupon.com/vendor/scan">
          <ScanBalanceOwedMockup />
        </VendorScanScene>
        <InfoBar
          step="At the Shop"
          title="Scan reveals the balance owed."
          subtitle="The vendor sees exactly what's still due — and chooses how to collect it."
        />
      </Sequence>

      {/* Scene 6: Two collection options (animated) */}
      <Sequence from={S.depOptions.start} durationInFrames={S.depOptions.duration}>
        <SceneBg tone="sponti" />
        <DepositOptionsScene />
        <InfoBar
          step="Two Ways to Collect"
          title="Stripe link, or whatever method the shop already uses."
          subtitle="Either way, the deal closes out cleanly in your scan screen. No commissions either way."
          accent="#E8632B"
        />
      </Sequence>

      {/* Scene 7: Pay in person */}
      <Sequence from={S.inPerson.start} durationInFrames={S.inPerson.duration}>
        <SceneBg tone="free" />
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 60,
            paddingTop: 50,
            paddingBottom: 240,
            fontFamily: 'Inter, sans-serif',
          }}
        >
          <PhoneDealDetail variant="free" />
          <PhoneMyDeals status="free" code="3 0 9 5 8 1" />
          <div style={{ transform: 'scale(0.8)', transformOrigin: 'center' }}>
            <BrowserFrame url="sponticoupon.com/vendor/scan" width={1100} height={680}>
              <ScanPayInPersonMockup />
            </BrowserFrame>
          </div>
        </div>
        <InfoBar
          step="Scenario 3 · Pay In Person"
          title="Free deals and pay-at-location deals. No money moves online."
          subtitle="Customer brings their code, vendor scans, confirms — and handles payment at the store however they want. Cash, card, anything."
          accent="#29ABE2"
        />
      </Sequence>

      {/* Scene 8: Recap — the three ways a customer pays */}
      <Sequence from={S.recap.start} durationInFrames={S.recap.duration}>
        <SceneBg tone="sponti" />
        <RecapThreeWays />
        <InfoBar
          step="Recap"
          title="Three ways to pay — every one goes straight to the vendor."
          subtitle="Full payment, a partial deposit, or no online charge at all. In a shop or on the vendor's own website — SpontiCoupon never holds the money."
        />
      </Sequence>

      {/* Scene 9: Outro / CTA */}
      <Sequence from={S.outro.start} durationInFrames={S.outro.duration}>
        <Outro />
      </Sequence>

      {/* Watermark across the whole video */}
      <Sequence from={0} durationInFrames={cursor}>
        <LogoWatermark />
      </Sequence>

      {/* Voiceover audio */}
      <Sequence from={S.intro.start} durationInFrames={S.intro.duration}>
        <Audio src={staticFile('audio/customer-redemption/intro.mp3')} volume={1} />
      </Sequence>
      <Sequence from={S.redeemHow.start} durationInFrames={S.redeemHow.duration}>
        <Audio src={staticFile('audio/customer-redemption/redeem-how.mp3')} volume={1} />
      </Sequence>
      <Sequence from={S.fullPay.start} durationInFrames={S.fullPay.duration}>
        <Audio src={staticFile('audio/customer-redemption/full-payment.mp3')} volume={1} />
      </Sequence>
      <Sequence from={S.fullStore.start} durationInFrames={S.fullStore.duration}>
        <Audio src={staticFile('audio/customer-redemption/full-in-store.mp3')} volume={1} />
      </Sequence>
      <Sequence from={S.depIntro.start} durationInFrames={S.depIntro.duration}>
        <Audio src={staticFile('audio/customer-redemption/deposit-intro.mp3')} volume={1} />
      </Sequence>
      <Sequence from={S.depScan.start} durationInFrames={S.depScan.duration}>
        <Audio src={staticFile('audio/customer-redemption/deposit-scan.mp3')} volume={1} />
      </Sequence>
      <Sequence from={S.depOptions.start} durationInFrames={S.depOptions.duration}>
        <Audio src={staticFile('audio/customer-redemption/deposit-options.mp3')} volume={1} />
      </Sequence>
      <Sequence from={S.inPerson.start} durationInFrames={S.inPerson.duration}>
        <Audio src={staticFile('audio/customer-redemption/in-person.mp3')} volume={1} />
      </Sequence>
      <Sequence from={S.recap.start} durationInFrames={S.recap.duration}>
        <Audio src={staticFile('audio/customer-redemption/recap.mp3')} volume={1} />
      </Sequence>
      <Sequence from={S.outro.start} durationInFrames={S.outro.duration}>
        <Audio src={staticFile('audio/customer-redemption/outro.mp3')} volume={1} />
      </Sequence>

      {/* Scene transitions */}
      {Object.values(S)
        .slice(1)
        .map((scene, i) => (
          <SceneTransition key={i} startFrame={scene.start - 8} />
        ))}
    </AbsoluteFill>
  );
};

// Helper: total frame count, exported for Root.tsx registration
export const CUSTOMER_REDEMPTION_FRAMES = 30 * (9 + 33 + 18 + 13 + 10 + 8 + 20 + 18 + 35 + 12);
