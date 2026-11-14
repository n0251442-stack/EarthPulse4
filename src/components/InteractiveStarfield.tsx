import React, { useEffect, useRef } from 'react';
import { useAccessibility } from '../context/AccessibilityContext';

interface Star {
  baseX: number;
  baseY: number;
  size: number;
  baseAlpha: number;
  alpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
  layer: number;
  color: string;
  hasGlow?: boolean;
}

export const InteractiveStarfield: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { settings } = useAccessibility();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Mouse coordinates for subtle 3D celestial parallax
    const mouse = {
      x: width / 2,
      y: height / 2,
      targetX: width / 2,
      targetY: height / 2,
    };

    // Realistic astronomical star colors (blackbody stellar temperatures)
    const starColors = [
      '#ffffff',
      '#ffffff',
      '#f8fafc',
      '#e0f2fe',
      '#bae6fd',
      '#7dd3fc',
      '#fef3c7',
    ];

    const starCount = 160;
    const stars: Star[] = [];

    const initStars = () => {
      stars.length = 0;
      for (let i = 0; i < starCount; i++) {
        const rand = Math.random();
        const layer = rand < 0.72 ? 1 : rand < 0.93 ? 2 : 3;

        const size =
          layer === 1
            ? Math.random() * 0.4 + 0.4
            : layer === 2
            ? Math.random() * 0.5 + 0.7
            : Math.random() * 0.6 + 1.2;

        const baseX = Math.random() * width;
        const baseY = Math.random() * height;

        const baseAlpha =
          layer === 1
            ? Math.random() * 0.32 + 0.18
            : layer === 2
            ? Math.random() * 0.38 + 0.38
            : Math.random() * 0.28 + 0.65;

        stars.push({
          baseX,
          baseY,
          size,
          baseAlpha,
          alpha: baseAlpha,
          twinkleSpeed: Math.random() * 0.015 + 0.004,
          twinklePhase: Math.random() * Math.PI * 2,
          layer,
          color: starColors[Math.floor(Math.random() * starColors.length)],
          hasGlow: layer === 3 && Math.random() < 0.38,
        });
      }
    };

    initStars();

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initStars();
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    let lastTime = performance.now();

    const render = (now: number) => {
      const rawDt = (now - lastTime) / 16.6667;
      const dt = Math.min(2.5, Math.max(0.25, rawDt));
      lastTime = now;

      ctx.clearRect(0, 0, width, height);

      // Subtle parallax easing
      mouse.x += (mouse.targetX - mouse.x) * 0.035;
      mouse.y += (mouse.targetY - mouse.y) * 0.035;

      const normX = (mouse.x - width / 2) / (width / 2);
      const normY = (mouse.y - height / 2) / (height / 2);

      // Calm, Realistic Stars
      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];

        const parallaxAmount = star.layer === 1 ? 3 : star.layer === 2 ? 8 : 15;
        const curX = star.baseX - normX * parallaxAmount;
        const curY = star.baseY - normY * parallaxAmount;

        if (!settings.reducedMotion) {
          star.twinklePhase += star.twinkleSpeed * dt;
          star.alpha =
            star.baseAlpha + Math.sin(star.twinklePhase) * (star.baseAlpha * 0.3);
        }

        const finalAlpha = Math.max(0.12, Math.min(1, star.alpha));

        if (star.hasGlow && finalAlpha > 0.55) {
          ctx.beginPath();
          ctx.arc(curX, curY, star.size * 2, 0, Math.PI * 2);
          ctx.fillStyle = star.color;
          ctx.globalAlpha = finalAlpha * 0.16;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(curX, curY, star.size, 0, Math.PI * 2);
        ctx.fillStyle = star.color;
        ctx.globalAlpha = finalAlpha;
        ctx.shadowColor = star.color;
        ctx.shadowBlur = star.layer === 3 ? 4 : 1.5;
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [settings.reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
      style={{ mixBlendMode: 'screen' }}
      aria-hidden="true"
    />
  );
};
