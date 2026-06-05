import React from 'react';

// ── Vendor portal sidebar (compact) ────────────────────────────────────────────
const Sidebar: React.FC = () => (
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
        <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: 0.4 }}>SpontiCoupon</div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: 2 }}>
          VENDOR PORTAL
        </div>
      </div>
    </div>
    <div
      style={{
        padding: '10px 12px',
        borderRadius: 10,
        background: 'rgba(232,99,43,0.18)',
        color: '#FFB591',
        fontWeight: 600,
        fontSize: 13,
        marginBottom: 12,
        textAlign: 'center',
      }}
    >
      ⇄ Switch to Customer
    </div>
    {['Dashboard', 'Deals', 'Marketing', 'Business', 'Billing', 'Settings'].map((label) => {
      const isDealsParent = label === 'Deals';
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
          {isDealsParent && (
            <div style={{ marginLeft: 22, marginTop: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ padding: '6px 10px', borderRadius: 6, color: 'rgba(255,255,255,0.7)', fontSize: 12.5 }}>
                My Deals
              </div>
              <div
                style={{
                  padding: '6px 10px',
                  borderRadius: 6,
                  background: 'rgba(232,99,43,0.20)',
                  color: '#FF9F6F',
                  fontWeight: 700,
                  fontSize: 12.5,
                }}
              >
                Scan / Redeem
              </div>
              <div style={{ padding: '6px 10px', borderRadius: 6, color: 'rgba(255,255,255,0.7)', fontSize: 12.5 }}>
                Loyalty
              </div>
            </div>
          )}
        </div>
      );
    })}
  </div>
);

// ── Top header ────────────────────────────────────────────────────────────────
const Header: React.FC<{ title: string }> = ({ title }) => (
  <div
    style={{
      padding: '24px 36px 16px',
      borderBottom: '1px solid rgba(0,0,0,0.06)',
    }}
  >
    <div style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700 }}>
      Deals / Scan
    </div>
    <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>{title}</div>
  </div>
);

// ── Deal info card row ────────────────────────────────────────────────────────
const DealHeader: React.FC<{
  dealTitle: string;
  vendor?: string;
  customer?: string;
}> = ({ dealTitle, vendor = 'Eddie’s Garage', customer = 'Maria S.' }) => (
  <div
    style={{
      background: '#FFF',
      border: '1px solid rgba(0,0,0,0.06)',
      borderRadius: 16,
      padding: '18px 22px',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      boxShadow: '0 1px 0 rgba(0,0,0,0.02)',
    }}
  >
    <div
      style={{
        width: 56,
        height: 56,
        borderRadius: 12,
        background: 'linear-gradient(135deg, #E8632B, #FF8C42)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#FFF',
        fontSize: 24,
      }}
    >
      ✓
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 11, color: '#888', fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase' }}>
        {vendor} — Customer: {customer}
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, marginTop: 2 }}>{dealTitle}</div>
    </div>
    <div
      style={{
        padding: '6px 12px',
        background: '#FEEFE6',
        color: '#E8632B',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 800,
        letterSpacing: 0.5,
      }}
    >
      SPONTI DEAL
    </div>
  </div>
);

// ── Big-button helpers ────────────────────────────────────────────────────────
const BigPrimaryButton: React.FC<{ label: string; color?: string; subLabel?: string }> = ({
  label,
  color = '#E8632B',
  subLabel,
}) => (
  <div
    style={{
      width: '100%',
      padding: '20px 22px',
      borderRadius: 14,
      background: color,
      color: '#FFF',
      textAlign: 'center',
      fontWeight: 800,
      fontSize: 22,
      boxShadow: '0 8px 24px rgba(232,99,43,0.35)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 4,
    }}
  >
    {label}
    {subLabel && (
      <div style={{ fontSize: 13, fontWeight: 500, opacity: 0.9 }}>{subLabel}</div>
    )}
  </div>
);

const SecondaryButton: React.FC<{ label: string }> = ({ label }) => (
  <div
    style={{
      width: '100%',
      padding: '18px 22px',
      borderRadius: 14,
      background: '#FFF',
      color: '#222',
      border: '2px solid rgba(0,0,0,0.10)',
      textAlign: 'center',
      fontWeight: 700,
      fontSize: 17,
    }}
  >
    {label}
  </div>
);

// ── Three full scan-state mockups ─────────────────────────────────────────────
const Shell: React.FC<{ title?: string; children: React.ReactNode }> = ({ title = 'Redeem Deal', children }) => (
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
      <Header title={title} />
      <div style={{ flex: 1, padding: 32, display: 'flex', flexDirection: 'column', gap: 16, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  </div>
);

// State A: Paid in Full
export const ScanPaidInFullMockup: React.FC = () => (
  <Shell>
    <DealHeader dealTitle="Full Synthetic Oil Change — $39.99" />
    <div
      style={{
        background: '#FFF',
        border: '1px solid rgba(0,0,0,0.06)',
        borderRadius: 16,
        padding: 26,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#666' }}>
        <span>Deal Price</span>
        <span style={{ color: '#111', fontWeight: 700 }}>$39.99</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#666' }}>
        <span>Paid Online (Stripe)</span>
        <span style={{ color: '#15803D', fontWeight: 700 }}>$39.99</span>
      </div>
      <div
        style={{
          marginTop: 6,
          padding: '14px 18px',
          background: '#E7F8EE',
          border: '1px solid #BFEBC9',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: '#15803D',
            color: '#FFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
          }}
        >
          ✓
        </div>
        <div>
          <div style={{ fontWeight: 800, color: '#15803D', fontSize: 15 }}>PAID IN FULL</div>
          <div style={{ fontSize: 12, color: '#3a6248' }}>
            Money already settled to your Stripe Connect account.
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, paddingTop: 10, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <span style={{ fontWeight: 800 }}>Remaining Balance</span>
        <span style={{ fontWeight: 800, fontSize: 22, color: '#15803D' }}>$0.00</span>
      </div>
    </div>
    <BigPrimaryButton label="Confirm Redemption" color="#15803D" subLabel="No payment needed — just confirm" />
  </Shell>
);

// State B: Balance Owed
export const ScanBalanceOwedMockup: React.FC = () => (
  <Shell>
    <DealHeader dealTitle="Brake Pad Replacement — $189" customer="Joey K." />
    <div
      style={{
        background: '#FFF',
        border: '1px solid rgba(0,0,0,0.06)',
        borderRadius: 16,
        padding: 26,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#666' }}>
        <span>Deal Price</span>
        <span style={{ color: '#111', fontWeight: 700 }}>$189.00</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#666' }}>
        <span>Deposit Paid Online</span>
        <span style={{ color: '#15803D', fontWeight: 700 }}>−$50.00</span>
      </div>
      <div
        style={{
          marginTop: 4,
          padding: '14px 18px',
          background: '#FFF3E0',
          border: '1px solid #F8C088',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: '#E8632B',
            color: '#FFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
          }}
        >
          $
        </div>
        <div>
          <div style={{ fontWeight: 800, color: '#B04A1C', fontSize: 15 }}>BALANCE OWED IN STORE</div>
          <div style={{ fontSize: 12, color: '#7d4b2f' }}>
            Collect $139.00 now to close out this deal.
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, paddingTop: 10, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <span style={{ fontWeight: 800 }}>Remaining Balance</span>
        <span style={{ fontWeight: 800, fontSize: 22, color: '#E8632B' }}>$139.00</span>
      </div>
    </div>
    <div style={{ display: 'flex', gap: 12 }}>
      <div style={{ flex: 1 }}>
        <BigPrimaryButton label="Send Stripe Payment Link" subLabel="Text/email — customer pays on phone" />
      </div>
      <div style={{ flex: 1 }}>
        <SecondaryButton label="Mark Collected in Person" />
      </div>
    </div>
  </Shell>
);

// State C: Pay in Person
export const ScanPayInPersonMockup: React.FC = () => (
  <Shell>
    <DealHeader dealTitle="Free A/C Inspection" customer="Devon R." />
    <div
      style={{
        background: '#FFF',
        border: '1px solid rgba(0,0,0,0.06)',
        borderRadius: 16,
        padding: 26,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <div
        style={{
          padding: '14px 18px',
          background: '#EAF7FD',
          border: '1px solid #B8E2F4',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: '#29ABE2',
            color: '#FFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
          }}
        >
          i
        </div>
        <div>
          <div style={{ fontWeight: 800, color: '#1E6E92', fontSize: 15 }}>PAY IN PERSON</div>
          <div style={{ fontSize: 12, color: '#1E6E92' }}>
            No money has moved online. Handle payment at the counter however you like.
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#666' }}>
        <span>Deal Price</span>
        <span style={{ color: '#111', fontWeight: 700 }}>Free</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, paddingTop: 10, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <span style={{ fontWeight: 800 }}>Online Charge</span>
        <span style={{ fontWeight: 800, fontSize: 22 }}>$0.00</span>
      </div>
    </div>
    <BigPrimaryButton label="Confirm Redemption" subLabel="Verify the customer and you're done" />
  </Shell>
);

// State D: Reward Earned (loyalty)
export const ScanRewardEarnedMockup: React.FC = () => (
  <Shell>
    <DealHeader dealTitle="Premium Detail — $129" customer="Sara M." />
    <div
      style={{
        background: '#FFF',
        border: '1px solid rgba(0,0,0,0.06)',
        borderRadius: 16,
        padding: 22,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <div
        style={{
          padding: '18px 22px',
          background: 'linear-gradient(135deg, #E8632B 0%, #FF8C42 100%)',
          borderRadius: 14,
          color: '#FFF',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          boxShadow: '0 12px 30px rgba(232,99,43,0.35)',
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.22)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
          }}
        >
          ★
        </div>
        <div>
          <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: 0.5 }}>REWARD EARNED</div>
          <div style={{ fontSize: 14, opacity: 0.95 }}>Coffee Club — 10/10 punches → Free large coffee</div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#666' }}>
        <span>Deal Price</span>
        <span style={{ color: '#111', fontWeight: 700 }}>$129.00</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#666' }}>
        <span>Paid Online (Stripe)</span>
        <span style={{ color: '#15803D', fontWeight: 700 }}>$129.00</span>
      </div>
      <div style={{ fontSize: 13, color: '#666', paddingTop: 6 }}>
        Honor the free coffee at the counter — Sara has earned it.
      </div>
    </div>
    <BigPrimaryButton label="Confirm Redemption + Honor Reward" color="#E8632B" />
  </Shell>
);
