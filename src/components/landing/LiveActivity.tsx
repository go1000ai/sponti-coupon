'use client';

import { useEffect, useState } from 'react';
import { ShoppingBag, MapPin, Clock } from 'lucide-react';

const ACTIVITIES = [
  { name: 'Jessica M.', action: 'claimed', deal: '50% Off Thai Massage', city: 'Orlando', ago: '2 min ago' },
  { name: 'David P.', action: 'saved', deal: 'BOGO Craft Cocktails', city: 'Winter Park', ago: '4 min ago' },
  { name: 'Ashley R.', action: 'claimed', deal: '40% Off Yoga Classes', city: 'Kissimmee', ago: '5 min ago' },
  { name: 'Michael K.', action: 'redeemed', deal: '30% Off Auto Detailing', city: 'Lake Nona', ago: '8 min ago' },
  { name: 'Sarah L.', action: 'claimed', deal: '60% Off Facial Treatment', city: 'Dr. Phillips', ago: '11 min ago' },
  { name: 'James W.', action: 'claimed', deal: 'Kids Eat Free Weekend', city: 'Altamonte Springs', ago: '13 min ago' },
  { name: 'Lisa T.', action: 'redeemed', deal: '$20 Off Hair Styling', city: 'Winter Garden', ago: '15 min ago' },
  { name: 'Chris N.', action: 'claimed', deal: '45% Off Escape Room', city: 'Sanford', ago: '18 min ago' },
];

export function LiveActivity() {
  const [visibleActivities, setVisibleActivities] = useState(ACTIVITIES.slice(0, 4));
  const [fadeIndex, setFadeIndex] = useState(-1);

  useEffect(() => {
    let index = 4;
    const interval = setInterval(() => {
      setFadeIndex(0);
      setTimeout(() => {
        setVisibleActivities(prev => {
          const next = [...prev];
          next.shift();
          next.push(ACTIVITIES[index % ACTIVITIES.length]);
          index++;
          return next;
        });
        setFadeIndex(-1);
      }, 300);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-6 sm:py-8 bg-white border-y border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="pulse-dot w-2.5 h-2.5 rounded-full bg-green-500" />
          <span className="text-sm font-semibold text-gray-900">Live Activity</span>
          <span className="text-xs text-gray-400">Real-time deal activity near you</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {visibleActivities.map((activity, i) => (
            <div
              key={`${activity.name}-${activity.deal}-${i}`}
              className={`flex items-start gap-3 bg-gray-50 rounded-xl p-3 transition-all duration-300 ${
                i === fadeIndex ? 'opacity-0 -translate-y-2' : 'opacity-100 translate-y-0'
              }`}
            >
              <div className={`shrink-0 rounded-full p-2 ${
                activity.action === 'claimed' ? 'bg-primary-100' : activity.action === 'redeemed' ? 'bg-green-100' : 'bg-blue-100'
              }`}>
                <ShoppingBag className={`w-3.5 h-3.5 ${
                  activity.action === 'claimed' ? 'text-primary-500' : activity.action === 'redeemed' ? 'text-green-500' : 'text-blue-500'
                }`} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-900 truncate">
                  <span className="font-semibold">{activity.name}</span>{' '}
                  {activity.action}{' '}
                  <span className="font-medium text-primary-500">{activity.deal}</span>
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                    <MapPin className="w-2.5 h-2.5" /> {activity.city}
                  </span>
                  <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" /> {activity.ago}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
