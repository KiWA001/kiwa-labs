'use client';

import React, { useRef, useEffect, useCallback } from 'react';

type Stage = 'intro' | 'tagline' | 'landing';

interface ParticleTextProps {
    text: string;
    stage: Stage;
    className?: string;
    fontFamily?: string;
}

interface Particle {
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    scatteredX: number;
    scatteredY: number;
    driftX: number; // For continuous movement on tagline
    driftY: number;
    size: number;
}

const ParticleText: React.FC<ParticleTextProps> = ({
    text,
    stage,
    className = '',
    fontFamily = "'Apple SD Gothic Neo', 'Noto Sans KR', 'Roboto', sans-serif",
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<Particle[]>([]);
    const animationFrameIdRef = useRef<number>(0);
    const initializedRef = useRef(false);
    const prevStageRef = useRef<Stage>(stage);
    const assembleDelayRef = useRef(false); // Flag to delay assembly
    const assemblyCompleteRef = useRef(false); // Track when assembly animation is done
    const currentOpacityRef = useRef(0); // Start completely invisible
    const targetOpacityRef = useRef(0); // Start completely invisible

    // Initialize particles once
    const initParticles = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;

        // Font size calculation
        let sizeValue = 60;
        const vw10 = window.innerWidth * 0.10;
        const rem2_5 = 16 * 2.5;
        const rem6 = 16 * 6;
        sizeValue = Math.min(Math.max(rem2_5, vw10), rem6);

        // Draw text at full resolution
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'black';
        ctx.font = `100 ${sizeValue * dpr}px ${fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const x = window.innerWidth / 2 * dpr;
        const y = window.innerHeight / 2 * dpr;
        ctx.fillText(text, x, y);

        // Sample pixel data
        const textCoordinates = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const particles: Particle[] = [];
        const step = 2;

        for (let py = 0; py < canvas.height; py += step) {
            for (let px = 0; px < canvas.width; px += step) {
                const index = (py * canvas.width + px) * 4;
                if (textCoordinates.data[index + 3] > 128) {
                    const positionX = px / dpr;
                    const positionY = py / dpr;

                    // Scattered position: random across the viewport
                    const scatteredX = Math.random() * window.innerWidth;
                    const scatteredY = Math.random() * window.innerHeight;

                    particles.push({
                        x: positionX, // Start at text position
                        y: positionY,
                        targetX: positionX,
                        targetY: positionY,
                        scatteredX,
                        scatteredY,
                        driftX: (Math.random() - 0.5) * 2, // Random drift direction
                        driftY: (Math.random() - 0.5) * 2,
                        size: Math.random() * 1.2 + 0.5,
                    });
                }
            }
        }

        particlesRef.current = particles;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.scale(dpr, dpr);
        initializedRef.current = true;
    }, [text, fontFamily]);

    // Animation loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Initialize if not done
        if (!initializedRef.current) {
            initParticles();
        }

        // Detect transition: tagline -> landing (forward)
        // Add 0.8s delay before assembly starts
        let delayTimeout: NodeJS.Timeout | null = null;
        if (prevStageRef.current === 'tagline' && stage === 'landing') {
            assembleDelayRef.current = true;
            assemblyCompleteRef.current = false; // Reset assembly state
            currentOpacityRef.current = 0.4; // Start with full opacity
            targetOpacityRef.current = 0.4; // Keep high during assembly
            delayTimeout = setTimeout(() => {
                assembleDelayRef.current = false;
            }, 800); // 0.8 second delay
        } else if (stage !== 'landing') {
            // Reset flags if not landing
            assembleDelayRef.current = false;
            assemblyCompleteRef.current = false;
        }
        prevStageRef.current = stage;

        const animate = () => {
            const dpr = window.devicePixelRatio || 1;
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.scale(dpr, dpr);

            const particles = particlesRef.current;

            // Track how many particles have reached their target
            let assembledCount = 0;
            const assemblyThreshold = 2; // Distance threshold to consider "assembled"

            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];

                if (stage === 'intro') {
                    // Intro: assemble to text position (FAST)
                    const dx = p.targetX - p.x;
                    const dy = p.targetY - p.y;
                    // Snap to exact position when close enough
                    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
                        p.x = p.targetX;
                        p.y = p.targetY;
                    } else {
                        p.x += dx * 0.24; // Very fast assembly
                        p.y += dy * 0.24;
                    }
                } else if (stage === 'landing' && !assembleDelayRef.current) {
                    // Landing: assemble to text position (SLOW)
                    const dx = p.targetX - p.x;
                    const dy = p.targetY - p.y;
                    p.x += dx * 0.03; // Medium assembly
                    p.y += dy * 0.03;

                    // Check if this particle is assembled
                    if (Math.abs(dx) < assemblyThreshold && Math.abs(dy) < assemblyThreshold) {
                        assembledCount++;
                    }
                } else if (stage === 'tagline' || (stage === 'landing' && assembleDelayRef.current)) {
                    // Tagline OR landing during delay: scatter AND continuously drift around
                    const dx = p.scatteredX - p.x;
                    const dy = p.scatteredY - p.y;

                    // Move towards scattered position initially
                    p.x += dx * 0.03;
                    p.y += dy * 0.03;

                    // Add continuous drift
                    p.x += p.driftX * 0.5;
                    p.y += p.driftY * 0.5;

                    // Bounce off edges
                    if (p.x < 0 || p.x > window.innerWidth) p.driftX *= -1;
                    if (p.y < 0 || p.y > window.innerHeight) p.driftY *= -1;

                    // Update scattered position for organic movement
                    p.scatteredX += p.driftX * 0.5;
                    p.scatteredY += p.driftY * 0.5;
                    if (p.scatteredX < 0 || p.scatteredX > window.innerWidth) p.driftX *= -1;
                    if (p.scatteredY < 0 || p.scatteredY > window.innerHeight) p.driftY *= -1;
                }
            }

            // Check if assembly is complete (95% of particles assembled)
            if (stage === 'landing' && !assembleDelayRef.current && !assemblyCompleteRef.current) {
                if (assembledCount >= particles.length * 0.95) {
                    assemblyCompleteRef.current = true;
                    targetOpacityRef.current = 0.08; // Now start fading
                }
            }

            // Determine target opacity based on stage
            if (stage === 'tagline' || assembleDelayRef.current) {
                targetOpacityRef.current = 0.4; // High opacity during scatter
            } else if (stage === 'landing' && assemblyCompleteRef.current) {
                targetOpacityRef.current = 0.08; // Low opacity after assembly
            } else if (stage === 'landing' && !assemblyCompleteRef.current) {
                targetOpacityRef.current = 0.4; // Keep high during assembly animation
            } else if (stage === 'intro') {
                targetOpacityRef.current = 0;
            }

            // Smoothly interpolate opacity towards target
            const opacitySpeed = 0.02; // Slow, gradual fade
            currentOpacityRef.current += (targetOpacityRef.current - currentOpacityRef.current) * opacitySpeed;

            // Draw all particles with the current opacity
            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];
                ctx.fillStyle = `rgba(0, 0, 0, ${currentOpacityRef.current})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.closePath();
                ctx.fill();
            }

            animationFrameIdRef.current = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            cancelAnimationFrame(animationFrameIdRef.current);
        };
    }, [stage, initParticles]);

    // Handle resize
    useEffect(() => {
        const handleResize = () => {
            initializedRef.current = false;
            initParticles();
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [initParticles]);

    return (
        <canvas
            ref={canvasRef}
            className={className}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 0,
            }}
        />
    );
};

export default ParticleText;
