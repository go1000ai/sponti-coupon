import React from 'react';

/** A polished "phone in frame" container used to host UI mockups. */
export const PhoneFrame: React.FC<{ children: React.ReactNode; width?: number }> = ({
  children,
  width = 360,
}) => {
  const height = Math.round(width * (812 / 375));
  return (
    <div
      style={{
        width,
        height,
        background: '#0b0b0b',
        borderRadius: 44,
        border: '10px solid #1a1a1a',
        boxShadow:
          '0 30px 80px rgba(0,0,0,0.55), 0 8px 24px rgba(0,0,0,0.35), inset 0 0 0 2px rgba(255,255,255,0.04)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Notch */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 110,
          height: 24,
          background: '#0b0b0b',
          borderBottomLeftRadius: 14,
          borderBottomRightRadius: 14,
          zIndex: 5,
        }}
      />
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#FAFAF8',
          overflow: 'hidden',
          fontFamily: 'Inter, sans-serif',
          color: '#111',
        }}
      >
        {children}
      </div>
    </div>
  );
};

/** A simulated browser window with chrome bar — for laptop / desktop UI. */
export const BrowserFrame: React.FC<{
  url?: string;
  width?: number;
  height?: number;
  children: React.ReactNode;
}> = ({ url = 'sponticoupon.com/vendor/scan', width = 1280, height = 760, children }) => {
  return (
    <div
      style={{
        width,
        height,
        background: '#FFF',
        borderRadius: 16,
        boxShadow: '0 30px 80px rgba(0,0,0,0.45), 0 8px 30px rgba(0,0,0,0.25)',
        overflow: 'hidden',
        border: '1px solid rgba(0,0,0,0.1)',
        fontFamily: 'Inter, sans-serif',
        color: '#111',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Chrome bar */}
      <div
        style={{
          height: 42,
          background: '#EFEEEC',
          borderBottom: '1px solid rgba(0,0,0,0.08)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 14px',
          gap: 10,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', gap: 7 }}>
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#FF5F57' }} />
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#FEBC2E' }} />
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#28C840' }} />
        </div>
        <div
          style={{
            flex: 1,
            margin: '0 14px',
            background: '#FFF',
            borderRadius: 8,
            padding: '6px 14px',
            fontSize: 13,
            color: '#666',
            border: '1px solid rgba(0,0,0,0.08)',
          }}
        >
          {url}
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>{children}</div>
    </div>
  );
};
