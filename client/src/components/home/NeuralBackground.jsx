import { useEffect, useRef } from 'react';

/**
 * Ambient "neural network" canvas for the home hero.
 * - Nodes drift slowly and link when close, with a soft cursor attraction.
 * - Pauses when off-screen or tab hidden; renders a static frame for reduced motion.
 */
export default function NeuralBackground({ className = '' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let nodes = [];
    let raf = 0;
    let visible = true;
    const pointer = { x: -9999, y: -9999 };

    const seed = () => {
      const count = Math.round(Math.min(90, Math.max(36, (width * height) / 16000)));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        r: Math.random() * 1.4 + 0.6,
        hue: Math.random() < 0.7 ? 'indigo' : 'cyan',
      }));
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const linkDist = 130;

      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < linkDist * linkDist) {
            const alpha = (1 - Math.sqrt(d2) / linkDist) * 0.22;
            ctx.strokeStyle = `rgba(129, 140, 248, ${alpha})`;
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      for (const n of nodes) {
        const dx = n.x - pointer.x;
        const dy = n.y - pointer.y;
        const near = dx * dx + dy * dy < 160 * 160;
        ctx.fillStyle = n.hue === 'cyan'
          ? `rgba(103, 232, 249, ${near ? 0.95 : 0.6})`
          : `rgba(165, 180, 252, ${near ? 0.95 : 0.55})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, near ? n.r + 0.8 : n.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const step = () => {
      for (const n of nodes) {
        const dx = pointer.x - n.x;
        const dy = pointer.y - n.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 200 * 200 && d2 > 1) {
          n.vx += (dx / Math.sqrt(d2)) * 0.004;
          n.vy += (dy / Math.sqrt(d2)) * 0.004;
        }
        n.vx *= 0.995;
        n.vy *= 0.995;
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < -20) n.x = width + 20;
        if (n.x > width + 20) n.x = -20;
        if (n.y < -20) n.y = height + 20;
        if (n.y > height + 20) n.y = -20;
      }
      draw();
      if (visible) raf = requestAnimationFrame(step);
    };

    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
    };
    const onLeave = () => { pointer.x = -9999; pointer.y = -9999; };

    resize();

    if (reduceMotion) {
      draw();
    } else {
      raf = requestAnimationFrame(step);
    }

    const io = new IntersectionObserver(([entry]) => {
      const wasVisible = visible;
      visible = entry.isIntersecting && !document.hidden;
      if (visible && !wasVisible && !reduceMotion) raf = requestAnimationFrame(step);
    });
    io.observe(canvas);

    const onVisibility = () => {
      const wasVisible = visible;
      visible = !document.hidden;
      if (visible && !wasVisible && !reduceMotion) raf = requestAnimationFrame(step);
    };

    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} aria-hidden="true" />;
}
