import React from 'react';
import { FiBriefcase, FiTrendingUp, FiShield } from 'react-icons/fi';
import { IconScale } from './Icons';

export default function ModeIcon({ mode = 'retention', className = 'w-4 h-4' }) {
  const normalized = String(mode || '').toLowerCase();
  
  switch (normalized) {
    case 'hiring':
      return <FiBriefcase className={className} aria-hidden="true" />;
    case 'assessment':
      return <FiTrendingUp className={className} aria-hidden="true" />;
    case 'layoff':
      return <IconScale className={className} aria-hidden="true" />;
    case 'retention':
    default:
      return <FiShield className={className} aria-hidden="true" />;
  }
}
