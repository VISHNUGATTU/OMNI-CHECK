import React, { useEffect, useRef, useState } from 'react';

/**
 * Full-screen pitch-black (#000000) opening logo-formation animation video overlay.
 * Plays /nex-intro.mp4 (zero particles, zero confetti, pure pitch-black background)
 * and smoothly fades out into the application once the logo finishes forming.
 */
export default function IntroSplash({ onComplete }) {
  const [fading, setFading] = useState(false);
  const [done, setDone] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.play().catch(() => {
        // Fallback if browser blocks autoplay
        setFading(true);
      });
    }

    // Safety timer so the splash always transitions cleanly after the 3.4s logo formation
    const fadeTimer = setTimeout(() => {
      setFading(true);
    }, 3350);

    return () => clearTimeout(fadeTimer);
  }, []);

  useEffect(() => {
    if (!fading) return;
    const removeTimer = setTimeout(() => {
      setDone(true);
      if (onComplete) onComplete();
    }, 650);
    return () => clearTimeout(removeTimer);
  }, [fading, onComplete]);

  if (done) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] bg-black flex items-center justify-center transition-opacity duration-700 ease-out select-none ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      onClick={() => setFading(true)}
      aria-hidden="true"
    >
      <video
        ref={videoRef}
        src="/nex-intro.mp4"
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={() => setFading(true)}
        onError={() => setFading(true)}
        className="w-[min(86vw,920px)] h-auto object-contain pointer-events-none mix-blend-screen contrast-[1.06] brightness-[0.97]"
      />
    </div>
  );
}

