'use client';

import { useEffect, useRef, useCallback } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  size: number;
  opacity: number;
  color: string;
  state: 'forming' | 'dispersing' | 'stable';
  life: number;
  maxLife: number;
}

interface ParticleDustEffectProps {
  isActive: boolean;
  sourceX: number;
  sourceY: number;
  targetX?: number;
  targetY?: number;
  mode: 'form' | 'disperse';
  onComplete?: () => void;
  particleCount?: number;
  color?: string;
}

export default function ParticleDustEffect({
  isActive,
  sourceX,
  sourceY,
  targetX,
  targetY,
  mode,
  onComplete,
  particleCount = 150,
  color = '#000000',
}: ParticleDustEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);
  const isCompleteRef = useRef(false);

  const createParticles = useCallback(() => {
    const particles: Particle[] = [];
    
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      
      if (mode === 'form') {
        // Particles start from source and move to target
        particles.push({
          x: sourceX + (Math.random() - 0.5) * 100,
          y: sourceY + (Math.random() - 0.5) * 100,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          targetX: targetX ?? sourceX + (Math.random() - 0.5) * 200,
          targetY: targetY ?? sourceY + (Math.random() - 0.5) * 200,
          size: Math.random() * 3 + 1,
          opacity: 0,
          color: color,
          state: 'forming',
          life: 0,
          maxLife: Math.random() * 60 + 60,
        });
      } else {
        // Particles start at position and disperse outward
        particles.push({
          x: sourceX + (Math.random() - 0.5) * 300,
          y: sourceY + (Math.random() - 0.5) * 300,
          vx: Math.cos(angle) * (speed * 2),
          vy: Math.sin(angle) * (speed * 2),
          targetX: sourceX + Math.cos(angle) * 500,
          targetY: sourceY + Math.sin(angle) * 500,
          size: Math.random() * 4 + 2,
          opacity: Math.random() * 0.5 + 0.3,
          color: color,
          state: 'dispersing',
          life: 0,
          maxLife: Math.random() * 40 + 40,
        });
      }
    }
    
    return particles;
  }, [sourceX, sourceY, targetX, targetY, mode, particleCount, color]);

  useEffect(() => {
    if (!isActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Initialize particles
    particlesRef.current = createParticles();
    isCompleteRef.current = false;

    const animate = () => {
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      let activeParticles = 0;

      particlesRef.current.forEach((particle) => {
        particle.life++;

        if (mode === 'form') {
          // Forming animation - particles gather from source to target
          const dx = particle.targetX - particle.x;
          const dy = particle.targetY - particle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance > 5) {
            particle.vx += dx * 0.001;
            particle.vy += dy * 0.001;
            particle.vx *= 0.95; // Damping
            particle.vy *= 0.95;
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            // Fade in
            if (particle.opacity < 0.8) {
              particle.opacity += 0.02;
            }
            activeParticles++;
          } else {
            particle.opacity *= 0.95; // Fade out when reached
            if (particle.opacity > 0.01) activeParticles++;
          }
        } else {
          // Dispersing animation - particles blow away
          particle.x += particle.vx;
          particle.y += particle.vy;
          particle.vx *= 1.02; // Accelerate
          particle.vy *= 1.02;
          
          // Fade out
          particle.opacity *= 0.96;
          
          if (particle.opacity > 0.01) {
            activeParticles++;
          }
        }

        // Draw particle
        ctx.save();
        ctx.globalAlpha = particle.opacity;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Add glow effect
        ctx.shadowBlur = 10;
        ctx.shadowColor = particle.color;
        ctx.fill();
        ctx.restore();
      });

      // Continue animation or complete
      if (activeParticles > 0) {
        animationRef.current = requestAnimationFrame(animate);
      } else if (!isCompleteRef.current) {
        isCompleteRef.current = true;
        onComplete?.();
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [isActive, mode, createParticles, onComplete]);

  if (!isActive) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    />
  );
}
