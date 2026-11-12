import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Lenis from 'lenis';
import ContourTide from '../components/ui/contour-tide';
import Logo from '../components/brand/Logo';
import { MODE_THEMES, getClientModeTheme } from '../data/modeThemes';
import { ROLES_DATA } from '../data/rolesData';
import ModeIcon from '../components/ui/ModeIcon';
import ZeroLatencyFlowAnimation from '../components/ui/ZeroLatencyFlowAnimation';
import { FiUser, FiSliders, FiCheckCircle } from 'react-icons/fi';
import {
  IconArrowRight,
  IconArrowUpRight,
  IconZap,
  IconBrain,
  IconCode,
  IconSliders,
  IconShield,
  IconCheckCircle,
  IconBriefcase,
  IconClock
} from '../components/ui/Icons';

export default function HomePage({ activeMode = 'retention' }) {
  const currentTheme = getClientModeTheme(activeMode);
  const [selectedDemoMode, setSelectedDemoMode] = useState(activeMode || 'retention');
  const pageRef = useRef(null);

  const demoTheme = getClientModeTheme(selectedDemoMode);

  // Initialize Lenis Smooth Scrolling + Real-Time 60/120fps Parallax Scroll Engine
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return undefined;

    const lenis = new Lenis({
      duration: 1.25,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.5
    });

    const root = pageRef.current;
    const heroLayers = root ? Array.from(root.querySelectorAll('[data-hero-parallax]')) : [];
    const parallaxLayers = root ? Array.from(root.querySelectorAll('[data-parallax]')) : [];

    const updateParallax = () => {
      const scrollY = window.scrollY || window.pageYOffset;
      const vh = window.innerHeight || 1;

      // 1. Hero multi-plane depth parallax
      for (let i = 0; i < heroLayers.length; i++) {
        const el = heroLayers[i];
        const speed = parseFloat(el.getAttribute('data-hero-parallax') || '0');
        const fade = el.getAttribute('data-hero-fade') === 'true';
        const yOffset = scrollY * speed;
        el.style.transform = `translate3d(0, ${yOffset.toFixed(2)}px, 0)`;
        if (fade) {
          const opacity = Math.max(0, Math.min(1, 1 - scrollY / (vh * 0.72)));
          el.style.opacity = opacity.toFixed(3);
        }
      }

      // 2. Section viewport-centered smooth parallax
      for (let i = 0; i < parallaxLayers.length; i++) {
        const el = parallaxLayers[i];
        const speed = parseFloat(el.getAttribute('data-parallax') || '0');
        const rect = el.getBoundingClientRect();
        // Only compute when near or inside viewport
        if (rect.bottom > -200 && rect.top < vh + 200) {
          const centerDist = rect.top + rect.height * 0.5 - vh * 0.5;
          const yOffset = centerDist * speed;
          el.style.transform = `translate3d(0, ${yOffset.toFixed(2)}px, 0)`;
        }
      }
    };

    lenis.on('scroll', updateParallax);

    let rafId = null;
    const raf = (time) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };

    updateParallax();
    rafId = requestAnimationFrame(raf);
    window.addEventListener('resize', updateParallax, { passive: true });

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updateParallax);
      lenis.destroy();
    };
  }, []);

  // Unique NEX AI architectural differentiators
  const uniqueFeatures = [
    {
      tag: '01 / Pre-Assessment Prewarm',
      title: 'Instant Resume & Competency Pre-Caching',
      description:
        'Question generation begins before the interview even starts. Uploading a resume immediately pre-generates the opening questions for the first two topics, while selecting skill competencies pre-generates role-calibrated Coding MCQs into cache.',
      metric: '4 Questions Cached Pre-Turn 1'
    },
    {
      tag: '02 / Dual-Track Pipeline',
      title: 'Zero-Wait Ready-Cache Queue (readyQueue)',
      description:
        'During every turn, NEX AI runs a dual-track background pipeline: creating the next unseen topic’s opening question while simultaneously processing the previous answer into a deep follow-up. If ANY question is in cache, the UI serves it in 0ms.',
      metric: '0.0s Perceived Turn Latency'
    },
    {
      tag: '03 / Context Isolation',
      title: 'Strict Per-Topic Context Isolation',
      description:
        'Opening questions receive zero prior conversation context (preventing cross-topic contamination). Follow-up questions receive strictly the prior Q&A history of that exact same topic—and never reference or follow up on multiple-choice coding snippets.',
      metric: '100% Isolated Topic Threads'
    },
    {
      tag: '04 / Anti-Duplication Engine',
      title: 'Distinct-Archetype Coding Output MCQs',
      description:
        'Each MCQ in a session is locked to a distinct programming archetype (Async/Event Loop, Functional Pipelines & Nullish Coalescing, Lexical Closures, Set/Map Short-Circuiting) with skill rotation and Jaccard token similarity verification.',
      metric: 'Zero Overlapping MCQs'
    },
    {
      tag: '05 / Calibration Matrix',
      title: '1–10 Self-Rating vs. Evidence Verification',
      description:
        'Candidates optionally rate their own skill competencies from 1–10 prior to launch. NEX AI cross-examines self-reported confidence against actual resume project depth and live code execution accuracy.',
      metric: 'Evidence-Backed Calibration'
    },
    {
      tag: '06 / Multi-Mode Intelligence',
      title: '4-Mode Dynamic Re-Architecture & PDF Scorecards',
      description:
        'Switching between Hiring, Assessment, Retention, and Layoff modes in the HR Console dynamically adapts the dark UI theme, topic dispersion order, behavioral guardrails, ThoughtLine reasoning trace, and downloadable PDF evaluation reports.',
      metric: '4 Unified Enterprise Modes'
    }
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-100 selection:bg-brand-500/30 selection:text-brand-200 relative overflow-hidden font-sans">
      {/* ========================================================= */}
      {/* HERO SECTION WITH "CONTOUR TIDE" PARTICLE OCEAN           */}
      {/* ========================================================= */}
      <section className="relative min-h-screen flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Contour Tide: Interactive 3D Ocean of Particles with Smooth Travelling Swells & Click Ripples */}
        <div className="absolute inset-0 z-0">
          <ContourTide
            colors={['#6E6E80', '#FFFFFF']}
            backgroundColor="#0a0a0a"
            density={1}
            particleSize={1}
            waveHeight={1}
            choppiness={0.8}
            wavelength={1}
            windAngle={0}
            horizon={0.1}
            fog={1}
            glow={0.35}
            foam={1}
            speed={1}
            interactive={true}
            parallax={1}
            swell={1}
            swellRadius={0.9}
            clickRipples={true}
            seed={0}
            className="w-full h-full"
          />

          {/* Subtle bottom fade into the rest of the page without obscuring the ocean */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#030305] to-transparent pointer-events-none" />
        </div>

        {/* Minimal Centered Hero Content */}
        <div className="relative z-10 max-w-3xl mx-auto text-center pointer-events-none">
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur-md mb-5 animate-fadeIn">
            <span className="flex h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            <span className="text-[11px] font-medium tracking-wider uppercase text-slate-300">
              NEX AI • Autonomous Talent Intelligence
            </span>
          </div>

          {/* Minimal Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight font-display text-white leading-[1.06] mb-4 drop-shadow-[0_4px_24px_rgba(0,0,0,0.85)]">
            Fluid Intelligence.{' '}
            <span className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Zero Latency.
            </span>
          </h1>

          {/* Minimal Subtitle */}
          <p className="text-sm sm:text-base text-slate-300/85 max-w-xl mx-auto font-normal leading-relaxed mb-7 text-balance drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
            Adaptive AI interviews with dual-track real-time reasoning and live code verification.
          </p>

          {/* Minimal Glass CTAs */}
          <div className="inline-flex flex-wrap items-center justify-center gap-3 pointer-events-auto">
            <Link
              to="/employee"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-xs sm:text-sm bg-white text-slate-950 hover:bg-slate-200 shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-all active:scale-[0.98]"
            >
              <span>Launch Assessment</span>
              <IconArrowRight className="h-4 w-4" />
            </Link>

            <Link
              to="/hr"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-xs sm:text-sm bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/15 backdrop-blur-md transition-all active:scale-[0.98]"
            >
              <FiSliders className="h-3.5 w-3.5 text-slate-300" />
              <span>HR Console</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* ENTERPRISE GATEWAYS (CANDIDATE PORTAL & HR CONSOLE)        */}
      {/* ========================================================= */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 relative z-10 bg-[#0a0a0a] border-t border-white/[0.06]">
        {/* Subtle monochrome ambient spotlight */}
        <div
          data-parallax="0.12"
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[680px] h-[320px] bg-white/[0.025] blur-[120px] rounded-full pointer-events-none will-change-transform"
        />

        <div className="max-w-6xl mx-auto relative">
          <div
            data-parallax="-0.04"
            className="text-center max-w-2xl mx-auto mb-14 will-change-transform"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-zinc-300 text-xs font-mono uppercase tracking-widest mb-3">
              <span>Select Your Gateway</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-display text-white tracking-tight">
              Two Specialized Enterprise Interfaces
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto text-left">
            {/* Candidate / Employee Portal Card */}
            <div
              data-parallax="-0.03"
              className="group relative rounded-2xl bg-gradient-to-b from-white/[0.045] to-white/[0.015] p-7 border border-white/[0.08] hover:border-white/[0.22] transition-colors duration-300 shadow-[0_24px_60px_rgba(0,0,0,0.85)] backdrop-blur-xl flex flex-col justify-between will-change-transform"
            >
              <div className="absolute top-0 right-0 w-36 h-36 bg-white/[0.04] rounded-full blur-2xl group-hover:bg-white/[0.08] transition-all pointer-events-none" />
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/[0.06] text-zinc-200 border border-white/12">
                    <FiUser className="w-3.5 h-3.5 text-white" /> Candidate & Employee Gateway
                  </span>
                  <span className="text-xs font-mono text-zinc-500">Turn-based AI</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-zinc-200 transition-colors">
                  Take Adaptive Assessment
                </h3>
                <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                  Extracts verified project experience from your resume PDF. Engages in 8 adaptive conversational turns interleaved with hands-on code output challenges.
                </p>
                <div className="space-y-2.5 mb-6 text-xs text-zinc-300">
                  <div className="flex items-center gap-2.5">
                    <IconCheckCircle className="h-4 w-4 text-zinc-200 flex-shrink-0" />
                    <span>Instant PDF resume parsing & competency alignment</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <IconCheckCircle className="h-4 w-4 text-zinc-200 flex-shrink-0" />
                    <span>2 interactive terminal coding challenges (MCQ)</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <IconCheckCircle className="h-4 w-4 text-zinc-200 flex-shrink-0" />
                    <span>Zero candidate wait time between questions</span>
                  </div>
                </div>
              </div>

              <div>
                {/* Active Mode Notice */}
                <div className="p-2.5 rounded-xl bg-black/60 border border-white/[0.07] text-[11px] text-zinc-300 mb-4 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ModeIcon mode={activeMode} className="w-3.5 h-3.5 text-zinc-200" />
                    <span>Active: <strong className="text-white">{currentTheme.name}</strong></span>
                  </span>
                  <span className="text-zinc-500 font-mono">Set by HR</span>
                </div>

                <Link
                  to="/employee"
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-bold text-sm bg-white hover:bg-zinc-200 text-black shadow-[0_0_25px_rgba(255,255,255,0.12)] transition-all active:translate-y-px"
                >
                  <span>Launch Assessment Session</span>
                  <IconArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>

            {/* HR Leadership Console Card */}
            <div
              data-parallax="0.03"
              className="group relative rounded-2xl bg-gradient-to-b from-white/[0.045] to-white/[0.015] p-7 border border-white/[0.08] hover:border-white/[0.22] transition-colors duration-300 shadow-[0_24px_60px_rgba(0,0,0,0.85)] backdrop-blur-xl flex flex-col justify-between will-change-transform"
            >
              <div className="absolute top-0 right-0 w-36 h-36 bg-white/[0.04] rounded-full blur-2xl group-hover:bg-white/[0.08] transition-all pointer-events-none" />
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/[0.06] text-zinc-200 border border-white/12">
                    <FiSliders className="w-3.5 h-3.5 text-white" /> Enterprise HR Console
                  </span>
                  <span className="text-xs font-mono text-zinc-500">Admin Control</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-zinc-200 transition-colors">
                  HR Management & Strategy
                </h3>
                <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                  Switch platform-wide evaluation modes, orchestrate question topic dispersion & buffers, bulk-import employee rosters via Excel, and review evidence-backed diagnostic reports.
                </p>
                <div className="space-y-2.5 mb-6 text-xs text-zinc-300">
                  <div className="flex items-center gap-2.5">
                    <IconCheckCircle className="h-4 w-4 text-zinc-200 flex-shrink-0" />
                    <span>One-click mode switcher (Hiring, Appraisal, Retention, Layoff)</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <IconCheckCircle className="h-4 w-4 text-zinc-200 flex-shrink-0" />
                    <span>Pipelined topic dispersion & latency orchestrator</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <IconCheckCircle className="h-4 w-4 text-zinc-200 flex-shrink-0" />
                    <span>Downloadable comprehensive PDF assessment scorecards</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="p-2.5 rounded-xl bg-black/60 border border-white/[0.07] text-[11px] text-zinc-300 mb-4 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <IconSliders className="h-3.5 w-3.5 text-zinc-200" />
                    <span>Topic Pacing: <strong className="text-white">Dual-Track Queue</strong></span>
                  </span>
                  <span className="text-emerald-400 font-mono">Sync Active</span>
                </div>

                <Link
                  to="/hr"
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-bold text-sm bg-white/[0.07] hover:bg-white/[0.14] text-white border border-white/15 hover:border-white/25 transition-all active:translate-y-px"
                >
                  <span>Open HR Management Console</span>
                  <IconArrowUpRight className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* INTERACTIVE LATENCY PIPELINE ARCHITECTURE SHOWCASE        */}
      {/* ========================================================= */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 border-t border-white/[0.06] bg-black relative">
        <div className="max-w-6xl mx-auto relative">
          <div
            data-parallax="-0.04"
            className="text-center max-w-3xl mx-auto mb-10 will-change-transform"
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-zinc-300 text-xs font-mono uppercase tracking-wider mb-3">
              <IconZap className="h-3.5 w-3.5 text-white" />
              <span>Zero-Latency Engine Architecture</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-display text-white tracking-tight mb-4">
              How NEX AI Eliminates Candidate Wait Times
            </h2>
            <p className="text-zinc-400 text-base leading-relaxed">
              Traditional AI interviewers force candidates to stare at a loading spinner for 8–13 seconds after every answer. Watch how NEX AI combines <strong className="text-zinc-200">Resume &amp; Skill Pre-Warming</strong>, a <strong className="text-zinc-200">Ready-Cache Queue (<code className="font-mono text-xs">readyQueue</code>)</strong>, and <strong className="text-zinc-200">Dual-Track Background Generation</strong> to serve every question in <strong className="text-white">0.0s</strong>.
            </p>
          </div>

          {/* Latency Reduction Benchmark Strip */}
          <div
            data-parallax="0.015"
            className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-8 will-change-transform"
          >
            <div className="p-4 rounded-2xl bg-[#070709] border border-white/[0.08]">
              <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">UI Turn Transition</div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white mt-1">0.0s Wait</div>
              <div className="text-xs text-emerald-400 mt-1 font-medium">Instant pop from readyQueue</div>
            </div>
            <div className="p-4 rounded-2xl bg-[#070709] border border-white/[0.08]">
              <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">Pre-Assessment Cache</div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white mt-1">2 Topics + MCQs</div>
              <div className="text-xs text-zinc-400 mt-1">Generated on Resume &amp; Skills steps</div>
            </div>
            <div className="p-4 rounded-2xl bg-[#070709] border border-white/[0.08]">
              <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">Follow-Up Lead Time</div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white mt-1">2+ Full Turns</div>
              <div className="text-xs text-zinc-400 mt-1">Interleaved lookahead buffer</div>
            </div>
            <div className="p-4 rounded-2xl bg-[#070709] border border-white/[0.08]">
              <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">Topic Context Bleed</div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white mt-1">0% Bleed</div>
              <div className="text-xs text-zinc-400 mt-1">Strict per-topic history isolation</div>
            </div>
          </div>

          {/* Pure-Black React Architecture Animation with Glowing & Flowing Lines */}
          <div data-parallax="0.02" className="will-change-transform">
            <ZeroLatencyFlowAnimation />
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* WHAT MAKES NEX AI UNIQUE (6 CORE DIFFERENTIATORS)         */}
      {/* ========================================================= */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 border-t border-white/[0.06] bg-[#0a0a0a] relative">
        <div className="max-w-6xl mx-auto">
          <div
            data-parallax="-0.03"
            className="text-center max-w-3xl mx-auto mb-14 will-change-transform"
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-zinc-300 text-xs font-mono uppercase tracking-wider mb-3">
              <IconBrain className="h-3.5 w-3.5 text-white" />
              <span>Why NEX AI Stands Apart</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-display text-white tracking-tight mb-4">
              Six Architectural Innovations Built Into NEX AI
            </h2>
            <p className="text-zinc-400 text-base leading-relaxed">
              Every layer of NEX AI—from pre-assessment resume caching and topic-isolated follow-ups to anti-duplicate coding challenges—is engineered for zero latency and forensic evaluation accuracy.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {uniqueFeatures.map((feat, idx) => (
              <div
                key={feat.tag}
                data-parallax={idx % 2 === 0 ? '-0.02' : '0.02'}
                className="p-6 rounded-2xl bg-gradient-to-b from-white/[0.045] to-white/[0.015] border border-white/[0.08] hover:border-white/[0.22] transition-all flex flex-col justify-between shadow-[0_18px_45px_rgba(0,0,0,0.8)] will-change-transform"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                      {feat.tag}
                    </span>
                    <span className="w-2 h-2 rounded-full bg-white/60" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2.5 leading-snug">
                    {feat.title}
                  </h3>
                  <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed mb-5">
                    {feat.description}
                  </p>
                </div>

                <div className="pt-3.5 border-t border-white/[0.07] flex items-center justify-between">
                  <span className="text-[11px] font-mono text-zinc-300 bg-white/[0.05] px-2.5 py-1 rounded-md border border-white/10">
                    {feat.metric}
                  </span>
                  <IconCheckCircle className="h-4 w-4 text-zinc-300" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* THE 4 ENTERPRISE ASSESSMENT MODES SHOWCASE                 */}
      {/* ========================================================= */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 border-t border-white/[0.06] bg-[#0a0a0a] relative">
        <div className="max-w-6xl mx-auto">
          <div
            data-parallax="-0.04"
            className="text-center max-w-3xl mx-auto mb-12 will-change-transform"
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-zinc-300 text-xs font-mono uppercase tracking-wider mb-3">
              <IconSliders className="h-3.5 w-3.5 text-white" />
              <span>Unified Platform Capabilities</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-display text-white tracking-tight mb-4">
              One Unified Engine. Four Strategic Modes.
            </h2>
            <p className="text-zinc-400 text-base leading-relaxed">
              HR sets the operational mode globally. The AI immediately reconfigures question topics, tone, role competencies, and analytical scorecards.
            </p>
          </div>

          {/* Mode Selector Tabs */}
          <div
            data-parallax="0.02"
            className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8 will-change-transform"
          >
            {Object.keys(MODE_THEMES).map((key) => {
              const m = MODE_THEMES[key];
              const isSelected = selectedDemoMode === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDemoMode(key)}
                  className={`p-4 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${isSelected
                      ? 'bg-white/[0.08] border-white/30 shadow-[0_0_30px_rgba(255,255,255,0.06)] text-white'
                      : 'bg-white/[0.02] border-white/[0.07] hover:border-white/15 text-zinc-400 hover:text-zinc-200'
                    }`}
                >
                  <div className="p-2.5 rounded-lg bg-white/[0.05] border border-white/10 text-zinc-100 w-fit mb-3">
                    <ModeIcon mode={key} className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-white">{m.name}</div>
                    <div className="text-xs text-zinc-500 mt-0.5 truncate">{m.shortTitle} Evaluation</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected Mode Deep-Dive Card */}
          <div
            data-parallax="0.04"
            className="rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.015] border border-white/[0.08] p-6 sm:p-10 shadow-[0_24px_60px_rgba(0,0,0,0.85)] backdrop-blur-xl will-change-transform"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/[0.08] mb-6">
              <div className="flex items-center gap-3">
                <span className="p-3 rounded-xl bg-white/[0.06] border border-white/12 text-white flex items-center justify-center">
                  <ModeIcon mode={demoTheme.id} className="w-6 h-6" />
                </span>
                <div>
                  <h3 className="text-2xl font-bold text-white">{demoTheme.name}</h3>
                  <p className="text-xs text-zinc-400 font-mono mt-0.5">{demoTheme.tagline}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  to={`/employee?mode=${demoTheme.id}`}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white hover:bg-zinc-200 text-black transition-all shadow-[0_0_20px_rgba(255,255,255,0.12)] flex items-center gap-1.5"
                >
                  <span>Test {demoTheme.shortTitle} Experience</span>
                  <IconArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link
                  to="/hr"
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 border border-white/12 transition-all"
                >
                  Configure in HR
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Description & Objective */}
              <div className="lg:col-span-2 space-y-4">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                    Evaluation Scope & Behavioral Model
                  </h4>
                  <p className="text-zinc-300 text-sm leading-relaxed">
                    {demoTheme.description}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-black/60 border border-white/[0.07] text-xs text-zinc-300">
                  <span className="font-bold text-white block mb-1">Session Notice Banner:</span>
                  <span className="italic text-zinc-400">{demoTheme.notice}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="p-3.5 rounded-xl bg-white/[0.025] border border-white/[0.07]">
                    <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                      Target Audience
                    </span>
                    <span className="text-xs font-semibold text-zinc-200">
                      {demoTheme.id === 'hiring' && 'External Candidates & Applicants'}
                      {demoTheme.id === 'assessment' && 'Active Engineers & Staff for Appraisals'}
                      {demoTheme.id === 'retention' && 'Key Talent & Flight-Risk Cohorts'}
                      {demoTheme.id === 'layoff' && 'Workforce Planning & Redundancy Analysis'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/[0.025] border border-white/[0.07]">
                    <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                      Deliverable Report Sent To
                    </span>
                    <span className="text-xs font-semibold text-zinc-200">
                      {demoTheme.completedDestination}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sample AI Question Card */}
              <div className="p-5 rounded-xl bg-black/70 border border-white/[0.08] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs text-zinc-400 mb-3">
                    <span className="font-mono text-white font-bold">Sample AI Probe</span>
                    <span className="px-2 py-0.5 rounded bg-white/[0.07] text-zinc-300 text-[10px]">Adaptive</span>
                  </div>

                  <p className="text-xs font-medium text-zinc-200 leading-relaxed mb-4">
                    {demoTheme.id === 'hiring' &&
                      '"In your resume, you spearheaded the migration to Kubernetes. Walk me through how you designed resource limits and handled noisy-neighbor problems without degrading p99 latency?"'}
                    {demoTheme.id === 'assessment' &&
                      '"Looking at your past sprint deliverables, what architectural refactors did you propose to prevent technical debt from slowing your team\'s release cadence?"'}
                    {demoTheme.id === 'retention' &&
                      '"How would you assess your current project velocity versus cognitive fatigue over the last quarter? What specific tooling or autonomy would reinvigorate your daily execution?"'}
                    {demoTheme.id === 'layoff' &&
                      '"Which core production services would experience immediate operational failure if your role were decommissioned, and how easily could your peers assume on-call maintenance?"'}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/[0.07] flex items-center justify-between text-[11px] text-zinc-400">
                  <span>Anchored in PDF resume</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                    <FiCheckCircle className="h-3.5 w-3.5" /> Grounded
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* HANDS-ON CODING MCQ CHALLENGE PREVIEW                     */}
      {/* ========================================================= */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 border-t border-white/[0.06] bg-[#0a0a0a] relative">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Copy */}
            <div data-parallax="-0.03" className="will-change-transform">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-zinc-300 text-xs font-mono uppercase tracking-wider mb-3">
                <IconCode className="h-3.5 w-3.5 text-white" />
                <span>Hands-On Verification</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold font-display text-white tracking-tight mb-4">
                Beyond Verbal Answers: Interactive Code Output Challenges
              </h2>
              <p className="text-zinc-400 text-base leading-relaxed mb-6">
                Anyone can rehearse memorized conversational answers. NEX AI interleaves two practical code comprehension challenges directly into the interview flow. Candidates read syntax-highlighted code snippets and deduce the exact runtime output.
              </p>

              <div className="space-y-3.5 text-sm text-zinc-300">
                <div className="flex items-start gap-3">
                  <div className="p-1 rounded-lg bg-white/[0.06] border border-white/12 text-white mt-0.5">
                    <IconCheckCircle className="h-4 w-4" />
                  </div>
                  <div>
                    <strong className="text-white">Role-Specific Languages:</strong> JavaScript, Python, Go, Java, TypeScript, and SQL queries tailored to the candidate's exact applied stack.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-1 rounded-lg bg-white/[0.06] border border-white/12 text-white mt-0.5">
                    <IconCheckCircle className="h-4 w-4" />
                  </div>
                  <div>
                    <strong className="text-white">Edge-Case Logic & Concurrency:</strong> Tests real debugging reflexes (closures, race conditions, mutation bugs, event loop execution order).
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-1 rounded-lg bg-white/[0.06] border border-white/12 text-white mt-0.5">
                    <IconCheckCircle className="h-4 w-4" />
                  </div>
                  <div>
                    <strong className="text-white">Cognitive Processing Buffer:</strong> Seamlessly doubles as an asynchronous buffer allowing the server to synthesize follow-up context with zero candidate wait.
                  </div>
                </div>
              </div>
            </div>

            {/* Right Terminal Mockup */}
            <div
              data-parallax="0.05"
              className="rounded-2xl overflow-hidden border border-white/[0.1] bg-[#060608] shadow-[0_24px_60px_rgba(0,0,0,0.9)] will-change-transform"
            >
              {/* Terminal Window Header */}
              <div className="px-4 py-3 bg-white/[0.03] border-b border-white/[0.08] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-600 inline-block"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-500 inline-block"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-300 inline-block"></span>
                  <span className="text-xs font-mono font-bold text-zinc-400 ml-2">async-queue.js — Node.js runtime</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.06] text-zinc-300 border border-white/10">Coding MCQ</span>
              </div>

              {/* Code Snippet */}
              <pre className="p-5 font-mono text-xs text-zinc-200 leading-relaxed overflow-x-auto select-none">
                <code>{`const queue = [];
queue.push(1);

setTimeout(() => {
  console.log('Timeout:', queue.pop());
}, 0);

Promise.resolve().then(() => {
  queue.push(2);
  console.log('Promise:', queue.shift());
});

console.log('Sync:', queue.length);`}</code>
              </pre>

              {/* Multiple Choice Options Preview */}
              <div className="p-4 bg-white/[0.02] border-t border-white/[0.08] space-y-2">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Select Output:
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2.5 rounded-lg bg-black/70 border border-white/[0.07] text-zinc-400 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-white/[0.06] text-zinc-400 flex items-center justify-center text-[10px] font-bold">A</span>
                    <span>Sync: 1, Timeout: 1, Promise: 2</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/[0.1] border border-white/30 text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center text-[10px] font-bold">B</span>
                    <span>Sync: 1, Promise: 1, Timeout: 2</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-black/70 border border-white/[0.07] text-zinc-400 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-white/[0.06] text-zinc-400 flex items-center justify-center text-[10px] font-bold">C</span>
                    <span>Promise: 1, Sync: 2, Timeout: undefined</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-black/70 border border-white/[0.07] text-zinc-400 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-white/[0.06] text-zinc-400 flex items-center justify-center text-[10px] font-bold">D</span>
                    <span>Sync: 0, Promise: 2, Timeout: 1</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* ROLE COMPETENCY BENCHMARK EXPLORER                        */}
      {/* ========================================================= */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 border-t border-white/[0.06] bg-[#0a0a0a] relative">
        <div className="max-w-6xl mx-auto">
          <div
            data-parallax="-0.04"
            className="text-center max-w-3xl mx-auto mb-12 will-change-transform"
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-zinc-300 text-xs font-mono uppercase tracking-wider mb-3">
              <IconBriefcase className="h-3.5 w-3.5 text-white" />
              <span>Standardized Benchmarks</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-display text-white tracking-tight mb-4">
              Pre-Calibrated Role Competencies
            </h2>
            <p className="text-zinc-400 text-base leading-relaxed">
              NEX AI comes bundled with calibrated skill benchmarks across engineering, data, cloud infrastructure, and product management.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {ROLES_DATA.slice(0, 6).map((cat, idx) => {
              const primaryRole = cat.roles[0];
              const parallaxSpeed = idx % 3 === 0 ? '-0.025' : idx % 3 === 1 ? '0.02' : '-0.015';
              return (
                <div
                  key={cat.category}
                  data-parallax={parallaxSpeed}
                  className="p-5 rounded-2xl bg-gradient-to-b from-white/[0.035] to-white/[0.01] border border-white/[0.07] hover:border-white/[0.2] transition-colors shadow-[0_16px_40px_rgba(0,0,0,0.75)] will-change-transform"
                >
                  <div className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1">
                    {cat.category}
                  </div>
                  <div className="text-lg font-bold text-white mb-2.5">{primaryRole.title}</div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {primaryRole.skills.map((s, i) => (
                      <span
                        key={i}
                        className="text-[11px] bg-black/70 text-zinc-300 px-2.5 py-0.5 rounded border border-white/[0.08]"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                  <div className="text-[11px] text-zinc-500 font-mono">
                    +{cat.roles.length - 1} more specialized roles
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* FINAL CALL TO ACTION                                      */}
      {/* ========================================================= */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 border-t border-white/[0.06] bg-[#0a0a0a] text-center relative overflow-hidden">
        <div
          data-parallax="0.08"
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.04),transparent_65%)] pointer-events-none will-change-transform"
        />

        <div
          data-parallax="-0.03"
          className="max-w-4xl mx-auto relative z-10 will-change-transform"
        >
          <h2 className="text-3xl sm:text-5xl font-extrabold font-display text-white tracking-tight mb-6">
            Ready to Experience the Future of Talent Intelligence?
          </h2>
          <p className="text-zinc-400 text-base sm:text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
            Start a live adaptive interview or manage enterprise modes and candidate cohorts directly from the console.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/employee"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-bold text-sm sm:text-base bg-white hover:bg-zinc-200 text-black shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-all"
            >
              <span>Start Assessment Portal</span>
              <IconArrowRight className="h-5 w-5" />
            </Link>

            <Link
              to="/hr"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-bold text-sm sm:text-base bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/15 backdrop-blur-md transition-all"
            >
              <IconSliders className="h-5 w-5 text-zinc-300" />
              <span>Open HR Console</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* CLEAN ENTERPRISE FOOTER                                    */}
      {/* ========================================================= */}
      <footer className="py-10 px-4 sm:px-6 lg:px-8 border-t border-white/[0.06] bg-[#070709] text-zinc-500 text-xs">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo variant="dark" to="/" className="opacity-90 hover:opacity-100 transition-opacity" />
            <span className="text-zinc-700">—</span>
            <span>Autonomous Adaptive Assessment System</span>
          </div>

          <div className="flex items-center gap-6">
            <Link to="/" className="hover:text-white transition-colors">Home</Link>
            <Link to="/employee" className="hover:text-white transition-colors">Employee Portal</Link>
            <Link to="/hr" className="hover:text-white transition-colors">HR Dashboard</Link>
          </div>

          <div className="font-mono text-[11px] text-zinc-600">
            Engine v2.4 • Gemini Fast Pipeline
          </div>
        </div>
      </footer>
    </div>
  );
}
