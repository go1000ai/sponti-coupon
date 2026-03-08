import type { Step } from 'react-joyride';

/**
 * Vendor Dashboard Tour
 * Comprehensive guide covering every dashboard section and sidebar tab,
 * including AI image/video generation, social auto-posting, and payment setup.
 */
export const VENDOR_DASHBOARD_STEPS: Step[] = [
  // ── Welcome ──
  {
    target: 'body',
    title: 'Welcome to SpontiCoupon!',
    content:
      "Let's take a full tour of your vendor dashboard so you can start creating deals and growing your business. This will only take a minute!",
    placement: 'center',
    disableBeacon: true,
  },

  // ── Dashboard Sections ──
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
      'Tap here to build a new deal. Choose between a Sponti Coupon (timed, urgency-driven) or a Steady Deal (always-on). Set pricing, discount, deposit, expiration, and more.',
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
      'Jump to detailed Analytics or get AI-powered recommendations from Ava to boost your conversions and revenue.',
    placement: 'top',
    disableBeacon: true,
  },
  {
    target: '[data-tour="vendor-roi"]',
    title: 'ROI Dashboard',
    content:
      'See your return on investment — total revenue generated, customer acquisition cost, and lifetime value projections.',
    placement: 'top',
    disableBeacon: true,
  },
  {
    target: '[data-tour="vendor-deals"]',
    title: 'Recent Deals',
    content:
      'All your deals listed with status, pricing, claim counts, and countdown timers. Click any deal to view, edit, pause, or duplicate it.',
    placement: 'top',
    disableBeacon: true,
  },

  // ── Sidebar Tabs ──
  {
    target: '[data-tour="vendor-website-import"]',
    title: 'Website Import',
    content:
      "The fastest way to get started! Paste your website URL and Ava will auto-extract your business info, services, and images to generate deals in seconds.",
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="vendor-nav-deals"]',
    title: 'My Deals',
    content:
      'View all your deals in calendar or list format. Filter by status, edit active deals, pause or duplicate them, and track expirations. When creating a deal, Ava can generate a professional image or video for you automatically.',
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="vendor-nav-media"]',
    title: 'Media Library',
    content:
      'Upload and manage all your photos and videos in one place. Images uploaded when creating deals are saved here automatically for reuse across future deals.',
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="vendor-nav-loyalty"]',
    title: 'Loyalty Programs',
    content:
      'Create punch cards or points-based loyalty programs. Set rewards, track participation, and boost repeat business — customers earn stamps every time they redeem a deal.',
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="vendor-nav-reviews"]',
    title: 'Reviews',
    content:
      'See what customers are saying about your deals. Respond to reviews to build trust and improve your reputation on the platform.',
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="vendor-nav-social"]',
    title: 'Social Media Auto-Posting',
    content:
      'Connect your Facebook, Instagram, X (Twitter), and TikTok accounts. Every time you publish a deal, Ava automatically writes platform-specific captions and posts to all your social accounts — hands free.',
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="vendor-nav-getpaid"]',
    title: 'Get Paid — Payment Setup',
    content:
      'Choose how you collect deposits from customers. Connect Stripe for automatic payments, or use Venmo, Zelle, or Cash App — we handle the instructions and QR code generation for you.',
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="vendor-nav-branding"]',
    title: 'Branding',
    content:
      'Customize your storefront — upload your logo, set brand colors, and make your deals stand out with a consistent, professional look across the platform.',
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="vendor-nav-support"]',
    title: 'Support — Meet Olivia',
    content:
      'Need help? Chat with Olivia, our AI support assistant, for instant answers about deals, redemptions, or your account. You can also open a support ticket for complex issues.',
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
      "You also have Analytics, Ava AI Insights, Locations, Team Management, API Keys, and Subscription in the sidebar. Explore at your own pace — you've got everything you need to grow!",
    placement: 'right',
    disableBeacon: true,
  },
];

/**
 * Social Media Page Tour
 * Step-by-step guide to creating the most effective Post or Reel.
 */
export const SOCIAL_PAGE_TOUR_STEPS: Step[] = [
  // ── Welcome ──
  {
    target: 'body',
    title: 'Social Media Posting Guide',
    content:
      "Let's walk you through how to create an effective social media post or Reel for your deal. Follow these steps and you'll have a professional post ready in minutes!",
    placement: 'center',
    disableBeacon: true,
  },

  // ── Step 1: Connect platforms ──
  {
    target: '[data-tour="social-connections"]',
    title: 'Step 1: Connect Your Accounts',
    content:
      'First, connect your social media accounts. Click "Connect" on Facebook and Instagram to link them. Once connected, your posts will go directly to your business pages.',
    placement: 'bottom',
    disableBeacon: true,
  },

  // ── Step 2: Select a deal ──
  {
    target: '[data-tour="social-deal-select"]',
    title: 'Step 2: Pick a Deal to Promote',
    content:
      'Choose which deal you want to post about. Pick your best-performing deal or a new one you want to push. The deal\'s image and info will be used to create your post.',
    placement: 'bottom',
    disableBeacon: true,
  },

  // ── Step 3: Post vs Reel toggle ──
  {
    target: '[data-tour="social-post-reel"]',
    title: 'Step 3: Post or Reel?',
    content:
      'Choose your format. A "Post" uses a static image — great for deals with eye-catching photos. A "Reel" is a short vertical video (9:16) — these get 2-3x more reach on Instagram and Facebook. If you have a good image, try a Reel!',
    placement: 'bottom',
    disableBeacon: true,
  },

  // ── Step 4: Media options ──
  {
    target: '[data-tour="social-media-section"]',
    title: 'Step 4: Choose or Create Your Media',
    content:
      'For Posts: pick an image from your library or use the deal\'s image. For Reels: you have two options — "Animate your image" turns your photo into a video with motion, or "Ask Ava" to create something brand new. Describe what you want — the more specific, the better!',
    placement: 'bottom',
    disableBeacon: true,
  },

  // ── Step 5: Ava AI ──
  {
    target: '[data-tour="social-ava"]',
    title: 'Pro Tip: Use Ava for Best Results',
    content:
      'Ava is your AI creative assistant. Tell her what you want: "fun food video with latin music and zoom on the dish" or "bright flat-lay photo of our spa products." She\'ll generate a professional image or Reel for you. Be specific about music, mood, camera angles, and style!',
    placement: 'bottom',
    disableBeacon: true,
  },

  // ── Step 6: Tone ──
  {
    target: '[data-tour="social-tone"]',
    title: 'Step 5: Set Your Caption Tone',
    content:
      'Pick the vibe for your captions. "Fun & playful" works great for restaurants and bars. "Professional & polished" is better for spas and services. "Urgent & exciting" drives FOMO for flash deals. The AI writes platform-specific captions in your chosen tone.',
    placement: 'bottom',
    disableBeacon: true,
  },

  // ── Step 7: Generate Preview ──
  {
    target: '[data-tour="social-generate"]',
    title: 'Step 6: Generate Preview',
    content:
      'Hit this button to see exactly how your post will look on Facebook and Instagram. The AI writes tailored captions for each platform — you can edit them before posting.',
    placement: 'top',
    disableBeacon: true,
  },

  // ── Step 8: Preview mockups ──
  {
    target: '[data-tour="social-mockups"]',
    title: 'Step 7: Review Your Post',
    content:
      'See realistic mockups of how your post will appear on each platform. Click "Edit caption" to tweak the text. If you chose a Reel, preview the video with sound — make sure it looks and sounds great before posting!',
    placement: 'top',
    disableBeacon: true,
  },

  // ── Step 9: Post / Schedule ──
  {
    target: '[data-tour="social-actions"]',
    title: 'Step 8: Post, Schedule, or Save',
    content:
      '"Post Now" publishes immediately to all connected platforms. "Schedule" lets you pick a date and time — great for posting during peak hours (lunch time, evenings). "Save Draft" saves your work to finish later. That\'s it — you\'re a social media pro!',
    placement: 'top',
    disableBeacon: true,
  },

  // ── Calendar ──
  {
    target: '[data-tour="social-calendar"]',
    title: 'Bonus: Content Calendar',
    content:
      'Track all your posts here — see what\'s scheduled, what\'s been posted, and plan your content strategy. Aim for 3-4 posts per week for best results. Consistency is key!',
    placement: 'top',
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
    title: 'Support — Meet Olivia',
    content:
      'Need help? Chat with Olivia, our AI assistant, for instant answers about deals, redemptions, or your account. Open a ticket for anything else.',
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
    target: 'body',
    title: "You're All Set!",
    content:
      "You have everything you need to start saving. Browse deals, claim coupons, and show your QR code at the business to redeem. Happy savings!",
    placement: 'center',
    disableBeacon: true,
  },
];
