'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function GlobalSwipeNavigator() {
    const router = useRouter();
    const pathname = usePathname();
    const touchStartRef = useRef<{ x: number; y: number } | null>(null);

    useEffect(() => {
        // Optional: Exclude specific pages (e.g., Home)
        // if (pathname === '/') return;

        const handleTouchStart = (e: TouchEvent) => {
            const touchX = e.touches[0].clientX;
            const windowWidth = window.innerWidth;
            
            // Ignore touches on the right edge where scroll bar is (iOS)
            if (touchX > windowWidth - 40) {
                touchStartRef.current = null;
                return;
            }
            
            touchStartRef.current = {
                x: touchX,
                y: e.touches[0].clientY,
            };
        };

        const handleTouchEnd = (e: TouchEvent) => {
            if (!touchStartRef.current) {
                return;
            }

            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;

            const xDiff = touchEndX - touchStartRef.current.x;
            const yDiff = touchEndY - touchStartRef.current.y;

            // Logic:
            // 1. Start near left edge (< 40px)
            // 2. Swipe Right (xDiff > 50)
            // 3. Horizontal > Vertical * 1.5 (Swipe is horizontal-ish)
            if (
                touchStartRef.current.x < 50 &&
                xDiff > 60 &&
                Math.abs(xDiff) > Math.abs(yDiff) * 1.5
            ) {
                // Dispatch a custom event for edge swipe (right)
                const edgeEvent = new CustomEvent('edge-swipe-right');
                window.dispatchEvent(edgeEvent);

                // Dispatch general swipe-back event
                const backEvent = new CustomEvent('swipe-back');
                window.dispatchEvent(backEvent);
            }

            touchStartRef.current = null;
        };

        window.addEventListener('touchstart', handleTouchStart, { passive: true });
        window.addEventListener('touchend', handleTouchEnd, { passive: true });

        return () => {
            window.removeEventListener('touchstart', handleTouchStart);
            window.removeEventListener('touchend', handleTouchEnd);
        };
    }, [pathname, router]);

    return null;
}
