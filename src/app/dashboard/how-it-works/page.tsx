import { HowItWorksVideo } from '@/components/dashboard/HowItWorksVideo';
import { Search, Ticket, QrCode, Gift } from 'lucide-react';

export const metadata = {
  title: 'How It Works · SpontiCoupon',
};

const steps = [
  { icon: Search, title: 'Browse deals', text: 'Flash Sponti Coupons and ongoing Steady Deals from local businesses near you.' },
  { icon: Ticket, title: 'Claim & pay', text: 'Sponti Coupons are paid in full by card. Steady Deals are flexible — pay in full, leave a deposit, or claim now and pay when you use it.' },
  { icon: QrCode, title: 'Show your code', text: 'Get a 6-digit code and a QR instantly. Show it in store or use it on the vendor’s website — any deposit is credited toward your total.' },
  { icon: Gift, title: 'Earn rewards', text: 'Collect Business Rewards at each shop, plus SpontiPoints cash-back credit you can use with any Sponti vendor.' },
];

export default function HowItWorksPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="animate-fade-up">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          How <span className="gradient-text">SpontiCoupon</span> works
        </h1>
        <p className="text-gray-500 mt-1">A quick guide to claiming deals, redeeming codes, and earning rewards.</p>
      </div>

      <div className="animate-fade-up">
        <HowItWorksVideo />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {steps.map(({ icon: Icon, title, text }, i) => (
          <div
            key={title}
            className="card p-4 sm:p-5 animate-fade-up"
            style={{ animationDelay: `${i * 80 + 80}ms` }}
          >
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary-500 p-2.5 shadow-lg shadow-primary-500/25 flex-shrink-0">
                <Icon className="w-5 h-5 text-white" />
              </div>
              <h2 className="font-bold text-gray-900">{title}</h2>
            </div>
            <p className="text-sm text-gray-600 mt-2.5 leading-relaxed">{text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
