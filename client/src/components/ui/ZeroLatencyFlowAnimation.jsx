import React, { useState, useEffect } from 'react';

const FLOW_STAGES = [
  {
    id: 'prewarm_resume',
    stepLabel: 'Stage 01 • Resume Upload',
    title: 'Resume Uploaded → First 2 Topics Cached Immediately',
    subtitle:
      'As soon as the candidate uploads their PDF resume, NEX AI generates the First Question of Topic 1 and Topic 2 in parallel (using zero prior answer context) and stores both in the Ready Cache Queue.',
    activePaths: ['resume_to_cache'],
    uiShowing: 'Candidate on Resume & Skills Onboarding',
    uiSub: 'Interview has not started yet — pre-caching in background',
    cacheItems: [
      { id: 'T1-Q1', label: 'Topic 1 • 1st Q', state: 'new' },
      { id: 'T2-Q1', label: 'Topic 2 • 1st Q', state: 'new' }
    ],
    workerTrackA: 'Generating Topic 1 (1st Q) & Topic 2 (1st Q) from Resume',
    workerTrackB: 'Idle (Waiting for Turn 1 answer)'
  },
  {
    id: 'prewarm_skills',
    stepLabel: 'Stage 02 • Skills Rated',
    title: 'Skills Selected → Coding MCQs Cached Without Follow-Up Context',
    subtitle:
      'When the candidate rates their skill competencies (1–10), NEX AI generates Coding MCQ #1 and MCQ #2 using distinct code archetypes and pushes them into the Ready Cache Queue.',
    activePaths: ['skills_to_cache'],
    uiShowing: 'Candidate Rating Skills (1–10)',
    uiSub: '4 questions are now ready in cache before Turn 1 begins',
    cacheItems: [
      { id: 'T1-Q1', label: 'Topic 1 • 1st Q', state: 'ready' },
      { id: 'T2-Q1', label: 'Topic 2 • 1st Q', state: 'ready' },
      { id: 'MCQ-1', label: 'Coding MCQ #1', state: 'new' },
      { id: 'MCQ-2', label: 'Coding MCQ #2', state: 'new' }
    ],
    workerTrackA: 'Generating Coding MCQ #1 & MCQ #2 from rated skills',
    workerTrackB: 'No follow-up context used for MCQs'
  },
  {
    id: 'turn_1',
    stepLabel: 'Stage 03 • Turn 01',
    title: 'Turn 01 Served in 0ms → Topic 3 Created in Background',
    subtitle:
      'The UI pops Topic 1 (1st Q) from the cache in 0.0s. While the candidate is typing their answer to Turn 01, the background worker generates Topic 3 (1st Q) from the resume without prior context.',
    activePaths: ['cache_to_ui', 'worker_to_cache'],
    uiShowing: 'Q1: Topic 1 — First Question',
    uiSub: 'Served in 0.0s from Ready Cache Queue',
    cacheItems: [
      { id: 'T2-Q1', label: 'Topic 2 • 1st Q', state: 'ready' },
      { id: 'T3-Q1', label: 'Topic 3 • 1st Q', state: 'new' },
      { id: 'MCQ-1', label: 'Coding MCQ #1', state: 'ready' },
      { id: 'MCQ-2', label: 'Coding MCQ #2', state: 'ready' }
    ],
    workerTrackA: 'Creating Topic 3 • 1st Q (Zero prior context)',
    workerTrackB: 'Waiting for Turn 01 answer submission'
  },
  {
    id: 'turn_2',
    stepLabel: 'Stage 04 • Turn 02 (Dual-Track)',
    title: 'Turn 02 Served in 0ms → Dual-Track Generates Topic 4 + Topic 1 Follow-Up',
    subtitle:
      'Candidate submits Turn 01 answer and immediately sees Topic 2 (1st Q) from cache (0.0s wait). Simultaneously, Dual-Track workers generate Topic 4 (1st Q) AND process Turn 01’s answer into Topic 1 Follow-Up.',
    activePaths: ['cache_to_ui', 'ui_to_worker', 'worker_to_cache'],
    uiShowing: 'Q2: Topic 2 — First Question',
    uiSub: 'Served in 0.0s from Ready Cache Queue',
    cacheItems: [
      { id: 'T3-Q1', label: 'Topic 3 • 1st Q', state: 'ready' },
      { id: 'T1-FU', label: 'Topic 1 • Follow-Up', state: 'new' },
      { id: 'MCQ-1', label: 'Coding MCQ #1', state: 'ready' },
      { id: 'T4-Q1', label: 'Topic 4 • 1st Q', state: 'new' },
      { id: 'MCQ-2', label: 'Coding MCQ #2', state: 'ready' }
    ],
    workerTrackA: 'Creating Topic 4 • 1st Q (Zero prior context)',
    workerTrackB: 'Processing Turn 01 Answer → Topic 1 Follow-Up'
  },
  {
    id: 'turn_3',
    stepLabel: 'Stage 05 • Turn 03',
    title: 'Turn 03 Served in 0ms → Turn 02 Answer Processed Into Follow-Up',
    subtitle:
      'UI pops Topic 3 (1st Q) from cache in 0.0s. In the background, the worker processes Turn 02’s answer (using strictly isolated Topic 2 context) to generate Topic 2 Follow-Up.',
    activePaths: ['cache_to_ui', 'ui_to_worker', 'worker_to_cache'],
    uiShowing: 'Q3: Topic 3 — First Question',
    uiSub: 'Served in 0.0s from Ready Cache Queue',
    cacheItems: [
      { id: 'T1-FU', label: 'Topic 1 • Follow-Up', state: 'ready' },
      { id: 'MCQ-1', label: 'Coding MCQ #1', state: 'ready' },
      { id: 'T2-FU', label: 'Topic 2 • Follow-Up', state: 'new' },
      { id: 'T4-Q1', label: 'Topic 4 • 1st Q', state: 'ready' },
      { id: 'MCQ-2', label: 'Coding MCQ #2', state: 'ready' }
    ],
    workerTrackA: 'All 4 Opening Topic Probes Completed ✓',
    workerTrackB: 'Processing Turn 02 Answer → Topic 2 Follow-Up'
  },
  {
    id: 'turn_4_plus',
    stepLabel: 'Stage 06 • Turn 04–08',
    title: 'Follow-Ups & Coding MCQs Served Instantly From Cache',
    subtitle:
      'Turn 04 serves Topic 1 Follow-Up (already waiting in cache!), Turn 05 serves Coding MCQ #1 (zero follow-up needed), followed by Topic 2 Follow-Up, Topic 4, and Coding MCQ #2 — every turn at 0.0s latency.',
    activePaths: ['cache_to_ui', 'ui_to_worker', 'worker_to_cache'],
    uiShowing: 'Q4: Topic 1 Follow-Up → Q5: Coding MCQ #1 → Q6–Q8',
    uiSub: '100% of remaining turns served in 0.0s from Ready Cache',
    cacheItems: [
      { id: 'MCQ-1', label: 'Coding MCQ #1', state: 'ready' },
      { id: 'T2-FU', label: 'Topic 2 • Follow-Up', state: 'ready' },
      { id: 'T4-Q1', label: 'Topic 4 • 1st Q', state: 'ready' },
      { id: 'MCQ-2', label: 'Coding MCQ #2', state: 'ready' },
      { id: 'T3-FU', label: 'Topic 3 • Follow-Up', state: 'new' }
    ],
    workerTrackA: 'Zero-Wait Rule: UI always pops from Cache immediately',
    workerTrackB: 'Processing remaining answers → Follow-Ups'
  }
];

export default function ZeroLatencyFlowAnimation() {
  const [activeIdx, setActiveIdx] = useState(3); // Default to Turn 02 Dual-Track so all beams are visible immediately
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (!isPlaying) return undefined;
    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % FLOW_STAGES.length);
    }, 4200);
    return () => clearInterval(timer);
  }, [isPlaying]);

  const stage = FLOW_STAGES[activeIdx];
  const isPathActive = (pathKey) => stage.activePaths.includes(pathKey);

  return (
    <div className="w-full rounded-3xl bg-[#000000] border border-white/[0.1] p-5 sm:p-8 shadow-[0_30px_90px_rgba(0,0,0,0.95)] relative overflow-hidden">
      {/* Inline Keyframes for Flowing Glowing SVG Lines */}
      <style>{`
        @keyframes nexFlowDash {
          to {
            stroke-dashoffset: -48;
          }
        }
        .nex-flowing-beam {
          stroke-dasharray: 10 14;
          animation: nexFlowDash 1.1s linear infinite;
        }
        .nex-flowing-beam-fast {
          stroke-dasharray: 12 12;
          animation: nexFlowDash 0.75s linear infinite;
        }
      `}</style>

      {/* Top Controls Bar: Stage Selector Pills + Play/Pause */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-400">
              Live Architecture Simulation • Pure Black Blueprint
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-white mt-1">
            {stage.title}
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            className="px-3 py-1.5 rounded-xl text-xs font-mono font-semibold bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 border border-white/15 transition-all cursor-pointer"
          >
            {isPlaying ? '⏸ Pause Auto-Flow' : '▶ Play Auto-Flow'}
          </button>
        </div>
      </div>

      {/* Clickable Stage Timeline Stepper */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 my-5">
        {FLOW_STAGES.map((s, idx) => {
          const active = idx === activeIdx;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setActiveIdx(idx);
                setIsPlaying(false);
              }}
              className={`px-3 py-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                active
                  ? 'bg-white/[0.1] border-white/40 text-white shadow-[0_0_25px_rgba(255,255,255,0.1)]'
                  : 'bg-[#070709] border-white/[0.07] text-zinc-500 hover:text-zinc-300 hover:border-white/15'
              }`}
            >
              <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 truncate">
                {s.stepLabel}
              </div>
              <div className="text-xs font-bold text-white mt-0.5 truncate">
                {idx === 0 && 'Resume → 2 Topics'}
                {idx === 1 && 'Skills → 2 MCQs'}
                {idx === 2 && 'Turn 1 + Topic 3'}
                {idx === 3 && 'Turn 2 Dual-Track'}
                {idx === 4 && 'Turn 3 + Follow-Up'}
                {idx === 5 && 'Turn 4–8 Zero-Wait'}
              </div>
            </button>
          );
        })}
      </div>

      {/* =================================================================== */}
      {/* INTERACTIVE GLOWING & FLOWING SVG ARCHITECTURE CANVAS (PURE BLACK)  */}
      {/* =================================================================== */}
      <div className="relative w-full rounded-2xl bg-[#000000] border border-white/[0.08] p-3 sm:p-5 overflow-x-auto">
        <div className="min-w-[860px]">
          <svg
            viewBox="0 0 1100 500"
            className="w-full h-auto block select-none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Soft White / Cyan / Emerald Glow Filters */}
              <filter id="glowWhite" x="-25%" y="-25%" width="150%" height="150%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <filter id="glowStrong" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="8" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <linearGradient id="beamWhite" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.25)" />
                <stop offset="50%" stopColor="rgba(255,255,255,1)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.35)" />
              </linearGradient>

              <linearGradient id="beamEmerald" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(52,211,153,0.3)" />
                <stop offset="50%" stopColor="rgba(110,231,183,1)" />
                <stop offset="100%" stopColor="rgba(52,211,153,0.4)" />
              </linearGradient>

              {/* Define Motion Paths for Glowing Travelling Orbs */}
              <path id="pathResumeToCache" d="M 285 130 C 345 130, 345 225, 405 225" />
              <path id="pathSkillsToCache" d="M 285 370 C 345 370, 345 275, 405 275" />
              <path id="pathCacheToUi" d="M 695 215 C 745 215, 745 125, 800 125" />
              <path id="pathUiToWorker" d="M 940 195 L 940 300" />
              <path id="pathWorkerToCache" d="M 800 375 C 735 375, 735 285, 695 285" />
            </defs>

            {/* ============================================================= */}
            {/* BACKGROUND BASE TRACK LINES (DIM)                             */}
            {/* ============================================================= */}
            <use href="#pathResumeToCache" stroke="rgba(255,255,255,0.12)" strokeWidth="2" fill="none" />
            <use href="#pathSkillsToCache" stroke="rgba(255,255,255,0.12)" strokeWidth="2" fill="none" />
            <use href="#pathCacheToUi" stroke="rgba(255,255,255,0.12)" strokeWidth="2.5" fill="none" />
            <use href="#pathUiToWorker" stroke="rgba(255,255,255,0.12)" strokeWidth="2" fill="none" />
            <use href="#pathWorkerToCache" stroke="rgba(255,255,255,0.12)" strokeWidth="2.5" fill="none" />

            {/* ============================================================= */}
            {/* ACTIVE GLOWING FLOWING BEAMS + TRAVELLING LIGHT PARTICLES     */}
            {/* ============================================================= */}

            {/* 1. Resume -> Cache Beam */}
            <use
              href="#pathResumeToCache"
              stroke={isPathActive('resume_to_cache') ? '#ffffff' : 'rgba(255,255,255,0.28)'}
              strokeWidth={isPathActive('resume_to_cache') ? '3.5' : '1.8'}
              fill="none"
              filter={isPathActive('resume_to_cache') ? 'url(#glowWhite)' : undefined}
              className="nex-flowing-beam"
            />
            {isPathActive('resume_to_cache') && (
              <>
                <circle r="5" fill="#ffffff" filter="url(#glowStrong)">
                  <animateMotion dur="1.4s" repeatCount="indefinite">
                    <mpath href="#pathResumeToCache" />
                  </animateMotion>
                </circle>
                <circle r="4" fill="#ffffff" filter="url(#glowStrong)">
                  <animateMotion dur="1.4s" begin="0.7s" repeatCount="indefinite">
                    <mpath href="#pathResumeToCache" />
                  </animateMotion>
                </circle>
              </>
            )}

            {/* 2. Skills -> Cache Beam */}
            <use
              href="#pathSkillsToCache"
              stroke={isPathActive('skills_to_cache') ? '#ffffff' : 'rgba(255,255,255,0.28)'}
              strokeWidth={isPathActive('skills_to_cache') ? '3.5' : '1.8'}
              fill="none"
              filter={isPathActive('skills_to_cache') ? 'url(#glowWhite)' : undefined}
              className="nex-flowing-beam"
            />
            {isPathActive('skills_to_cache') && (
              <>
                <circle r="5" fill="#ffffff" filter="url(#glowStrong)">
                  <animateMotion dur="1.4s" repeatCount="indefinite">
                    <mpath href="#pathSkillsToCache" />
                  </animateMotion>
                </circle>
                <circle r="4" fill="#ffffff" filter="url(#glowStrong)">
                  <animateMotion dur="1.4s" begin="0.7s" repeatCount="indefinite">
                    <mpath href="#pathSkillsToCache" />
                  </animateMotion>
                </circle>
              </>
            )}

            {/* 3. Cache -> Candidate UI (0ms Instant Serve Beam) */}
            <use
              href="#pathCacheToUi"
              stroke={isPathActive('cache_to_ui') ? '#6ee7b7' : 'rgba(255,255,255,0.25)'}
              strokeWidth={isPathActive('cache_to_ui') ? '4' : '1.8'}
              fill="none"
              filter={isPathActive('cache_to_ui') ? 'url(#glowWhite)' : undefined}
              className="nex-flowing-beam-fast"
            />
            {isPathActive('cache_to_ui') && (
              <>
                <circle r="5.5" fill="#6ee7b7" filter="url(#glowStrong)">
                  <animateMotion dur="0.9s" repeatCount="indefinite">
                    <mpath href="#pathCacheToUi" />
                  </animateMotion>
                </circle>
                <circle r="4" fill="#ffffff" filter="url(#glowStrong)">
                  <animateMotion dur="0.9s" begin="0.45s" repeatCount="indefinite">
                    <mpath href="#pathCacheToUi" />
                  </animateMotion>
                </circle>
              </>
            )}

            {/* 4. Candidate UI -> Background Worker (Answer Context Stream) */}
            <use
              href="#pathUiToWorker"
              stroke={isPathActive('ui_to_worker') ? '#ffffff' : 'rgba(255,255,255,0.25)'}
              strokeWidth={isPathActive('ui_to_worker') ? '3.2' : '1.6'}
              fill="none"
              filter={isPathActive('ui_to_worker') ? 'url(#glowWhite)' : undefined}
              className="nex-flowing-beam"
            />
            {isPathActive('ui_to_worker') && (
              <circle r="5" fill="#ffffff" filter="url(#glowStrong)">
                <animateMotion dur="1.1s" repeatCount="indefinite">
                  <mpath href="#pathUiToWorker" />
                </animateMotion>
              </circle>
            )}

            {/* 5. Background Worker -> Ready Cache Queue (New First Q + Follow-Up Return Stream) */}
            <use
              href="#pathWorkerToCache"
              stroke={isPathActive('worker_to_cache') ? '#ffffff' : 'rgba(255,255,255,0.28)'}
              strokeWidth={isPathActive('worker_to_cache') ? '3.5' : '1.8'}
              fill="none"
              filter={isPathActive('worker_to_cache') ? 'url(#glowWhite)' : undefined}
              className="nex-flowing-beam"
            />
            {isPathActive('worker_to_cache') && (
              <>
                <circle r="5" fill="#ffffff" filter="url(#glowStrong)">
                  <animateMotion dur="1.3s" repeatCount="indefinite">
                    <mpath href="#pathWorkerToCache" />
                  </animateMotion>
                </circle>
                <circle r="4" fill="#6ee7b7" filter="url(#glowStrong)">
                  <animateMotion dur="1.3s" begin="0.65s" repeatCount="indefinite">
                    <mpath href="#pathWorkerToCache" />
                  </animateMotion>
                </circle>
              </>
            )}

            {/* ============================================================= */}
            {/* INLINE STREAM LABELS ON CONNECTOR LINES                       */}
            {/* ============================================================= */}
            <g>
              <rect x="302" y="150" width="92" height="22" rx="6" fill="#050507" stroke="rgba(255,255,255,0.18)" />
              <text x="348" y="165" textAnchor="middle" fill="#e4e4e7" fontSize="10" fontFamily="monospace" fontWeight="bold">
                T1 &amp; T2 1st Q
              </text>

              <rect x="302" y="328" width="92" height="22" rx="6" fill="#050507" stroke="rgba(255,255,255,0.18)" />
              <text x="348" y="343" textAnchor="middle" fill="#e4e4e7" fontSize="10" fontFamily="monospace" fontWeight="bold">
                MCQ #1 &amp; #2
              </text>

              <rect x="702" y="140" width="92" height="24" rx="6" fill="#050507" stroke="rgba(110,231,183,0.45)" />
              <text x="748" y="156" textAnchor="middle" fill="#6ee7b7" fontSize="10.5" fontFamily="monospace" fontWeight="bold">
                0.0s Serve →
              </text>

              <rect x="886" y="236" width="108" height="22" rx="6" fill="#050507" stroke="rgba(255,255,255,0.2)" />
              <text x="940" y="251" textAnchor="middle" fill="#d4d4d8" fontSize="10" fontFamily="monospace">
                Answer Context ↓
              </text>

              <rect x="698" y="334" width="98" height="22" rx="6" fill="#050507" stroke="rgba(255,255,255,0.22)" />
              <text x="747" y="349" textAnchor="middle" fill="#ffffff" fontSize="10" fontFamily="monospace" fontWeight="bold">
                ← Push to Cache
              </text>
            </g>

            {/* ============================================================= */}
            {/* NODE 1 (TOP-LEFT): RESUME UPLOAD PREWARM                      */}
            {/* ============================================================= */}
            <g>
              <rect
                x="25"
                y="65"
                width="260"
                height="130"
                rx="16"
                fill="#08080b"
                stroke={isPathActive('resume_to_cache') ? '#ffffff' : 'rgba(255,255,255,0.18)'}
                strokeWidth={isPathActive('resume_to_cache') ? '2' : '1.2'}
              />
              <text x="45" y="95" fill="#a1a1aa" fontSize="10" fontFamily="monospace" fontWeight="bold">
                01 • PRE-ASSESSMENT (RESUME)
              </text>
              <text x="45" y="120" fill="#ffffff" fontSize="15" fontWeight="bold">
                Resume PDF Uploaded
              </text>
              <text x="45" y="144" fill="#d4d4d8" fontSize="11.5">
                • Generates Topic 1 &amp; Topic 2 (1st Q)
              </text>
              <text x="45" y="164" fill="#71717a" fontSize="11">
                • Zero prior context (Resume only)
              </text>
            </g>

            {/* ============================================================= */}
            {/* NODE 2 (BOTTOM-LEFT): SKILL COMPETENCIES PREWARM              */}
            {/* ============================================================= */}
            <g>
              <rect
                x="25"
                y="305"
                width="260"
                height="130"
                rx="16"
                fill="#08080b"
                stroke={isPathActive('skills_to_cache') ? '#ffffff' : 'rgba(255,255,255,0.18)'}
                strokeWidth={isPathActive('skills_to_cache') ? '2' : '1.2'}
              />
              <text x="45" y="335" fill="#a1a1aa" fontSize="10" fontFamily="monospace" fontWeight="bold">
                02 • PRE-ASSESSMENT (SKILLS)
              </text>
              <text x="45" y="360" fill="#ffffff" fontSize="15" fontWeight="bold">
                Skills Rated (1–10)
              </text>
              <text x="45" y="384" fill="#d4d4d8" fontSize="11.5">
                • Generates Coding MCQ #1 &amp; #2
              </text>
              <text x="45" y="404" fill="#71717a" fontSize="11">
                • Distinct archetypes • No follow-ups
              </text>
            </g>

            {/* ============================================================= */}
            {/* NODE 3 (CENTER HUB): READY CACHE QUEUE (readyQueue)           */}
            {/* ============================================================= */}
            <g>
              <rect
                x="405"
                y="115"
                width="290"
                height="270"
                rx="20"
                fill="#09090d"
                stroke="rgba(255,255,255,0.45)"
                strokeWidth="2"
                filter="url(#glowWhite)"
              />
              <text x="550" y="146" textAnchor="middle" fill="#6ee7b7" fontSize="10.5" fontFamily="monospace" fontWeight="bold">
                ● CENTRAL READY CACHE (readyQueue)
              </text>
              <text x="550" y="170" textAnchor="middle" fill="#ffffff" fontSize="16" fontWeight="bold">
                Instant 0ms Question Queue
              </text>
              <text x="550" y="190" textAnchor="middle" fill="#a1a1aa" fontSize="11">
                UI pops from cache immediately without waiting
              </text>

              {/* Dynamic Queue Slots inside Center Hub */}
              {stage.cacheItems.slice(0, 5).map((item, idx) => {
                const slotY = 206 + idx * 32;
                const isNew = item.state === 'new';
                return (
                  <g key={item.id}>
                    <rect
                      x="428"
                      y={slotY}
                      width="244"
                      height="26"
                      rx="7"
                      fill={isNew ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.04)'}
                      stroke={isNew ? '#ffffff' : 'rgba(255,255,255,0.15)'}
                      strokeWidth={isNew ? '1.5' : '1'}
                    />
                    <text
                      x="442"
                      y={slotY + 17}
                      fill="#ffffff"
                      fontSize="11"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {item.label}
                    </text>
                    <text
                      x="658"
                      y={slotY + 17}
                      textAnchor="end"
                      fill={isNew ? '#6ee7b7' : '#a1a1aa'}
                      fontSize="9.5"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {isNew ? '+ NEW' : 'CACHED'}
                    </text>
                  </g>
                );
              })}
            </g>

            {/* ============================================================= */}
            {/* NODE 4 (TOP-RIGHT): CANDIDATE UI (0ms INSTANT SERVE)          */}
            {/* ============================================================= */}
            <g>
              <rect
                x="800"
                y="55"
                width="275"
                height="140"
                rx="16"
                fill="#08080b"
                stroke={isPathActive('cache_to_ui') ? '#6ee7b7' : 'rgba(255,255,255,0.2)'}
                strokeWidth={isPathActive('cache_to_ui') ? '2' : '1.2'}
              />
              <text x="820" y="85" fill="#6ee7b7" fontSize="10" fontFamily="monospace" fontWeight="bold">
                03 • CANDIDATE UI (0.0s WAIT)
              </text>
              <text x="820" y="110" fill="#ffffff" fontSize="14.5" fontWeight="bold">
                {stage.uiShowing.length > 30 ? `${stage.uiShowing.slice(0, 30)}…` : stage.uiShowing}
              </text>
              <text x="820" y="134" fill="#d4d4d8" fontSize="11">
                • Popped from Ready Cache in 0ms
              </text>
              <text x="820" y="154" fill="#71717a" fontSize="11">
                • Candidate answers while AI works below
              </text>
            </g>

            {/* ============================================================= */}
            {/* NODE 5 (BOTTOM-RIGHT): DUAL-TRACK BACKGROUND AI WORKER        */}
            {/* ============================================================= */}
            <g>
              <rect
                x="800"
                y="300"
                width="275"
                height="150"
                rx="16"
                fill="#08080b"
                stroke={isPathActive('worker_to_cache') ? '#ffffff' : 'rgba(255,255,255,0.2)'}
                strokeWidth={isPathActive('worker_to_cache') ? '2' : '1.2'}
              />
              <text x="820" y="328" fill="#a1a1aa" fontSize="10" fontFamily="monospace" fontWeight="bold">
                04 • DUAL-TRACK BACKGROUND AI
              </text>
              <text x="820" y="352" fill="#ffffff" fontSize="14.5" fontWeight="bold">
                Parallel Question Generator
              </text>

              {/* Track A Box */}
              <rect x="816" y="364" width="243" height="32" rx="7" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.14)" />
              <text x="826" y="384" fill="#e4e4e7" fontSize="10.5" fontFamily="monospace">
                Track A: Next Topic 1st Q (No Context)
              </text>

              {/* Track B Box */}
              <rect x="816" y="404" width="243" height="32" rx="7" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.14)" />
              <text x="826" y="424" fill="#e4e4e7" fontSize="10.5" fontFamily="monospace">
                Track B: Prev Topic Follow-Up (Answer)
              </text>
            </g>
          </svg>
        </div>
      </div>

      {/* Bottom Live Status Readout Bar */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-[#070709] border border-white/[0.08]">
          <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
            Foreground Candidate Screen
          </div>
          <div className="text-xs sm:text-sm font-bold text-white mt-1">{stage.uiShowing}</div>
          <div className="text-[11px] text-zinc-400 mt-0.5">{stage.uiSub}</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#070709] border border-white/[0.08]">
          <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-300 font-bold">
            Background Track A (Unseen Topic)
          </div>
          <div className="text-xs sm:text-sm font-bold text-white mt-1">{stage.workerTrackA}</div>
          <div className="text-[11px] text-zinc-400 mt-0.5">Uses strictly Resume + Role Benchmarks</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#070709] border border-white/[0.08]">
          <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-300 font-bold">
            Background Track B (Follow-Up)
          </div>
          <div className="text-xs sm:text-sm font-bold text-white mt-1">{stage.workerTrackB}</div>
          <div className="text-[11px] text-zinc-400 mt-0.5">Uses strictly isolated same-topic answer</div>
        </div>
      </div>
    </div>
  );
}

