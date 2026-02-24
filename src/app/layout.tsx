import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#E8632B",
};

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sponticoupon.com';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "SpontiCoupon — Sponti Deals & Coupons Near You | Up to 70% Off Local Businesses",
    template: "%s | SpontiCoupon",
  },
  description: "Save up to 70% with 24-hour Sponti Deals from verified local businesses. Restaurants, spas, fitness, entertainment & more. Claim exclusive Sponti Coupons before they expire!",
  keywords: [
    "coupons near me", "sponti deals", "local deals", "discount coupons",
    "restaurant deals", "spa deals", "daily deals", "sponti coupon",
    "sponticoupon", "last minute deals", "deal of the day",
    "local business coupons", "Miami deals", "best deals near me",
    "coupon app", "sponti sale", "limited time offers",
  ],
  authors: [{ name: "SpontiCoupon", url: BASE_URL }],
  creator: "Online Commerce Hub, LLC",
  publisher: "SpontiCoupon",
  manifest: "/manifest.json",
  alternates: {
    canonical: BASE_URL,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: BASE_URL,
    siteName: "SpontiCoupon",
    title: "SpontiCoupon — Sponti Deals & Coupons Near You | Up to 70% Off",
    description: "Save up to 70% with 24-hour Sponti Deals from verified local businesses. Restaurants, spas, fitness & more. Claim before they expire!",
    images: [
      {
        url: `${BASE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "SpontiCoupon — Sponti Deals Near You",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SpontiCoupon — Sponti Deals & Coupons Near You",
    description: "Save up to 70% with 24-hour Sponti Deals from verified local businesses. Claim exclusive Sponti Coupons before they expire!",
    images: [`${BASE_URL}/og-image.png`],
    creator: "@sponticoupon",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    // Add these when you have the verification codes:
    // google: "your-google-verification-code",
    // yandex: "your-yandex-verification-code",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SpontiCoupon",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
    "google": "notranslate",
  },
  category: "shopping",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // JSON-LD structured data for AEO/GEO — helps AI engines and Google understand the site
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "SpontiCoupon",
    url: BASE_URL,
    logo: `${BASE_URL}/logo.png`,
    description: "SpontiCoupon connects consumers with exclusive 24-hour Sponti Deals from verified local businesses, offering up to 70% off restaurants, spas, fitness, entertainment and more.",
    foundingDate: "2025",
    founder: { "@type": "Organization", name: "Online Commerce Hub, LLC" },
    sameAs: [],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      url: `${BASE_URL}/for-business`,
    },
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "SpontiCoupon",
    url: BASE_URL,
    description: "Discover 24-hour Sponti Deals from verified local businesses. Save up to 70% on restaurants, spas, fitness, entertainment and more.",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE_URL}/deals?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is SpontiCoupon?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "SpontiCoupon is a Sponti Deal platform that connects consumers with exclusive 24-hour deals from verified local businesses. Vendors post time-limited Sponti Coupons with discounts of up to 70% off, which consumers can claim by paying a small deposit and redeeming with a QR code at the business.",
        },
      },
      {
        "@type": "Question",
        name: "How do Sponti Coupons work?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Browse available Sponti Deals near you, claim a deal by paying a small deposit, receive a unique QR code, then visit the business and show your QR code to redeem the discount. Sponti Coupons expire within 24 hours, creating urgency and deeper discounts than regular deals.",
        },
      },
      {
        "@type": "Question",
        name: "Is SpontiCoupon free for consumers?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes! SpontiCoupon is completely free to browse and use for consumers. You only pay a small deposit when you claim a deal, which goes toward your purchase at the business.",
        },
      },
      {
        "@type": "Question",
        name: "How is SpontiCoupon different from other deal platforms?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "SpontiCoupon charges a flat monthly fee instead of taking a percentage of each sale. Vendors keep 100% of their revenue, control their own deal terms and deposit policies, and get paid instantly. We focus on 24-hour Sponti Deals (Sponti Coupons) with deeper discounts, verified businesses, and instant QR code redemption.",
        },
      },
      {
        "@type": "Question",
        name: "What types of deals are available on SpontiCoupon?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "SpontiCoupon features deals across many categories including restaurants, spas & beauty, health & fitness, entertainment, shopping, food & drink, automotive, classes & courses, and wellness. Discounts range from 25% to 70% off.",
        },
      },
      {
        "@type": "Question",
        name: "How do I redeem a Sponti Coupon?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "After claiming a deal, you receive a unique QR code. Visit the business location and show your QR code to the staff. They scan it to verify and apply your discount instantly. No printing required — everything is digital.",
        },
      },
      {
        "@type": "Question",
        name: "What cities does SpontiCoupon serve?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "SpontiCoupon is currently launching in Miami, Florida and surrounding areas including Miami Beach, Coral Gables, and Brickell. We are expanding to more cities soon. Sign up to be notified when SpontiCoupon arrives in your area.",
        },
      },
      {
        "@type": "Question",
        name: "How do businesses list deals on SpontiCoupon?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Business owners can sign up as a vendor on SpontiCoupon, choose a subscription plan starting at $29/month, and start posting deals immediately. Create regular deals that last up to 30 days or Sponti Deals that expire in 24 hours with deeper discounts to drive foot traffic.",
        },
      },
      {
        "@type": "Question",
        name: "Can I get a refund on a Sponti Coupon deposit?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Deposit policies vary by deal. Since Sponti Coupons expire within 24 hours, deposits are generally non-refundable once claimed. The deposit goes toward your purchase at the business, so you never pay extra — it's simply a commitment to redeem the deal.",
        },
      },
    ],
  };

  // HowTo schema for AEO — helps answer engines explain the process
  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Use SpontiCoupon to Save Money at Local Businesses",
    description: "Save up to 70% with Sponti Deals from verified local businesses in 4 simple steps.",
    totalTime: "PT5M",
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Browse Deals Near You",
        text: "Open SpontiCoupon and explore Sponti Deals from verified local businesses in your area. Filter by category, distance, or discount percentage to find the perfect deal.",
        url: `${BASE_URL}/deals`,
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Claim a Sponti Coupon",
        text: "Found a deal you love? Claim it by paying a small deposit. The deposit goes toward your purchase at the business. Sponti Coupons offer deeper discounts but expire in 24 hours.",
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Get Your QR Code",
        text: "After claiming, you receive a unique QR code in your account. This is your digital coupon — no printing needed.",
      },
      {
        "@type": "HowToStep",
        position: 4,
        name: "Redeem at the Business",
        text: "Visit the local business and show your QR code. The staff scans it to verify and apply your discount instantly. Enjoy your savings!",
      },
    ],
  };

  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        {/* JSON-LD Structured Data for SEO, AEO & GEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
        />
      </head>
      <body className={`${inter.className} antialiased`}>
        <Navbar />
        <main className="min-h-screen">{children}</main>
        <Footer />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
