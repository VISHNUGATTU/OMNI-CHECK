import React from 'react';
import { Link } from 'react-router-dom';
import nexLogoImg from '../../assets/nex-ai-logo.png';

/**
 * NEX AI brand mark icon (kept for any secondary icon references).
 */
export function LogoMark({ className = 'h-8 w-8' }) {
  return (
    <img
      src={nexLogoImg}
      alt="NEX AI"
      className={`object-contain select-none ${className}`}
      draggable={false}
    />
  );
}

/**
 * NEX AI Official Wordmark Logo (background-removed transparent PNG).
 * variant: 'dark' (white logo for dark surfaces) | 'light' (dark logo for light surfaces)
 */
export default function Logo({ variant = 'dark', to = '/', className = '', subtitle }) {
  const subColor = variant === 'dark' ? 'text-slate-400' : 'text-slate-500';
  const imgFilter =
    variant === 'dark'
      ? 'brightness-100'
      : 'invert brightness-0';

  return (
    <Link
      to={to}
      className={`group inline-flex items-center gap-3 ${className}`}
      aria-label="NEX AI home"
    >
      <img
        src={nexLogoImg}
        alt="NEX AI"
        className={`h-8 sm:h-9 w-auto object-contain select-none transition-transform duration-300 group-hover:scale-[1.02] ${imgFilter}`}
        draggable={false}
      />
      {subtitle && (
        <span
          className={`hidden xl:inline-block pl-3 border-l border-white/10 text-[10px] font-medium uppercase tracking-[0.18em] ${subColor}`}
        >
          {subtitle}
        </span>
      )}
    </Link>
  );
}
