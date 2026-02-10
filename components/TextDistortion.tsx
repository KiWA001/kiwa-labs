'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface Ripple {
    x: number;
    y: number;
    radius: number;
    maxRadius: number;
    startTime: number;
}

interface TextDistortionProps {
    children: React.ReactNode;
    ripples: { x: number; y: number; radius: number; startTime: number }[];
    isActive: boolean;
}

export default function TextDistortion({ children, ripples, isActive }: TextDistortionProps) {
    const textRef = useRef<HTMLDivElement>(null);
    const [distortionIntensity, setDistortionIntensity] = useState(0);

    // Calculate distortion based on ripple proximity
    useEffect(() => {
        if (!isActive || !textRef.current) {
            setDistortionIntensity(0);
            return;
        }

        const checkDistortion = () => {
            if (!textRef.current) return;

            const textRect = textRef.current.getBoundingClientRect();
            const textCenterX = textRect.width / 2;
            const textCenterY = textRect.height / 2;
            const textRadius = Math.max(textRect.width, textRect.height) / 2;

            let maxIntensity = 0;

            ripples.forEach(ripple => {
                // Calculate if ripple ring is near the text
                const dx = ripple.x - textCenterX;
                const dy = ripple.y - textCenterY;
                const distToText = Math.sqrt(dx * dx + dy * dy);

                const ringThickness = 80;
                const ringInner = ripple.radius - ringThickness / 2;
                const ringOuter = ripple.radius + ringThickness / 2;

                // Check if ring intersects text area
                if (distToText >= ringInner - textRadius && distToText <= ringOuter + textRadius) {
                    const age = (performance.now() - ripple.startTime) / 4000; // 4s duration
                    const fadeOut = Math.max(0, 1 - age);
                    const centeredness = 1 - Math.abs(distToText - ripple.radius) / ringThickness;
                    const intensity = centeredness * fadeOut * 0.5;
                    maxIntensity = Math.max(maxIntensity, intensity);
                }
            });

            setDistortionIntensity(maxIntensity);
        };

        const intervalId = setInterval(checkDistortion, 50);
        return () => clearInterval(intervalId);
    }, [ripples, isActive]);

    const distortionScale = distortionIntensity * 15;

    return (
        <div ref={textRef} className="text-distortion-container">
            <svg className="distortion-svg" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <filter id="text-water-distortion" x="-20%" y="-20%" width="140%" height="140%">
                        <feTurbulence
                            type="fractalNoise"
                            baseFrequency="0.015"
                            numOctaves="2"
                            result="noise"
                        >
                            <animate
                                attributeName="baseFrequency"
                                values="0.015;0.02;0.015"
                                dur="3s"
                                repeatCount="indefinite"
                            />
                        </feTurbulence>
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

            <div
                className="distorted-content"
                style={{
                    filter: distortionScale > 0.5 ? 'url(#text-water-distortion)' : 'none',
                }}
            >
                {children}
            </div>

            <style jsx>{`
        .text-distortion-container {
          position: relative;
          z-index: 1;
        }

        .distortion-svg {
          position: absolute;
          width: 0;
          height: 0;
          pointer-events: none;
        }

        .distorted-content {
          transition: filter 0.15s ease-out;
        }
      `}</style>
        </div>
    );
}
