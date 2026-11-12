import React from 'react';
import {
  FiCode,
  FiZap,
  FiCpu,
  FiActivity,
  FiUsers,
  FiFileText,
  FiTrendingUp,
  FiShield,
  FiLogOut,
  FiLayers,
  FiTag
} from 'react-icons/fi';

export default function TopicIcon({ topicId = '', className = 'w-4 h-4' }) {
  const normalized = String(topicId || '').toLowerCase();

  if (normalized.includes('coding_mcq')) {
    return <FiZap className={className} aria-hidden="true" />;
  }

  switch (normalized) {
    case 'technical_skills':
    case 'problem_solving':
      return <FiCode className={className} aria-hidden="true" />;
    case 'behavioral':
      return <FiCpu className={className} aria-hidden="true" />;
    case 'burnout':
      return <FiActivity className={className} aria-hidden="true" />;
    case 'collaboration':
      return <FiUsers className={className} aria-hidden="true" />;
    case 'resume_verification':
      return <FiFileText className={className} aria-hidden="true" />;
    case 'work_skills':
      return <FiTrendingUp className={className} aria-hidden="true" />;
    case 'core_criticality':
      return <FiShield className={className} aria-hidden="true" />;
    case 'attrition':
      return <FiLogOut className={className} aria-hidden="true" />;
    case 'versatility':
      return <FiLayers className={className} aria-hidden="true" />;
    default:
      return <FiTag className={className} aria-hidden="true" />;
  }
}
