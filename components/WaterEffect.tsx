'use client';

import { useEffect, useRef, useCallback } from 'react';
import * as PIXI from 'pixi.js';

interface Ripple {
    x: number;
    y: number;
    radius: number;
    maxRadius: number;
    startTime: number;
    strength: number;
}

interface Wave {
    angle: number; // Direction in radians
    offset: number;
    speed: number;
    amplitude: number;
    wavelength: number;
    startTime: number;
}

interface WaterEffectProps {
    isActive: boolean;
    onSwipe?: () => void;
}

export default function WaterEffect({ isActive, onSwipe }: WaterEffectProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pixiAppRef = useRef<PIXI.Application | null>(null);
    const ripplesRef = useRef<Ripple[]>([]);
    const wavesRef = useRef<Wave[]>([]);
    const displacementDataRef = useRef<Uint8ClampedArray | null>(null);
    const animationRef = useRef<number | undefined>(undefined);
    const rippleTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const waveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const touchStartRef = useRef<{ x: number; y: number } | null>(null);
    const isActiveRef = useRef(isActive);

    // Keep ref in sync
    useEffect(() => {
        isActiveRef.current = isActive;
    }, [isActive]);

    // Create a ripple at random position
    const createRipple = useCallback(() => {
        if (!containerRef.current || !isActiveRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const ripple: Ripple = {
            x: Math.random() * rect.width,
            y: Math.random() * rect.height,
            radius: 0,
            maxRadius: Math.max(rect.width, rect.height) * 1.5,
            startTime: performance.now(),
            strength: 0.3 + Math.random() * 0.4, // Random strength 0.3-0.7
        };
        ripplesRef.current.push(ripple);
    }, []);

    // Create a wave from random direction
    const createWave = useCallback(() => {
        if (!isActiveRef.current) return;

        // Random angle: 0 = right, PI/2 = down, PI = left, 3PI/2 = up
        const angles = [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4, Math.PI];
        const angle = angles[Math.floor(Math.random() * angles.length)];

        const wave: Wave = {
            angle,
            offset: 0,
            speed: 50 + Math.random() * 30, // pixels per second
            amplitude: 8 + Math.random() * 8,
            wavelength: 100 + Math.random() * 50,
            startTime: performance.now(),
        };
        wavesRef.current.push(wave);
    }, []);

    // Schedule next ripple
    const scheduleRipple = useCallback(() => {
        if (!isActiveRef.current) return;
        const delay = 3000 + Math.random() * 2000; // 3-5 seconds
        rippleTimeoutRef.current = setTimeout(() => {
            createRipple();
            scheduleRipple();
        }, delay);
    }, [createRipple]);

    // Schedule next wave
    const scheduleWave = useCallback(() => {
        if (!isActiveRef.current) return;
        const delay = 5000 + Math.random() * 5000; // 5-10 seconds for waves
        waveTimeoutRef.current = setTimeout(() => {
            createWave();
            scheduleWave();
        }, delay);
    }, [createWave]);

    // Main animation loop
    const animate = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        const container = containerRef.current;

        if (!canvas || !ctx || !container) {
            animationRef.current = requestAnimationFrame(animate);
            return;
        }

        const rect = container.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;

        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }

        ctx.clearRect(0, 0, width, height);
        const now = performance.now();

        // Draw ripples
        ripplesRef.current = ripplesRef.current.filter(ripple => {
            const elapsed = now - ripple.startTime;
            const duration = 4000; // 4 seconds for full ripple
            const progress = elapsed / duration;

            if (progress >= 1) return false;

            const currentRadius = progress * ripple.maxRadius;
            const fadeOut = 1 - progress;

            // Draw multiple concentric rings (like real water)
            const ringCount = 5;
            const ringSpacing = 25;

            for (let i = 0; i < ringCount; i++) {
                const ringRadius = currentRadius - i * ringSpacing;
                if (ringRadius > 0) {
                    const ringFade = fadeOut * (1 - i * 0.15);
                    const opacity = ringFade * ripple.strength * 0.08; // Very faint

                    ctx.beginPath();
                    ctx.arc(ripple.x, ripple.y, ringRadius, 0, Math.PI * 2);
                    ctx.strokeStyle = `rgba(180, 180, 180, ${opacity})`;
                    ctx.lineWidth = 1.5 - i * 0.2;
                    ctx.stroke();
                }
            }

            return true;
        });

        // Draw waves
        wavesRef.current = wavesRef.current.filter(wave => {
            const elapsed = now - wave.startTime;
            const duration = 8000; // 8 seconds for wave to pass
            const progress = elapsed / duration;

            if (progress >= 1) return false;

            const fadeIn = Math.min(progress * 4, 1);
            const fadeOut = Math.max(0, 1 - (progress - 0.7) * 3.33);
            const fade = fadeIn * fadeOut;

            // Calculate wave offset
            const offset = elapsed * wave.speed / 1000;

            // Draw wave lines
            const lineCount = 3;
            for (let i = 0; i < lineCount; i++) {
                ctx.beginPath();
                const waveOffset = offset + i * 30;
                const opacity = fade * 0.06 * (1 - i * 0.25);

                ctx.strokeStyle = `rgba(180, 180, 180, ${opacity})`;
                ctx.lineWidth = 1.5 - i * 0.3;

                // Draw curved wave line
                const cos = Math.cos(wave.angle);
                const sin = Math.sin(wave.angle);

                for (let t = 0; t <= Math.max(width, height) * 1.5; t += 5) {
                    // Perpendicular to wave direction
                    const px = -sin * (t - width * 0.75);
                    const py = cos * (t - height * 0.75);

                    // Along wave direction with sine offset
                    const wavePos = waveOffset + t * 0.01;
                    const sineOffset = Math.sin(wavePos / wave.wavelength * Math.PI * 2) * wave.amplitude;

                    const x = width / 2 + px + cos * (waveOffset + sineOffset);
                    const y = height / 2 + py + sin * (waveOffset + sineOffset);

                    if (t === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                }
                ctx.stroke();
            }

            return true;
        });

        animationRef.current = requestAnimationFrame(animate);
    }, []);

    // Initialize and cleanup
    useEffect(() => {
        if (isActive) {
            // Start animation
            animationRef.current = requestAnimationFrame(animate);

            // Start scheduling
            setTimeout(() => {
                createRipple();
                scheduleRipple();
            }, 500);

            setTimeout(() => {
                createWave();
                scheduleWave();
            }, 2000);
        } else {
            // Stop everything
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
            if (rippleTimeoutRef.current) {
                clearTimeout(rippleTimeoutRef.current);
            }
            if (waveTimeoutRef.current) {
                clearTimeout(waveTimeoutRef.current);
            }
            ripplesRef.current = [];
            wavesRef.current = [];

            // Clear canvas
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (canvas && ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
            if (rippleTimeoutRef.current) {
                clearTimeout(rippleTimeoutRef.current);
            }
            if (waveTimeoutRef.current) {
                clearTimeout(waveTimeoutRef.current);
            }
        };
    }, [isActive, animate, createRipple, createWave, scheduleRipple, scheduleWave]);

    // Swipe detection
    useEffect(() => {
        const handleTouchStart = (e: TouchEvent) => {
            touchStartRef.current = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY,
            };
        };

        const handleTouchEnd = (e: TouchEvent) => {
            if (!touchStartRef.current) return;

            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;

            const xDiff = Math.abs(touchEndX - touchStartRef.current.x);
            const yDiff = Math.abs(touchEndY - touchStartRef.current.y);

            if (xDiff > 30 || yDiff > 30) {
                onSwipe?.();
            }

            touchStartRef.current = null;
        };

        window.addEventListener('touchstart', handleTouchStart, { passive: true });
        window.addEventListener('touchend', handleTouchEnd, { passive: true });

        return () => {
            window.removeEventListener('touchstart', handleTouchStart);
            window.removeEventListener('touchend', handleTouchEnd);
        };
    }, [onSwipe]);

    return (
        <div ref={containerRef} className="water-effect-container">
            <canvas ref={canvasRef} className="water-effect-canvas" />

            <style jsx>{`
        .water-effect-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 0;
        }

        .water-effect-canvas {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }
      `}</style>
        </div>
    );
}
