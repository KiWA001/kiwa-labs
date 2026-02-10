'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface Ripple {
    id: number;
    x: number;
    y: number;
    radius: number;
    maxRadius: number;
    startTime: number;
}

interface WaterRippleProps {
    children: React.ReactNode;
    isActive: boolean;
    onSwipe?: () => void;
}

export default function WaterRipple({ children, isActive, onSwipe }: WaterRippleProps) {
    const [ripples, setRipples] = useState<Ripple[]>([]);
    const [distortionScale, setDistortionScale] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rippleIdRef = useRef(0);
    const animationFrameRef = useRef<number | undefined>(undefined);
    const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const touchStartRef = useRef<{ x: number; y: number } | null>(null);
    const ripplesRef = useRef<Ripple[]>([]);

    // Get text center position relative to container
    const getTextCenter = useCallback(() => {
        if (!containerRef.current || !textRef.current) return null;
        const containerRect = containerRef.current.getBoundingClientRect();
        const textRect = textRef.current.getBoundingClientRect();
        return {
            x: textRect.left - containerRect.left + textRect.width / 2,
            y: textRect.top - containerRect.top + textRect.height / 2,
            width: textRect.width,
            height: textRect.height,
        };
    }, []);

    // Animation loop for ripples
    const animate = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx || !containerRef.current) {
            animationFrameRef.current = requestAnimationFrame(animate);
            return;
        }

        const containerRect = containerRef.current.getBoundingClientRect();
        canvas.width = containerRect.width;
        canvas.height = containerRect.height;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const textCenter = getTextCenter();
        let shouldDistort = false;
        let maxDistortionIntensity = 0;

        // Update and draw ripples
        const updatedRipples = ripplesRef.current.map(ripple => {
            const elapsed = Date.now() - ripple.startTime;
            const progress = elapsed / 2000; // 2 second animation
            const newRadius = progress * ripple.maxRadius;

            // Check if ripple wave is near the text
            if (textCenter) {
                const distToText = Math.sqrt(
                    Math.pow(textCenter.x - ripple.x, 2) +
                    Math.pow(textCenter.y - ripple.y, 2)
                );

                // The wave "ring" has a thickness
                const ringThickness = 60;
                const ringInner = newRadius - ringThickness / 2;
                const ringOuter = newRadius + ringThickness / 2;

                // Check if the ring intersects with the text area
                const textRadius = Math.max(textCenter.width, textCenter.height) / 2;
                if (distToText >= ringInner - textRadius && distToText <= ringOuter + textRadius) {
                    shouldDistort = true;
                    // Intensity based on how centered the ring is on the text
                    const centeredness = 1 - Math.abs(distToText - newRadius) / ringThickness;
                    const fadeOut = 1 - progress; // Fade as ripple expands
                    maxDistortionIntensity = Math.max(maxDistortionIntensity, centeredness * fadeOut * 0.8);
                }
            }

            // Draw circular ripple rings
            if (progress < 1) {
                const opacity = (1 - progress) * 0.3;

                // Draw multiple concentric rings for water effect
                for (let i = 0; i < 3; i++) {
                    const ringRadius = newRadius - i * 15;
                    if (ringRadius > 0) {
                        ctx.beginPath();
                        ctx.arc(ripple.x, ripple.y, ringRadius, 0, Math.PI * 2);
                        ctx.strokeStyle = `rgba(0, 0, 0, ${opacity * (1 - i * 0.3)})`;
                        ctx.lineWidth = 2 - i * 0.5;
                        ctx.stroke();
                    }
                }
            }

            return { ...ripple, radius: newRadius };
        }).filter(ripple => ripple.radius < ripple.maxRadius);

        ripplesRef.current = updatedRipples;
        setRipples(updatedRipples);
        setDistortionScale(shouldDistort ? maxDistortionIntensity * 20 : 0);

        animationFrameRef.current = requestAnimationFrame(animate);
    }, [getTextCenter]);

    // Create a random ripple
    const createRipple = useCallback(() => {
        if (!containerRef.current || !isActive) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = Math.random() * rect.width;
        const y = Math.random() * rect.height;

        // Calculate max radius to reach all corners
        const maxRadius = Math.sqrt(Math.pow(rect.width, 2) + Math.pow(rect.height, 2));

        const newRipple: Ripple = {
            id: rippleIdRef.current++,
            x,
            y,
            radius: 0,
            maxRadius,
            startTime: Date.now(),
        };

        ripplesRef.current = [...ripplesRef.current, newRipple];
        setRipples(ripplesRef.current);
    }, [isActive]);

    // Schedule next ripple with random interval (0.5 to 3 seconds)
    const scheduleNextRipple = useCallback(() => {
        if (!isActive) return;

        const delay = 500 + Math.random() * 2500; // 0.5s to 3s
        timeoutRef.current = setTimeout(() => {
            createRipple();
            scheduleNextRipple();
        }, delay);
    }, [isActive, createRipple]);

    // Start/stop ripple generation and animation based on isActive
    useEffect(() => {
        if (isActive) {
            // Start animation loop
            animationFrameRef.current = requestAnimationFrame(animate);
            // Create initial ripple after a short delay
            setTimeout(() => {
                createRipple();
                scheduleNextRipple();
            }, 300);
        } else {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            // Clear remaining ripples
            ripplesRef.current = [];
            setRipples([]);
            setDistortionScale(0);
        }

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [isActive, animate, createRipple, scheduleNextRipple]);

    // Detect swipe to stop ripples
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

            // If it's a swipe (moved more than 30px)
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
        <div ref={containerRef} className="water-ripple-container">
            {/* SVG Filter for water distortion */}
            <svg className="water-ripple-svg" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <filter id="water-distortion" x="-50%" y="-50%" width="200%" height="200%">
                        <feTurbulence
                            type="fractalNoise"
                            baseFrequency="0.02"
                            numOctaves="3"
                            seed="5"
                            result="noise"
                        />
                        <feDisplacementMap
                            in="SourceGraphic"
                            in2="noise"
                            scale={distortionScale}
                            xChannelSelector="R"
                            yChannelSelector="G"
                        />
                    </filter>
                </defs>
            </svg>

            {/* Canvas for drawing circular ripples */}
            <canvas ref={canvasRef} className="water-ripple-canvas" />

            {/* Content with filter applied only when ripple hits */}
            <div
                ref={textRef}
                className="water-ripple-content"
                style={{
                    filter: distortionScale > 0 ? 'url(#water-distortion)' : 'none',
                    transition: 'filter 0.1s ease-out',
                }}
            >
                {children}
            </div>

            <style jsx>{`
        .water-ripple-container {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }

        .water-ripple-svg {
          position: absolute;
          width: 0;
          height: 0;
          pointer-events: none;
        }

        .water-ripple-canvas {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        .water-ripple-content {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1;
        }
      `}</style>
        </div>
    );
}
