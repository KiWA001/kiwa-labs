'use client';

import { useEffect } from 'react';

export default function ZoomBlocker() {
    useEffect(() => {
        const handleGestureStart = (e: Event) => {
            e.preventDefault();
        };

        const handleGestureChange = (e: Event) => {
            e.preventDefault();
        };

        const handleGestureEnd = (e: Event) => {
            e.preventDefault();
        };

        // Add event listeners with passive: false to ensure preventDefault works
        // gesturestart/change/end are specifically for multi-touch gestures like pinch
        document.addEventListener('gesturestart', handleGestureStart, { passive: false });
        document.addEventListener('gesturechange', handleGestureChange, { passive: false });
        document.addEventListener('gestureend', handleGestureEnd, { passive: false });

        return () => {
            document.removeEventListener('gesturestart', handleGestureStart);
            document.removeEventListener('gesturechange', handleGestureChange);
            document.removeEventListener('gestureend', handleGestureEnd);
        };
    }, []);

    return null;
}
