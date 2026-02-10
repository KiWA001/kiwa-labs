'use client';

import { useEffect } from 'react';

export default function IOSSwipeBlocker() {
    useEffect(() => {
        const handleTouchStart = (e: TouchEvent) => {
            // Block native swipe if it starts very close to the edge
            if (e.touches[0] && e.touches[0].pageX < 25) {
                e.preventDefault();
            }
        };

        // passive: false is required to support preventDefault
        window.addEventListener('touchstart', handleTouchStart, { passive: false });

        return () => {
            window.removeEventListener('touchstart', handleTouchStart);
        };
    }, []);

    return null;
}
