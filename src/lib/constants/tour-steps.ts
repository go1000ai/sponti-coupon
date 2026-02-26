import type { Step } from 'react-joyride';

/**
 * Vendor Dashboard Tour
 * Comprehensive guide covering every dashboard section and sidebar tab.
 */
export const VENDOR_DASHBOARD_STEPS: Step[] = [
  // ── Dashboard Sections ──
  {
    target: 'body',
    title: 'Welcome to SpontiCoupon!',
    content:
      "Let's take a full tour of your vendor dashboard so you can start creating deals and growing your business.",
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '[data-tour="vendor-stats"]',
    title: 'Performance at a Glance',
    content:
      'These cards show your key metrics — active deals, total claims, redemptions, conversion rate, and deposit revenue. They update in real time.',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="vendor-create"]',
    title: 'Create a Deal',
    content:
      'Tap here to manually build a new deal. Set pricing, discount percentage, deposit requirement, expiration, and more.',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="vendor-scan-qr"]',
    title: 'Scan QR Code',
    content:
      "Use your phone or webcam to scan a customer's QR code for instant redemption. Great for in-store use.",
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="vendor-redeem"]',
    title: 'Quick Redeem',
    content:
      "Alternatively, type in the customer's 6-digit redemption code right here. The deal is verified and redeemed instantly.",
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="vendor-claims-chart"]',
    title: 'Claims Chart',
    content:
      'This chart shows claim trends across your recent deals. Spot which deals are performing best and when claims spike.',
    placement: 'left',
    disableBeacon: true,
  },
  {
    target: '[data-tour="vendor-actions"]',
    title: 'Quick Actions',
    content:
      'Jump to detailed Analytics or get AI-powered recommendations to boost your conversions and revenue.',
    placement: 'top',
    disableBeacon: true,
  },
  {
    target: '[data-tour="vendor-roi"]',
    title: 'ROI Dashboard',
    content:
      'See your return on investment at a glance — total revenue generated, customer acquisition cost, and lifetime value projections.',
    placement: 'top',
    disableBeacon: true,
  },
  {
    target: '[data-tour="vendor-deals"]',
    title: 'Recent Deals',
    content:
      'All your deals listed with status, pricing, claim counts, and countdown timers for Sponti Coupons. Click any deal to view or edit.',
    placement: 'top',
    disableBeacon: true,
  },

  // ── Sidebar Tabs ──
  {
    target: '[data-tour="vendor-website-import"]',
    title: 'Website Import',
    content:
      "The fastest way to get started! Paste your website URL and we'll auto-extract your business info, services, and images to generate deals.",
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="vendor-nav-deals"]',
    title: 'My Deals',
    content:
      'View all your deals in a calendar or list format. Filter by status, edit active deals, pause or duplicate them, and track expirations.',
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="vendor-nav-media"]',
    title: 'Media Library',
    content:
      'Upload and manage all your images in one place. Photos you upload when creating deals are automatically saved here for reuse.',
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="vendor-nav-loyalty"]',
    title: 'Loyalty Programs',
    content:
      'Create punch cards or points-based loyalty programs to keep customers coming back. Set rewards, track participation, and boost repeat business.',
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="vendor-nav-reviews"]',
    title: 'Reviews',
    content:
      'See what customers are saying about your deals. Respond to reviews to build trust and improve your reputation.',
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="vendor-nav-branding"]',
    title: 'Branding',
    content:
      'Customize your storefront appearance — upload your logo, set brand colors, and make your deals stand out with a consistent look.',
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="vendor-nav-support"]',
    title: 'Support — Meet Mia',
    content:
      'Need help? Chat with Mia, our AI support assistant, for instant answers. You can also open a support ticket for complex issues.',
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="vendor-nav-settings"]',
    title: 'Settings',
    content:
      'Manage your business profile, notification preferences, guided tour options, and account details all in one place.',
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="vendor-sidebar"]',
    title: "You're All Set!",
    content:
      "You also have access to Analytics, AI Insights, Locations, Team Management, API keys, Subscription, and Payment Methods in the sidebar. Explore at your own pace — you've got this!",
    placement: 'right',
    disableBeacon: true,
  },
];

/**
 * Customer Dashboard Tour
 * Comprehensive guide covering every dashboard section and sidebar tab.
 */
export const CUSTOMER_DASHBOARD_STEPS: Step[] = [
  // ── Dashboard Sections ──
  {
    target: 'body',
    title: 'Welcome to SpontiCoupon!',
    content:
      "Let's show you around so you can start discovering amazing deals and saving money right away.",
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '[data-tour="customer-stats"]',
    title: 'Your Savings Dashboard',
    content:
      'Track your total savings, active deals, redeemed coupons, and pending savings. Watch these numbers grow as you claim more deals!',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="customer-actions"]',
    title: 'Browse & Redeem',
    content:
      "Browse Deals to discover new offers near you. View My QR Codes to see your active coupons — just show the QR code or 6-digit code at the business.",
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="customer-loyalty"]',
    title: 'Loyalty Rewards',
    content:
      'Earn stamps and points every time you redeem a deal at your favorite businesses. Keep visiting to unlock free rewards and exclusive perks!',
    placement: 'top',
    disableBeacon: true,
  },

  // ── Sidebar Tabs ──
  {
    target: '[data-tour="customer-nav-coupons"]',
    title: 'My Coupons',
    content:
      'All your claimed deals in one place. View your QR codes, check redemption codes, see deposit status, and track expiration countdowns.',
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="customer-nav-loyalty"]',
    title: 'Loyalty Rewards',
    content:
      'View all your loyalty punch cards and point balances. See how close you are to your next reward at each business.',
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="customer-nav-foryou"]',
    title: 'Deals For You',
    content:
      'Personalized deal recommendations based on your interests and past activity. Discover new businesses and offers you might love.',
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="customer-nav-notifications"]',
    title: 'Notifications',
    content:
      'Stay updated on new deals, expiring coupons, loyalty milestones, and messages from businesses. Never miss a deal again!',
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="customer-nav-browse"]',
    title: 'Browse Deals',
    content:
      'Explore all available deals in your area. Filter by category, distance, discount percentage, or deal type to find exactly what you want.',
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="customer-nav-support"]',
    title: 'Support — Meet Mia',
    content:
      'Need help? Chat with Mia, our AI assistant, for instant answers about deals, redemptions, or your account. Open a ticket for anything else.',
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="customer-nav-settings"]',
    title: 'Settings',
    content:
      'Update your profile, manage notification preferences, and customize your account. You can also reset the guided tour here.',
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="customer-sidebar"]',
    title: "You're All Set!",
    content:
      "You have everything you need to start saving. Browse deals, claim coupons, and show your QR code at the business to redeem. Happy saving!",
    placement: 'right',
    disableBeacon: true,
  },
];
