import React from 'react';
import { PhoneFrame } from './MockupChrome';
import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';

// ── Phone: deal detail (with Claim & Pay) ─────────────────────────────────────
export const PhoneDealDetail: React.FC<{
  variant?: 'full' | 'deposit' | 'free';
  lang?: 'en' | 'es';
}> = ({ variant = 'full', lang = 'en' }) => {
  const es = lang === 'es';
  const label = variant === 'free' ? (es ? 'PAGA EN PERSONA' : 'PAY IN PERSON') : es ? 'OFERTA SPONTI' : 'SPONTI DEAL';
  const bgChip = variant === 'free' ? '#29ABE2' : '#E8632B';
  const cta = es
    ? variant === 'free'
      ? 'Reclama inspección gratis'
      : variant === 'deposit'
        ? 'Paga $50 de depósito'
        : 'Reclama y paga $39.99'
    : variant === 'free'
      ? 'Claim Free Inspection'
      : variant === 'deposit'
        ? 'Pay $50 Deposit & Claim'
        : 'Claim & Pay $39.99';
  const price =
    variant === 'free' ? (es ? 'GRATIS' : 'FREE') : variant === 'deposit' ? '$189' : '$39.99';
  const subline = es
    ? variant === 'free'
      ? 'Sin pago en línea — se maneja en el negocio'
      : variant === 'deposit'
        ? '$50 de depósito ahora • $139 en la tienda'
        : 'Paga completo ahora — muestra tu código en el negocio'
    : variant === 'free'
      ? 'No payment online — handled at the shop'
      : variant === 'deposit'
        ? '$50 deposit now • $139 in-store'
        : 'Pay full price now — show your code at the shop';
  const dealTitle = es
    ? variant === 'free'
      ? 'Inspección de A/C gratis'
      : variant === 'deposit'
        ? 'Cambio de pastillas de freno'
        : 'Cambio de aceite sintético'
    : variant === 'free'
      ? 'Free A/C Inspection'
      : variant === 'deposit'
        ? 'Brake Pad Replacement'
        : 'Full Synthetic Oil Change';

  return (
    <PhoneFrame width={360}>
      <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
        {/* status bar spacer */}
        <div style={{ height: 30 }} />
        {/* Deal image */}
        <div
          style={{
            height: 200,
            background:
              variant === 'free'
                ? 'linear-gradient(135deg, #29ABE2, #5BC3EE)'
                : 'linear-gradient(135deg, #E8632B, #FF8C42)',
            position: 'relative',
            display: 'flex',
            alignItems: 'flex-end',
            padding: 16,
          }}
        >
          <div
            style={{
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(4px)',
              color: '#FFF',
              padding: '6px 12px',
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 1,
              borderRadius: 999,
            }}
          >
            {label}
          </div>
        </div>
        {/* Body */}
        <div style={{ padding: '18px 18px 0' }}>
          <div style={{ fontSize: 11, color: '#888', fontWeight: 700, letterSpacing: 1.2 }}>
            EDDIE’S GARAGE — ORLANDO, FL
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, lineHeight: 1.2 }}>
            {variant === 'free'
              ? 'Free A/C Inspection'
              : variant === 'deposit'
                ? 'Brake Pad Replacement'
                : 'Full Synthetic Oil Change'}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 10 }}>
            <div style={{ fontSize: 30, fontWeight: 900, color: bgChip }}>{price}</div>
            {variant !== 'free' && (
              <div
                style={{
                  fontSize: 14,
                  color: '#888',
                  textDecoration: 'line-through',
                }}
              >
                {variant === 'deposit' ? '$249' : '$59.99'}
              </div>
            )}
          </div>
          <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{subline}</div>
        </div>
        {/* CTA pinned bottom */}
        <div
          style={{
            position: 'absolute',
            bottom: 12,
            left: 14,
            right: 14,
            background: bgChip,
            color: '#FFF',
            padding: '16px 18px',
            borderRadius: 14,
            textAlign: 'center',
            fontWeight: 800,
            fontSize: 16,
            boxShadow: `0 8px 24px ${bgChip}66`,
          }}
        >
          {cta}
        </div>
      </div>
    </PhoneFrame>
  );
};

// ── Phone: my-deals — QR code card ────────────────────────────────────────────
export const PhoneMyDeals: React.FC<{
  code?: string;
  status?: 'paid-in-full' | 'deposit-paid' | 'free';
}> = ({ code = '4 7 2 9 0 3', status = 'paid-in-full' }) => {
  const statusLabel =
    status === 'paid-in-full' ? 'PAID IN FULL' : status === 'deposit-paid' ? 'DEPOSIT PAID' : 'PAY IN PERSON';
  const statusBg =
    status === 'paid-in-full' ? '#15803D' : status === 'deposit-paid' ? '#E8632B' : '#29ABE2';
  return (
    <PhoneFrame width={360}>
      <div style={{ height: 30 }} />
      <div style={{ padding: '14px 18px' }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>My Deals</div>
        <div style={{ fontSize: 12, color: '#888' }}>Show this at the shop</div>
      </div>
      <div
        style={{
          margin: '6px 14px',
          background: '#FFF',
          borderRadius: 16,
          border: '1px solid rgba(0,0,0,0.08)',
          padding: 14,
          boxShadow: '0 8px 24px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 11, color: '#888', fontWeight: 700, letterSpacing: 1.2 }}>
            EDDIE’S GARAGE
          </div>
          <div
            style={{
              background: statusBg,
              color: '#FFF',
              padding: '3px 10px',
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: 1,
              borderRadius: 999,
            }}
          >
            {statusLabel}
          </div>
        </div>
        <div style={{ fontSize: 16, fontWeight: 800, marginTop: 4 }}>
          {status === 'free'
            ? 'Free A/C Inspection'
            : status === 'deposit-paid'
              ? 'Brake Pad Replacement'
              : 'Full Synthetic Oil Change'}
        </div>
        {/* QR */}
        <div
          style={{
            margin: '14px auto 10px',
            width: 180,
            height: 180,
            background: '#FFF',
            border: '2px solid #111',
            borderRadius: 14,
            display: 'grid',
            gridTemplateColumns: 'repeat(11, 1fr)',
            gridTemplateRows: 'repeat(11, 1fr)',
            padding: 6,
            gap: 1,
          }}
        >
          {/* simulated QR — solid blocks in a fixed pattern */}
          {Array.from({ length: 121 }).map((_, i) => {
            const x = i % 11;
            const y = Math.floor(i / 11);
            // Finder squares at corners
            const isFinder =
              (x < 3 && y < 3) ||
              (x > 7 && y < 3) ||
              (x < 3 && y > 7);
            // Pseudo-random-but-stable for body
            const hash = (x * 31 + y * 17 + (x ^ y) * 7) % 7;
            const on = isFinder || hash < 3;
            return (
              <div
                key={i}
                style={{ background: on ? '#111' : 'transparent', borderRadius: 1 }}
              />
            );
          })}
        </div>
        <div style={{ textAlign: 'center', fontWeight: 800, fontSize: 22, letterSpacing: 4 }}>
          {code}
        </div>
        <div style={{ textAlign: 'center', fontSize: 11, color: '#888', marginTop: 4 }}>
          6-digit redemption code
        </div>
      </div>
    </PhoneFrame>
  );
};

// ── Phone: Stripe Checkout ────────────────────────────────────────────────────
export const PhoneStripeCheckout: React.FC<{ amount?: string; subtitle?: string }> = ({
  amount = '$39.99',
  subtitle = 'Full Synthetic Oil Change',
}) => {
  return (
    <PhoneFrame width={360}>
      <div style={{ height: 30 }} />
      <div style={{ padding: 16, background: '#FFF', height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: '#888', fontWeight: 700, letterSpacing: 1.2 }}>EDDIE’S GARAGE</div>
          <div
            style={{
              background: '#635BFF',
              color: '#FFF',
              fontWeight: 800,
              fontSize: 10,
              padding: '3px 10px',
              borderRadius: 999,
              letterSpacing: 1,
            }}
          >
            stripe
          </div>
        </div>
        <div style={{ fontSize: 13, color: '#666' }}>{subtitle}</div>
        <div style={{ fontSize: 38, fontWeight: 900, marginTop: 2, marginBottom: 16 }}>{amount}</div>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Card information</div>
        <div
          style={{
            border: '1px solid rgba(0,0,0,0.15)',
            borderRadius: 8,
            padding: '10px 12px',
            fontFamily: 'monospace',
            fontSize: 13,
            marginBottom: 8,
            color: '#222',
          }}
        >
          4242 4242 4242 4242
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <div
            style={{
              flex: 1,
              border: '1px solid rgba(0,0,0,0.15)',
              borderRadius: 8,
              padding: '10px 12px',
              fontFamily: 'monospace',
              fontSize: 13,
            }}
          >
            12 / 28
          </div>
          <div
            style={{
              flex: 1,
              border: '1px solid rgba(0,0,0,0.15)',
              borderRadius: 8,
              padding: '10px 12px',
              fontFamily: 'monospace',
              fontSize: 13,
            }}
          >
            CVC 123
          </div>
        </div>
        <div
          style={{
            background: '#0A2540',
            color: '#FFF',
            padding: '14px 18px',
            borderRadius: 8,
            textAlign: 'center',
            fontWeight: 800,
            fontSize: 16,
          }}
        >
          Pay {amount}
        </div>
        <div style={{ marginTop: 12, fontSize: 10, color: '#999', textAlign: 'center' }}>
          Powered by Stripe • Pays Eddie’s Garage directly
        </div>
      </div>
    </PhoneFrame>
  );
};

// ── Money-flow diagram ────────────────────────────────────────────────────────
export const MoneyFlowDiagram: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const customer = spring({ frame: frame - 6, fps, config: { damping: 15, stiffness: 90 } });
  const stripe = spring({ frame: frame - 28, fps, config: { damping: 15, stiffness: 90 } });
  const bank = spring({ frame: frame - 70, fps, config: { damping: 15, stiffness: 90 } });
  const arrow1 = interpolate(frame, [20, 35], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const arrow2 = interpolate(frame, [60, 75], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const spontiDim = interpolate(frame, [80, 110], [1, 0.3], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const spontiOpacity = interpolate(frame, [85, 100], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const NodeBox: React.FC<{
    icon: string;
    label: string;
    sub: string;
    color?: string;
    scale?: number;
  }> = ({ icon, label, sub, color = '#E8632B', scale = 1 }) => (
    <div
      style={{
        background: '#FFF',
        borderRadius: 22,
        padding: '24px 28px',
        boxShadow: `0 10px 40px ${color}44`,
        border: `3px solid ${color}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        width: 220,
        transform: `scale(${scale})`,
        opacity: scale,
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: `${color}22`,
          color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 36,
        }}
      >
        {icon}
      </div>
      <div style={{ fontSize: 19, fontWeight: 800, color: '#111' }}>{label}</div>
      <div style={{ fontSize: 12, color: '#666', textAlign: 'center', lineHeight: 1.4 }}>{sub}</div>
    </div>
  );

  const Arrow: React.FC<{ progress: number; label?: string }> = ({ progress, label }) => (
    <div
      style={{
        flex: '0 0 130px',
        position: 'relative',
        height: 60,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          height: 4,
          background: '#E8632B',
          width: `${progress * 100}%`,
          borderRadius: 4,
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: `${(1 - progress) * 100}%`,
          marginRight: -10,
          width: 0,
          height: 0,
          borderTop: '10px solid transparent',
          borderBottom: '10px solid transparent',
          borderLeft: '14px solid #E8632B',
          opacity: progress,
        }}
      />
      {label && (
        <div
          style={{
            position: 'absolute',
            top: -22,
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: 12,
            fontWeight: 800,
            color: '#E8632B',
            letterSpacing: 1,
            textTransform: 'uppercase',
            opacity: progress,
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </div>
      )}
    </div>
  );

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'radial-gradient(ellipse at center, #1a1a1a 0%, #000 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, sans-serif',
        padding: 60,
        gap: 50,
      }}
    >
      <div
        style={{
          fontSize: 36,
          fontWeight: 800,
          color: '#FFF',
          textAlign: 'center',
          opacity: interpolate(frame, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}
      >
        Where the money goes
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        <NodeBox icon="🧑" label="Customer" sub="Pays via Stripe Checkout" color="#E8632B" scale={customer} />
        <Arrow progress={arrow1} label="Stripe" />
        <NodeBox icon="$" label="Vendor's Stripe" sub="Connect account" color="#E8632B" scale={stripe} />
        <Arrow progress={arrow2} label="Payout" />
        <NodeBox icon="🏦" label="Your Bank" sub="Automatic deposit" color="#15803D" scale={bank} />
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 60,
          right: 80,
          opacity: spontiOpacity * spontiDim,
          color: '#FFF',
          fontSize: 14,
          background: 'rgba(255,255,255,0.06)',
          border: '1px dashed rgba(255,255,255,0.25)',
          borderRadius: 12,
          padding: '14px 18px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>SpontiCoupon</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>(never touches the money)</div>
      </div>
    </div>
  );
};
