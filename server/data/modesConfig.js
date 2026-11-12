// Unified Assessment Modes Configuration & Topic Dispersion Engine for NEX AI
const path = require('path');
const fs = require('fs');

const SETTINGS_FILE = path.join(__dirname, 'app_settings.json');

// Comprehensive Pool of Evaluation Topics for HR Customization
const ALL_TOPIC_DEFINITIONS = [
  {
    id: 'technical_skills',
    label: 'Technical Skills & Architecture',
    shortLabel: 'Technical',
    category: 'Technical',
    icon: '💻',
    description: 'Probes candidate / employee depth in role benchmark technologies, system architecture, API design, and core programming paradigms.',
    defaultCounts: { hiring: 2, assessment: 1, retention: 2, layoff: 1 }
  },
  {
    id: 'coding_mcq',
    label: 'Coding Output MCQs',
    shortLabel: 'Coding MCQs',
    category: 'MCQs',
    isMcq: true,
    icon: '⚡',
    description: 'Practical code execution & output evaluation with 4 choices (A, B, C, D) testing scoping, mutability & logic.',
    defaultCounts: { hiring: 2, assessment: 2, retention: 2, layoff: 2 }
  },
  {
    id: 'behavioral',
    label: 'Behavioral & Situational Judgment',
    shortLabel: 'Behavioral',
    category: 'Behavioral',
    icon: '🧠',
    description: 'Evaluates conflict resolution, high-pressure trade-offs, ownership, crisis response, and professional accountability.',
    defaultCounts: { hiring: 1, assessment: 1, retention: 1, layoff: 1 }
  },
  {
    id: 'burnout',
    label: 'Burnout & Workload Stress',
    shortLabel: 'Burnout',
    category: 'Well-being',
    icon: '🔥',
    description: 'Assesses workload pacing, cognitive exhaustion markers, on-call fatigue, and sustainable engineering health.',
    defaultCounts: { hiring: 0, assessment: 0, retention: 2, layoff: 0 }
  },
  {
    id: 'collaboration',
    label: 'Team Collaboration & Communication',
    shortLabel: 'Collaboration',
    category: 'Collaboration',
    icon: '🤝',
    description: 'Probes PR/code review etiquette, cross-functional partner alignment, constructive dissent, and team knowledge sharing.',
    defaultCounts: { hiring: 1, assessment: 1, retention: 1, layoff: 1 }
  },
  {
    id: 'resume_verification',
    label: 'Resume & Project Verification',
    shortLabel: 'Resume Verify',
    category: 'Resume',
    icon: '📄',
    description: 'Deep-dives into specific project deliverables, metrics, and technologies claimed on candidate credentials.',
    defaultCounts: { hiring: 1, assessment: 0, retention: 0, layoff: 0 }
  },
  {
    id: 'problem_solving',
    label: 'Problem Solving & Edge Cases',
    shortLabel: 'Problem Solving',
    category: 'Technical',
    icon: '🧩',
    description: 'Challenges respondent on production outage root-causes, incident triage, and architectural compromise decisions.',
    defaultCounts: { hiring: 1, assessment: 1, retention: 0, layoff: 1 }
  },
  {
    id: 'work_skills',
    label: 'Day-to-Day Execution & Quality',
    shortLabel: 'Work Skills',
    category: 'Execution',
    icon: '🛠️',
    description: 'Evaluates sprint delivery velocity, unit/integration test coverage, documentation, and maintainability standards.',
    defaultCounts: { hiring: 0, assessment: 2, retention: 0, layoff: 1 }
  },
  {
    id: 'core_criticality',
    label: 'Role Criticality & Business Impact',
    shortLabel: 'Criticality',
    category: 'Criticality',
    icon: '🎯',
    description: 'Evaluates system indispensability, operational autonomy, and bottom-line revenue or cost-efficiency outcomes.',
    defaultCounts: { hiring: 0, assessment: 0, retention: 0, layoff: 2 }
  },
  {
    id: 'attrition',
    label: 'Attrition Risk & Stay Factors',
    shortLabel: 'Attrition Risk',
    category: 'Retention',
    icon: '🚪',
    description: 'Analyzes flight risk signals, motivation alignment, compensation sentiment, and long-term retention triggers.',
    defaultCounts: { hiring: 0, assessment: 0, retention: 1, layoff: 0 }
  },
  {
    id: 'adaptability',
    label: 'Adaptability & Multi-Stack Versatility',
    shortLabel: 'Adaptability',
    category: 'Versatility',
    icon: '🔄',
    description: 'Tests ability to pivot swiftly across new tech stacks, changing product roadmaps, and ambiguous specifications.',
    defaultCounts: { hiring: 0, assessment: 0, retention: 0, layoff: 1 }
  }
];

// Pipelined Lookahead Topic Dispersion Engine:
// Orders the question sequence to match the asynchronous background generation flow for zero latency:
// - Turn 1 & Turn 2: First Questions of Topic 1 & Topic 2 (pre-generated immediately on Resume Upload).
//   Multi-question topics are scheduled first so their follow-ups have maximum lead time.
// - Turn 3: First Question of Topic 3 (generated in background during Turn 1 without prior context).
// - Turn 4: Follow-Up of Topic 1 (generated during Turn 2 & Turn 3 from Turn 1's answer).
// - Turn 5+: Interleaves Coding MCQs (pre-generated on Skill Competencies selection without follow-up context),
//   Follow-Up of Topic 2 (generated during Turn 3+), and remaining First Questions (Topic 4, Topic 5...).
function disperseTopics(topicCounts) {
  const cleanCounts = {};
  for (const [key, val] of Object.entries(topicCounts || {})) {
    let count = 0;
    if (typeof val === 'number') {
      count = Math.max(0, parseInt(val, 10) || 0);
    } else if (val && typeof val === 'object' && val.enabled !== false) {
      count = Math.max(0, parseInt(val.count, 10) || 0);
    }
    if (count > 0) {
      cleanCounts[key] = count;
    }
  }

  const total = Object.values(cleanCounts).reduce((a, b) => a + b, 0);
  if (total === 0) {
    return ['technical_skills', 'behavioral', 'collaboration', 'coding_mcq_1', 'coding_mcq_2'];
  }

  const remaining = { ...cleanCounts };
  const initialTotal = { ...cleanCounts };
  const seenCount = {};
  const lastPlacedStep = {};
  const topicOrderIndex = {};

  Object.keys(remaining).forEach((k, idx) => {
    seenCount[k] = 0;
    lastPlacedStep[k] = -999;
    topicOrderIndex[k] = idx;
  });

  const totalMcqs = cleanCounts.coding_mcq || 0;
  // Target steps for MCQs so they are spaced evenly starting at Step 4 (Turn 5)
  const mcqTargetSteps = [];
  if (totalMcqs > 0) {
    for (let m = 1; m <= totalMcqs; m++) {
      const targetStep = Math.min(
        total - 1,
        Math.max(4 + (m - 1) * 3, Math.round(((total - 1) * (m + 0.45)) / (totalMcqs + 1)))
      );
      mcqTargetSteps.push(targetStep);
    }
  }

  const sequence = [];
  let mcqCounter = 1;

  for (let step = 0; step < total; step++) {
    const lastTopic = sequence.length > 0 ? sequence[sequence.length - 1].rawTopic : null;
    let candidates = Object.keys(remaining).filter((k) => remaining[k] > 0);

    // Rule 1: Never two consecutive questions on the exact same topic (including never two coding_mcq in a row)
    if (candidates.length > 1 && lastTopic) {
      const nonRepeating = candidates.filter((k) => k !== lastTopic);
      if (nonRepeating.length > 0) {
        candidates = nonRepeating;
      }
    }

    // Rule 2: Turns 1, 2, 3 (steps 0, 1, 2) must be First Questions of distinct conversational topics
    // (Topic 1 & Topic 2 are prewarmed on resume upload; Topic 3 is generated during Turn 1)
    if (step < 3) {
      const unstartedConv = candidates.filter((k) => k !== 'coding_mcq' && seenCount[k] === 0);
      if (unstartedConv.length > 0) {
        candidates = unstartedConv;
      } else if (candidates.some((k) => k !== 'coding_mcq')) {
        candidates = candidates.filter((k) => k !== 'coding_mcq');
      }
    }

    // Rule 3: Buffer Distance Constraint for Follow-ups & MCQ spacing:
    // - A follow-up question (seenCount > 0) needs at least 2 intervening turns (step - lastPlacedStep >= 3,
    //   or >= 2 if no other buffered candidates exist) so the answer is processed in background without wait.
    // - Coding MCQs are spaced at least 2 turns apart (step - lastPlacedStep['coding_mcq'] >= 3).
    const strongBuffered = candidates.filter((k) => {
      if (k === 'coding_mcq') {
        if (step < 3) return false;
        return (step - lastPlacedStep.coding_mcq) >= 3;
      }
      if (seenCount[k] === 0) return true; // First question of a topic
      return (step - lastPlacedStep[k]) >= 3; // At least 2 intervening questions after previous question on same topic
    });

    const minBuffered = candidates.filter((k) => {
      if (k === 'coding_mcq') return (step - lastPlacedStep.coding_mcq) >= 2;
      if (seenCount[k] === 0) return true;
      return (step - lastPlacedStep[k]) >= 2;
    });

    const activeCandidates =
      strongBuffered.length > 0
        ? strongBuffered
        : minBuffered.length > 0
          ? minBuffered
          : candidates;

    activeCandidates.sort((a, b) => {
      // Priority A (Steps 0, 1, 2): Pick unstarted conversational topics with highest total count first
      // so topics that require follow-ups start in Turn 1 & Turn 2.
      if (step < 3) {
        const aUnstarted = seenCount[a] === 0 && a !== 'coding_mcq' ? 1 : 0;
        const bUnstarted = seenCount[b] === 0 && b !== 'coding_mcq' ? 1 : 0;
        if (bUnstarted !== aUnstarted) return bUnstarted - aUnstarted;

        const totalDiff = (initialTotal[b] || 0) - (initialTotal[a] || 0);
        if (totalDiff !== 0) return totalDiff;

        return (topicOrderIndex[a] || 0) - (topicOrderIndex[b] || 0);
      }

      // Priority B: Any unstarted conversational topic that still has >= 2 questions remaining
      // must start now so its follow-up has enough buffer turns before the assessment ends.
      const aMultiUnstarted = seenCount[a] === 0 && a !== 'coding_mcq' && remaining[a] >= 2 ? 1 : 0;
      const bMultiUnstarted = seenCount[b] === 0 && b !== 'coding_mcq' && remaining[b] >= 2 ? 1 : 0;
      if (bMultiUnstarted !== aMultiUnstarted) return bMultiUnstarted - aMultiUnstarted;

      // Priority C (Scheduled MCQ slot): Once step reaches the target step for the next MCQ (step >= 4),
      // interleave the pre-generated MCQ as a zero-context buffer turn
      const nextMcqTarget = mcqTargetSteps[seenCount.coding_mcq || 0] ?? 999;
      const aIsScheduledMcq = a === 'coding_mcq' && step >= nextMcqTarget ? 1 : 0;
      const bIsScheduledMcq = b === 'coding_mcq' && step >= nextMcqTarget ? 1 : 0;
      if (bIsScheduledMcq !== aIsScheduledMcq) return bIsScheduledMcq - aIsScheduledMcq;

      // Priority D: Ready Follow-Up that has completed its >= 3 step buffer (2+ intervening questions)
      const aReadyFollowup = seenCount[a] > 0 && a !== 'coding_mcq' && (step - lastPlacedStep[a]) >= 3 ? 1 : 0;
      const bReadyFollowup = seenCount[b] > 0 && b !== 'coding_mcq' && (step - lastPlacedStep[b]) >= 3 ? 1 : 0;
      if (bReadyFollowup !== aReadyFollowup) return bReadyFollowup - aReadyFollowup;

      // Priority E: Avoid placing coding_mcq unscheduled unless it's needed to maintain spacing before the end
      if (a === 'coding_mcq' || b === 'coding_mcq') {
        const urgentMcq = remaining.coding_mcq >= Math.ceil((total - step) / 2);
        if (!urgentMcq) {
          if (a === 'coding_mcq') return 1;
          if (b === 'coding_mcq') return -1;
        }
      }

      // Priority F: Unstarted conversational topic (First Question already generated in background)
      const aFirstQ = seenCount[a] === 0 && a !== 'coding_mcq' ? 1 : 0;
      const bFirstQ = seenCount[b] === 0 && b !== 'coding_mcq' ? 1 : 0;
      if (bFirstQ !== aFirstQ) return bFirstQ - aFirstQ;

      // Priority G: Higher remaining count, then longest distance since last placed, then original topic order
      const remDiff = remaining[b] - remaining[a];
      if (remDiff !== 0) return remDiff;

      const distA = step - lastPlacedStep[a];
      const distB = step - lastPlacedStep[b];
      if (distB !== distA) return distB - distA;

      return (topicOrderIndex[a] || 0) - (topicOrderIndex[b] || 0);
    });

    const chosen = activeCandidates[0];
    remaining[chosen]--;
    seenCount[chosen]++;
    lastPlacedStep[chosen] = step;

    let finalTopicName = chosen;
    if (chosen === 'coding_mcq') {
      finalTopicName = `coding_mcq_${mcqCounter++}`;
    }

    sequence.push({ topic: finalTopicName, rawTopic: chosen, instance: seenCount[chosen] });
  }

  return sequence.map((s) => s.topic);
}

// Generate default topic configuration object for a specific mode
function getDefaultTopicsConfig(modeKey) {
  const normKey = (modeKey || 'retention').toLowerCase().trim();
  const config = {};
  ALL_TOPIC_DEFINITIONS.forEach(def => {
    const defaultCount = def.defaultCounts[normKey] || 0;
    config[def.id] = {
      enabled: defaultCount > 0,
      count: defaultCount > 0 ? defaultCount : 1
    };
  });
  return config;
}

// Helper to read saved custom mode configs from app_settings.json
function getSavedModeConfigs() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
      return data.modeConfigs || {};
    }
  } catch (err) {
    console.warn('Error reading modeConfigs from app_settings.json:', err.message);
  }
  return {};
}

// Helper to get active topic configuration for a mode
function getModeTopicsConfig(modeKey) {
  const normKey = (modeKey || 'retention').toLowerCase().trim();
  const saved = getSavedModeConfigs();
  const userConfig = saved[normKey]?.topicsConfig;

  const topicsConfig = userConfig || getDefaultTopicsConfig(normKey);
  const dispersedTopics = disperseTopics(topicsConfig);

  const totalQuestions = dispersedTopics.length;
  const mcqCount = dispersedTopics.filter(t => t.includes('coding_mcq')).length;
  const conversationalCount = totalQuestions - mcqCount;

  return {
    topicsConfig,
    dispersedTopics,
    totalQuestions,
    mcqCount,
    conversationalCount
  };
}

// Save custom topic configuration for a mode
function saveModeTopicsConfig(modeKey, topicsConfig) {
  const normKey = (modeKey || 'retention').toLowerCase().trim();
  try {
    let settings = {};
    if (fs.existsSync(SETTINGS_FILE)) {
      settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    }
    if (!settings.modeConfigs) settings.modeConfigs = {};
    
    settings.modeConfigs[normKey] = {
      topicsConfig,
      updatedAt: new Date().toISOString()
    };
    settings.updatedAt = new Date().toISOString();

    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving mode topics config to app_settings.json:', err);
    throw err;
  }

  return getModeTopicsConfig(normKey);
}

// Reset topic configuration for a mode to default
function resetModeTopicsConfig(modeKey) {
  const normKey = (modeKey || 'retention').toLowerCase().trim();
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
      if (settings.modeConfigs && settings.modeConfigs[normKey]) {
        delete settings.modeConfigs[normKey];
        settings.updatedAt = new Date().toISOString();
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
      }
    }
  } catch (err) {
    console.warn('Error resetting mode topics config:', err.message);
  }
  return getModeTopicsConfig(normKey);
}

const MODES = {
  hiring: {
    id: 'hiring',
    name: 'Hiring Mode',
    shortTitle: 'Hiring',
    icon: '💼',
    badge: '💼 Candidate Hiring',
    tagline: 'Candidate Evaluation — Focus on Resume, Technical Competencies, Coding MCQs & Collaboration',
    description: 'Tailored for interviewing job candidates. Evaluates verified resume projects, depth in core technical benchmarks, practical coding output MCQs, real-world problem-solving, and collaborative execution. Excludes attrition and burnout questions.',
    sections: [
      'Executive Summary',
      'Technical Skills & Coding MCQs',
      'Resume Verification & Authenticity',
      'Problem Solving Depth',
      'Collaboration & Culture Synergy',
      'Hiring Recommendation'
    ],
    themeColor: '#059669', // Emerald
    headerTitle: 'NEX AI — CANDIDATE HIRING EVALUATION REPORT',
    headerSubtitle: 'Confidential Pre-Employment Competency & Technical Assessment'
  },
  assessment: {
    id: 'assessment',
    name: 'Assessment Mode',
    shortTitle: 'Assessment',
    icon: '📈',
    badge: '📈 Work Skills Appraisal',
    tagline: 'Work Skills & Performance — Focus on Day-to-Day Execution, Coding Output MCQs & Growth',
    description: 'Tailored for existing employee periodic evaluations. Focuses on day-to-day role execution, hands-on coding output MCQs, delivery velocity, quality standards, cross-team coordination, and structured upskilling roadmap. Excludes attrition questions.',
    sections: [
      'Performance Summary',
      'Core Work Competencies & Coding MCQs',
      'Execution Quality & Efficiency',
      'Project Ownership & Impact',
      'Collaboration Synergy',
      'Upskilling Roadmap'
    ],
    themeColor: '#2563eb', // Royal Blue
    headerTitle: 'NEX AI — EMPLOYEE WORK SKILLS & PERFORMANCE REPORT',
    headerSubtitle: 'Confidential Internal Competency & Execution Appraisal'
  },
  retention: {
    id: 'retention',
    name: 'Retention Mode',
    shortTitle: 'Retention',
    icon: '🛡️',
    badge: '🛡️ Retention & Well-being',
    tagline: 'Talent Retention — Focus on Coding Mastery, Flight Risk, Burnout Index & Stay Factors',
    description: 'The comprehensive talent retention evaluation. Assesses technical skills, practical coding output MCQs, workload stress, burnout index, company alignment, attrition flight-risk signals, and strategic retention recommendations.',
    sections: [
      'Executive Talent Summary',
      'Technical Skills & Coding MCQs',
      'Engagement & Motivation',
      'Attrition Risk & Stay Factors',
      'Collaboration Dynamics',
      'Workload Burnout Index'
    ],
    themeColor: '#7c3aed', // Violet
    headerTitle: 'NEX AI — TALENT RETENTION & ATTRITION REPORT',
    headerSubtitle: 'Confidential HR Competency, Risk & Engagement Assessment'
  },
  layoff: {
    id: 'layoff',
    name: 'Layoff Mode',
    shortTitle: 'Layoff',
    icon: '⚖️',
    badge: '⚖️ Workforce Impact',
    tagline: 'Workforce Restructuring — Focus on Role Criticality, Coding Proficiency & Versatility',
    description: 'Objective, evidence-based workforce alignment assessment. Measures core project criticality, objective coding output MCQs, direct business value delivered, cross-functional versatility and adaptability, operational independence, and redundancy risk.',
    sections: [
      'Workforce Assessment Summary',
      'Role Criticality & Technical MCQs',
      'Business Value & Output Impact',
      'Versatility & Adaptability',
      'Redundancy Risk Analysis',
      'Retention Priority Guidance'
    ],
    themeColor: '#dc2626', // Crimson / Slate
    headerTitle: 'NEX AI — WORKFORCE RESTRUCTURING & IMPACT EVALUATION REPORT',
    headerSubtitle: 'Confidential Workforce Alignment & Business Impact Review'
  }
};

const DEFAULT_MODE = 'retention';

function getModeConfig(modeKey) {
  const normalized = modeKey ? String(modeKey).toLowerCase().trim() : DEFAULT_MODE;
  const baseConfig = MODES[normalized] || MODES[DEFAULT_MODE];
  
  // Resolve dynamic dispersed topics from custom or default settings
  const topicsInfo = getModeTopicsConfig(baseConfig.id);
  
  return {
    ...baseConfig,
    topics: topicsInfo.dispersedTopics,
    topicsConfig: topicsInfo.topicsConfig,
    totalQuestions: topicsInfo.totalQuestions,
    mcqCount: topicsInfo.mcqCount,
    conversationalCount: topicsInfo.conversationalCount
  };
}

module.exports = {
  MODES,
  DEFAULT_MODE,
  ALL_TOPIC_DEFINITIONS,
  disperseTopics,
  getDefaultTopicsConfig,
  getModeTopicsConfig,
  saveModeTopicsConfig,
  resetModeTopicsConfig,
  getModeConfig
};
