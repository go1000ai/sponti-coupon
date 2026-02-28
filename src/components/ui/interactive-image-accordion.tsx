'use client';

import React, { useState } from 'react';

const accordionItems = [
  {
    id: 1,
    title: 'Restaurant Deals',
    imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2070&auto=format&fit=crop',
  },
  {
    id: 2,
    title: 'Spa & Beauty',
    imageUrl: 'https://images.unsplash.com/photo-1560750588-73207b1ef5b8?q=80&w=2070&auto=format&fit=crop',
  },
  {
    id: 3,
    title: 'Fitness & Wellness',
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop',
  },
  {
    id: 4,
    title: 'Entertainment',
    imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=2074&auto=format&fit=crop',
  },
  {
    id: 5,
    title: 'Shopping',
    imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2070&auto=format&fit=crop',
  },
];

function AccordionItem({
  item,
  isActive,
  onActivate,
  isMobile,
}: {
  item: (typeof accordionItems)[number];
  isActive: boolean;
  onActivate: () => void;
  isMobile: boolean;
}) {
  return (
    <div
      className={`relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-700 ease-in-out ${
        isMobile ? 'w-full' : 'h-[450px]'
      }`}
      style={
        isMobile
          ? { height: isActive ? 200 : 60 }
          : { flex: isActive ? 6 : 1, height: 450 }
      }
      onMouseEnter={!isMobile ? onActivate : undefined}
      onClick={isMobile ? onActivate : undefined}
    >
      <img
        src={item.imageUrl}
        alt={item.title}
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-black bg-opacity-40" />
      <span
        className={`
          absolute text-white text-lg font-semibold whitespace-nowrap
          transition-all duration-300 ease-in-out
          ${
            isMobile
              ? 'bottom-4 left-4'
              : isActive
                ? 'bottom-6 left-1/2 -translate-x-1/2 rotate-0'
                : 'w-auto text-left bottom-24 left-1/2 -translate-x-1/2 rotate-90'
          }
        `}
      >
        {item.title}
      </span>
    </div>
  );
}

export function LandingAccordionItem() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <div className="w-full">
      <div className={`flex ${isMobile ? 'flex-col' : 'flex-row items-center'} gap-2 sm:gap-4 p-2 sm:p-4`}>
        {accordionItems.map((item, index) => (
          <AccordionItem
            key={item.id}
            item={item}
            isActive={index === activeIndex}
            onActivate={() => setActiveIndex(index)}
            isMobile={isMobile}
          />
        ))}
      </div>
    </div>
  );
}
