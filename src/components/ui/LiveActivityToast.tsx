'use client';

import { useEffect, useState, useCallback } from 'react';
import { ShoppingBag, MapPin, Clock, X } from 'lucide-react';

const ACTIVITIES = [
  { name: 'Jessica M.', action: 'claimed', deal: '50% Off Thai Massage', city: 'Miami', ago: '2 min ago' },
  { name: 'David P.', action: 'saved', deal: 'BOGO Craft Cocktails', city: 'Fort Lauderdale', ago: '4 min ago' },
  { name: 'Ashley R.', action: 'claimed', deal: '40% Off Yoga Classes', city: 'Coral Gables', ago: '5 min ago' },
  { name: 'Michael K.', action: 'redeemed', deal: '30% Off Auto Detailing', city: 'Hollywood', ago: '8 min ago' },
  { name: 'Sarah L.', action: 'claimed', deal: '60% Off Facial Treatment', city: 'Boca Raton', ago: '11 min ago' },
  { name: 'James W.', action: 'claimed', deal: 'Kids Eat Free Weekend', city: 'Doral', ago: '13 min ago' },
  { name: 'Lisa T.', action: 'redeemed', deal: '$20 Off Hair Styling', city: 'Aventura', ago: '15 min ago' },
  { name: 'Chris N.', action: 'claimed', deal: '45% Off Escape Room', city: 'Pembroke Pines', ago: '18 min ago' },
  { name: 'Maria G.', action: 'claimed', deal: '55% Off Couples Dinner', city: 'South Beach', ago: '20 min ago' },
  { name: 'Tyler B.', action: 'redeemed', deal: '35% Off Oil Change', city: 'Kendall', ago: '22 min ago' },
];

const SHOW_DURATION = 5500; // ms the toast stays visible
const INTERVAL = 14000; // ms between toasts
const INITIAL_DELAY = 6000; // ms before first toast

/**
 * LiveActivityToast — animated floating FOMO toast that slides in from the
 * bottom-left with a countdown progress bar. Pops up every ~14 seconds
 * showing deal claim activity. Dismissible by the user.
 */
export function LiveActivityToast() {
  const [visible, setVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [progressActive, setProgressActive] = useState(false);

  const showToast = useCallback((index: number) => {
    setCurrentIndex(index);
    setVisible(true);
    // Small delay to allow the slide-in animation before starting the progress bar
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setProgressActive(true);
      });
    });

    setTimeout(() => {
      setVisible(false);
      setProgressActive(false);
    }, SHOW_DURATION);
  }, []);

  useEffect(() => {
    if (dismissed) return;

    let idx = 0;

    const initialTimeout = setTimeout(() => {
      showToast(idx);
    }, INITIAL_DELAY);

    const interval = setInterval(() => {
      if (dismissed) return;
      idx = (idx + 1) % ACTIVITIES.length;
      showToast(idx);
    }, INTERVAL);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [dismissed, showToast]);

  if (dismissed) return null;

  const activity = ACTIVITIES[currentIndex];

  const iconBg =
    activity.action === 'claimed'
      ? 'bg-primary-100'
      : activity.action === 'redeemed'
        ? 'bg-green-100'
        : 'bg-blue-100';

  const iconColor =
    activity.action === 'claimed'
      ? 'text-primary-500'
      : activity.action === 'redeemed'
        ? 'text-green-500'
        : 'text-blue-500';

  const progressColor =
    activity.action === 'claimed'
      ? 'bg-primary-500'
      : activity.action === 'redeemed'
        ? 'bg-green-500'
        : 'bg-blue-500';

  return (
    <div
      className={`
        fixed bottom-20 sm:bottom-6 left-4 sm:left-6 z-50
        max-w-[320px] sm:max-w-sm w-[calc(100%-2rem)] sm:w-auto
        bg-white rounded-2xl shadow-2xl
        border border-gray-100
        overflow-hidden
        transition-all duration-700
        ${visible
          ? 'translate-x-0 opacity-100 scale-100'
          : '-translate-x-8 opacity-0 scale-95 pointer-events-none'
        }
      `}
      style={{
        transitionTimingFunction: visible
          ? 'cubic-bezier(0.34, 1.56, 0.64, 1)' // overshoot bounce on enter
          : 'cubic-bezier(0.55, 0, 1, 0.45)',     // smooth ease-out on exit
      }}
    >
      {/* Content */}
      <div className="p-3.5 pr-9">
        {/* Dismiss button */}
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-2.5 right-2.5 text-gray-300 hover:text-gray-500 transition-colors p-1 rounded-full hover:bg-gray-100"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-start gap-3">
          {/* Animated icon with pulse ring */}
          <div className="relative shrink-0">
            <div className={`rounded-full p-2.5 ${iconBg} transition-colors duration-300`}>
              <ShoppingBag className={`w-4 h-4 ${iconColor} transition-colors duration-300`} />
            </div>
            {/* Ping animation on the icon */}
            <span className={`absolute -top-0.5 -right-0.5 flex h-3 w-3`}>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
            </span>
          </div>

          <div className="min-w-0 pt-0.5">
            <p className="text-[13px] text-secondary-500 leading-snug">
              <span className="font-bold">{activity.name}</span>{' '}
              <span className="text-gray-400">{activity.action}</span>{' '}
              <span className="font-semibold text-primary-500">{activity.deal}</span>
            </p>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-[11px] text-gray-400 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {activity.city}
              </span>
              <span className="text-[11px] text-gray-400 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {activity.ago}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Animated progress bar — shrinks over SHOW_DURATION */}
      <div className="h-[3px] bg-gray-100 w-full">
        <div
          className={`h-full ${progressColor} rounded-full transition-all ease-linear`}
          style={{
            width: progressActive ? '0%' : '100%',
            transitionDuration: progressActive ? `${SHOW_DURATION - 200}ms` : '0ms',
          }}
        />
      </div>
    </div>
  );
}
