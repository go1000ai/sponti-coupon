import React from 'react';

const Sidebar: React.FC<{ active?: string }> = ({ active = 'Loyalty' }) => (
  <div
    style={{
      width: 230,
      background: '#0E0F11',
      color: '#FFF',
      display: 'flex',
      flexDirection: 'column',
      padding: '20px 16px',
      gap: 6,
      fontSize: 14,
      flexShrink: 0,
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: 'linear-gradient(135deg, #E8632B, #FF8C42)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 900,
          color: '#FFF',
        }}
      >
        S
      </div>
      <div>
        <div style={{ fontWeight: 800, fontSize: 13 }}>SpontiCoupon</div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: 2 }}>
          VENDOR PORTAL
        </div>
      </div>
    </div>
    {['Dashboard', 'Deals', 'Marketing', 'Business', 'Billing', 'Settings'].map((label) => {
      const isActive = label === 'Marketing';
      return (
        <div key={label}>
          <div
            style={{
              padding: '9px 12px',
              borderRadius: 8,
              color: 'rgba(255,255,255,0.85)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontWeight: 500,
            }}
          >
            <span style={{ width: 8, height: 8, background: 'rgba(255,255,255,0.3)', borderRadius: 2 }} />
            {label}
          </div>
          {isActive && (
            <div style={{ marginLeft: 22, marginTop: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {['Loyalty', 'Social', 'Reviews'].map((sub) => (
                <div
                  key={sub}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 6,
                    background: sub === active ? 'rgba(232,99,43,0.20)' : 'transparent',
                    color: sub === active ? '#FF9F6F' : 'rgba(255,255,255,0.7)',
                    fontWeight: sub === active ? 700 : 500,
                    fontSize: 12.5,
                  }}
                >
                  {sub}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    })}
  </div>
);

const Header: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => (
  <div style={{ padding: '28px 36px 16px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
    <div style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700 }}>
      Marketing / Loyalty
    </div>
    <div style={{ fontSize: 30, fontWeight: 800, marginTop: 4 }}>{title}</div>
    <div style={{ color: '#666', fontSize: 14, marginTop: 4 }}>{subtitle}</div>
  </div>
);

const Shell: React.FC<{
  title: string;
  subtitle: string;
  children: React.ReactNode;
}> = ({ title, subtitle, children }) => (
  <div
    style={{
      width: '100%',
      height: '100%',
      background: '#F5F4F1',
      display: 'flex',
      fontFamily: 'Inter, sans-serif',
      color: '#111',
    }}
  >
    <Sidebar />
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Header title={title} subtitle={subtitle} />
      <div style={{ flex: 1, padding: 32, overflow: 'hidden' }}>{children}</div>
    </div>
  </div>
);

// ── Empty state: program chooser ──────────────────────────────────────────────
export const LoyaltyChooserMockup: React.FC = () => (
  <Shell
    title="Loyalty Programs"
    subtitle="Reward repeat customers automatically — built in, no paper cards, no extra app."
  >
    <div style={{ display: 'flex', gap: 22, marginTop: 6 }}>
      {/* Punch card option */}
      <div
        style={{
          flex: 1,
          background: '#FFF',
          borderRadius: 18,
          border: '2px solid #E8632B',
          padding: 28,
          boxShadow: '0 10px 30px rgba(232,99,43,0.12)',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: '#E8632B',
            color: '#FFF',
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: 1.2,
            padding: '4px 10px',
            borderRadius: 999,
          }}
        >
          MOST POPULAR
        </div>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: 'linear-gradient(135deg, #E8632B, #FF8C42)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 30,
            color: '#FFF',
            marginBottom: 16,
          }}
        >
          ▣
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Punch Card</div>
        <div style={{ fontSize: 14, color: '#666', lineHeight: 1.5, marginBottom: 16 }}>
          Buy N, get one free. Simple, classic, digital. Auto-punches on every claim.
        </div>
        <ul style={{ paddingLeft: 18, margin: 0, fontSize: 13, color: '#444', lineHeight: 1.7 }}>
          <li>Customer sees progress live</li>
          <li>Auto-punch on every claim</li>
          <li>Great for cafés, salons, retail</li>
        </ul>
        <div
          style={{
            marginTop: 22,
            padding: '14px 18px',
            background: '#E8632B',
            color: '#FFF',
            borderRadius: 12,
            textAlign: 'center',
            fontWeight: 800,
          }}
        >
          Set up Punch Card →
        </div>
      </div>
      {/* Points option */}
      <div
        style={{
          flex: 1,
          background: '#FFF',
          borderRadius: 18,
          border: '2px solid rgba(0,0,0,0.08)',
          padding: 28,
          boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: 'linear-gradient(135deg, #29ABE2, #5BC3EE)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 30,
            color: '#FFF',
            marginBottom: 16,
          }}
        >
          ★
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Points Program</div>
        <div style={{ fontSize: 14, color: '#666', lineHeight: 1.5, marginBottom: 16 }}>
          Earn points per dollar spent. Redeem at threshold for $-off.
        </div>
        <ul style={{ paddingLeft: 18, margin: 0, fontSize: 13, color: '#444', lineHeight: 1.7 }}>
          <li>1 point per $1 (configurable)</li>
          <li>Set your redemption threshold</li>
          <li>Better for higher-ticket spend</li>
        </ul>
        <div
          style={{
            marginTop: 22,
            padding: '14px 18px',
            background: '#FFF',
            color: '#29ABE2',
            border: '2px solid #29ABE2',
            borderRadius: 12,
            textAlign: 'center',
            fontWeight: 800,
          }}
        >
          Set up Points →
        </div>
      </div>
    </div>
  </Shell>
);

// ── Active Punch Card configuration ───────────────────────────────────────────
export const LoyaltyPunchCardActive: React.FC = () => (
  <Shell title="Punch Card" subtitle="Buy 10 coffees, get 1 free — auto-punched on every claim.">
    <div style={{ display: 'flex', gap: 22 }}>
      <div
        style={{
          flex: 1,
          background: '#FFF',
          borderRadius: 18,
          padding: 28,
          border: '1px solid rgba(0,0,0,0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ fontSize: 12, color: '#888', fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase' }}>
          Program Configuration
        </div>
        <div>
          <div style={{ fontSize: 13, color: '#666', marginBottom: 6 }}>Program Name</div>
          <div style={{ padding: '12px 14px', background: '#F7F6F2', borderRadius: 10, fontWeight: 600 }}>
            Coffee Club
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: '#666', marginBottom: 6 }}>Punches Needed</div>
            <div style={{ padding: '12px 14px', background: '#F7F6F2', borderRadius: 10, fontWeight: 800, fontSize: 18 }}>
              10
            </div>
          </div>
          <div style={{ flex: 2 }}>
            <div style={{ fontSize: 13, color: '#666', marginBottom: 6 }}>Reward</div>
            <div style={{ padding: '12px 14px', background: '#F7F6F2', borderRadius: 10, fontWeight: 600 }}>
              1 Free Large Coffee
            </div>
          </div>
        </div>
        <div
          style={{
            marginTop: 8,
            padding: '14px 18px',
            background: '#E7F8EE',
            border: '1px solid #BFEBC9',
            borderRadius: 12,
            color: '#15803D',
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          ● Active — 38 customers enrolled
        </div>
      </div>
      <div
        style={{
          width: 350,
          background: '#FFF',
          borderRadius: 18,
          padding: 22,
          border: '1px solid rgba(0,0,0,0.06)',
        }}
      >
        <div style={{ fontSize: 12, color: '#888', fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 14 }}>
          Customer View — Live Preview
        </div>
        <div
          style={{
            background: 'linear-gradient(160deg, #FFF4EC 0%, #FFFBF8 100%)',
            borderRadius: 18,
            padding: 22,
            border: '1px solid #F6DCC8',
            boxShadow: '0 8px 24px rgba(232,99,43,0.10)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #E8632B, #FF8C42)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
              }}
            >
              ☕
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#2A1B12' }}>Coffee Club</div>
              <div style={{ fontSize: 12, color: '#9A7A68' }}>Eddie's Garage Café</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 9, marginTop: 16 }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
              const punched = n <= 7;
              return (
                <div
                  key={n}
                  style={{
                    aspectRatio: '1 / 1',
                    borderRadius: '50%',
                    border: punched ? 'none' : '2px solid #F1C9AE',
                    background: punched
                      ? 'radial-gradient(circle at 36% 30%, #FF8C42, #E8632B 72%)'
                      : '#FFFFFF',
                    boxShadow: punched
                      ? '0 3px 8px rgba(232,99,43,0.35), inset 0 1px 0 rgba(255,255,255,0.5)'
                      : 'inset 0 1px 3px rgba(232,99,43,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFF',
                    fontWeight: 800,
                    fontSize: 17,
                  }}
                >
                  {punched ? '✓' : ''}
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 16, height: 8, background: '#F3DECF', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: '70%', background: 'linear-gradient(90deg, #E8632B, #FF8C42)' }} />
          </div>
          <div style={{ marginTop: 12, textAlign: 'center', fontWeight: 700, color: '#E8632B', fontSize: 14 }}>
            7 of 10 — just 3 more for a free coffee ♥
          </div>
        </div>
      </div>
    </div>
  </Shell>
);

// ── Active Points program ──────────────────────────────────────────────────────
export const LoyaltyPointsActive: React.FC = () => (
  <Shell title="Points Program" subtitle="1 point per $1 — redeem 100 points for $10 off.">
    <div style={{ display: 'flex', gap: 22 }}>
      <div
        style={{
          flex: 1,
          background: '#FFF',
          borderRadius: 18,
          padding: 28,
          border: '1px solid rgba(0,0,0,0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ fontSize: 12, color: '#888', fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase' }}>
          Program Configuration
        </div>
        <div>
          <div style={{ fontSize: 13, color: '#666', marginBottom: 6 }}>Program Name</div>
          <div style={{ padding: '12px 14px', background: '#F7F6F2', borderRadius: 10, fontWeight: 600 }}>
            Eddie Rewards
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: '#666', marginBottom: 6 }}>Points per $1</div>
            <div style={{ padding: '12px 14px', background: '#F7F6F2', borderRadius: 10, fontWeight: 800, fontSize: 18 }}>
              1.0
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: '#666', marginBottom: 6 }}>Threshold</div>
            <div style={{ padding: '12px 14px', background: '#F7F6F2', borderRadius: 10, fontWeight: 800, fontSize: 18 }}>
              100 pts
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: '#666', marginBottom: 6 }}>Reward</div>
            <div style={{ padding: '12px 14px', background: '#F7F6F2', borderRadius: 10, fontWeight: 800, fontSize: 18, color: '#29ABE2' }}>
              $10 off
            </div>
          </div>
        </div>
        <div
          style={{
            marginTop: 8,
            padding: '14px 18px',
            background: '#EAF7FD',
            border: '1px solid #B8E2F4',
            borderRadius: 12,
            color: '#1E6E92',
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          ● Active — 64 customers enrolled
        </div>
      </div>
      <div
        style={{
          width: 350,
          background: '#FFF',
          borderRadius: 18,
          padding: 22,
          border: '1px solid rgba(0,0,0,0.06)',
        }}
      >
        <div style={{ fontSize: 12, color: '#888', fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 14 }}>
          Customer View — Live Preview
        </div>
        <div
          style={{
            background: 'linear-gradient(135deg, #EAF7FD, #FFF)',
            borderRadius: 16,
            padding: 22,
            border: '1px solid #B8E2F4',
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 800 }}>Eddie Rewards</div>
          <div style={{ fontSize: 13, color: '#666', marginBottom: 14 }}>Eddie's Garage</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <div style={{ fontSize: 56, fontWeight: 900, color: '#29ABE2', lineHeight: 1 }}>72</div>
            <div style={{ fontSize: 18, color: '#1E6E92', fontWeight: 700 }}>/ 100 pts</div>
          </div>
          <div
            style={{
              marginTop: 12,
              height: 12,
              borderRadius: 6,
              background: '#E1F1FB',
              overflow: 'hidden',
            }}
          >
            <div style={{ height: '100%', width: '72%', background: '#29ABE2' }} />
          </div>
          <div style={{ marginTop: 12, fontWeight: 700, color: '#1E6E92', fontSize: 13 }}>
            28 more points to unlock $10 off
          </div>
        </div>
      </div>
    </div>
  </Shell>
);
