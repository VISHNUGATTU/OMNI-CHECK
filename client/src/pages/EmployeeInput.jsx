import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { ROLES_DATA, getSkillsForRole } from '../data/rolesData';
import { getClientModeTheme } from '../data/modeThemes';
import ModeIcon from '../components/ui/ModeIcon';
import ThoughtLine from './ThoughtLine';
import {
  FiTarget,
  FiCheckCircle,
  FiArrowRight,
  FiArrowLeft,
  FiUploadCloud,
  FiUser,
  FiFileText,
  FiSliders,
  FiCpu,
  FiCode,
  FiShield,
  FiZap
} from 'react-icons/fi';

const STEPS_META = [
  { id: 'hero', number: '01', label: 'Overview' },
  { id: 'basic-info', number: '02', label: 'Basic Info & Role' },
  { id: 'resume', number: '03', label: 'Resume Upload' },
  { id: 'skills', number: '04', label: 'Skills Rating (1–10)' },
  { id: 'launch', number: '05', label: 'Start Assessment' }
];

function getSkillTierLabel(score) {
  if (!score) return 'Not rated (Optional)';
  if (score <= 3) return 'Foundational';
  if (score <= 6) return 'Intermediate';
  if (score <= 8) return 'Advanced';
  return 'Expert Mastery';
}

export default function EmployeeInput({ activeMode = 'retention', onStartAssessment }) {
  // Multi-page wizard step: 'hero' | 'basic-info' | 'resume' | 'skills' | 'launch'
  const [currentPage, setCurrentPage] = useState('hero');

  // Unique prewarm key for server + client cache synchronization
  const [prewarmKey] = useState(
    () => `pw_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  );

  // Page 2: Basic Info & Role
  const [employeeId, setEmployeeId] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [roleSkills, setRoleSkills] = useState([]);

  // Page 3: Resume Upload & Parsing
  const [resumeFileName, setResumeFileName] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [isParsing, setIsParsing] = useState(false);

  // Page 4: Skills & Competencies 1–10 Self-Rating (Non-Mandatory)
  const [skillRatings, setSkillRatings] = useState({});

  // Background Cache Status & Cached Payloads
  const [mcqCacheStatus, setMcqCacheStatus] = useState('idle'); // 'idle' | 'caching' | 'cached'
  const [cachedMcqs, setCachedMcqs] = useState({});
  const [questionCacheStatus, setQuestionCacheStatus] = useState('idle'); // 'idle' | 'caching' | 'cached'
  const [cachedQuestions, setCachedQuestions] = useState({});

  // Page 5: Pre-Assessment ThoughtLine & Session Initialization
  const [isStreaming, setIsStreaming] = useState(true);
  const [isStarting, setIsStarting] = useState(false);

  // Searchable Dropdown state
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const resumeDebounceRef = useRef(null);

  const theme = getClientModeTheme(activeMode);
  const dark = theme.dark || {};

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Trigger ThoughtLine reasoning animation when entering the 'launch' page
  useEffect(() => {
    if (currentPage !== 'launch') return undefined;
    const startTimer = setTimeout(() => {
      setIsStreaming(true);
    }, 10);
    const settleTimer = setTimeout(() => {
      setIsStreaming(false);
    }, 2200);
    return () => {
      clearTimeout(startTimer);
      clearTimeout(settleTimer);
    };
  }, [currentPage]);

  // Immediately pre-generate and cache Coding MCQs when employee selects their role or skill competencies (NO follow-up context)
  const triggerMcqPrewarm = async (selectedRole, skillsList, ratingsMap = skillRatings) => {
    if (!selectedRole || selectedRole.trim().length < 2) return;
    setMcqCacheStatus('caching');
    try {
      const res = await axios.post('http://localhost:5000/api/employee/prewarm-mcqs', {
        prewarmKey,
        role: selectedRole,
        roleSkills: skillsList,
        skillRatings: ratingsMap,
        mode: activeMode
      });
      if (res.data?.mcqs) {
        setCachedMcqs(res.data.mcqs);
      }
      setMcqCacheStatus('cached');
    } catch (err) {
      console.warn('Background MCQ prewarm notice:', err.message);
      setMcqCacheStatus('idle');
    }
  };

  // Immediately pre-generate and cache Resume-Anchored Questions when resume is uploaded/updated
  const triggerResumeQuestionsPrewarm = async (extractedResume, currentRole, skillsList) => {
    if (!extractedResume || extractedResume.trim().length < 10) return;
    setQuestionCacheStatus('caching');
    try {
      const res = await axios.post('http://localhost:5000/api/employee/prewarm-questions', {
        prewarmKey,
        employeeId: employeeId || 'CANDIDATE',
        name: name || 'Candidate',
        role: currentRole || role || 'Software Engineer',
        roleSkills: skillsList || roleSkills,
        resumeText: extractedResume,
        mode: activeMode
      });
      if (res.data?.questions) {
        setCachedQuestions(res.data.questions);
        try {
          sessionStorage.setItem(
            `nex_q_cache_${prewarmKey}`,
            JSON.stringify(res.data.questions)
          );
        } catch {
          // Ignore storage quota errors
        }
      }
      setQuestionCacheStatus('cached');
    } catch (err) {
      console.warn('Background resume question prewarm notice:', err.message);
      setQuestionCacheStatus('idle');
    }
  };

  // Filter roles based on user typing
  const filteredCategories = ROLES_DATA.map((cat) => {
    const matchingRoles = cat.roles.filter(
      (r) =>
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.skills.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    return { ...cat, roles: matchingRoles };
  }).filter((cat) => cat.roles.length > 0);

  const handleSelectRole = (selectedRoleTitle) => {
    setRole(selectedRoleTitle);
    setSearchQuery(selectedRoleTitle);
    const skills = getSkillsForRole(selectedRoleTitle);
    setRoleSkills(skills);
    setIsDropdownOpen(false);
    // Immediately start generating & caching MCQs for the selected role
    triggerMcqPrewarm(selectedRoleTitle, skills);
  };

  // Handle PDF Upload and instant local text extraction + immediate question generation
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Please upload a valid PDF file.');
      return;
    }

    setResumeFileName(file.name);
    setIsParsing(true);
    setResumeText('');

    const formData = new FormData();
    formData.append('resume', file);

    try {
      const res = await axios.post('http://localhost:5000/api/employee/parse-resume', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const extracted = res.data.extractedText || '';
      setResumeText(extracted);
      // Immediately start generating & caching resume-anchored questions
      triggerResumeQuestionsPrewarm(extracted, role, roleSkills);
    } catch (err) {
      console.error(err);
      alert('Failed to parse resume text.');
    } finally {
      setIsParsing(false);
    }
  };

  // Also trigger question prewarm if user manually edits/updates resume text
  const handleManualResumeUpdate = (updatedText) => {
    setResumeText(updatedText);
    if (resumeDebounceRef.current) clearTimeout(resumeDebounceRef.current);
    if (updatedText && updatedText.trim().length > 25) {
      resumeDebounceRef.current = setTimeout(() => {
        triggerResumeQuestionsPrewarm(updatedText, role, roleSkills);
      }, 700);
    }
  };

  const handleRateSkill = (skillName, score) => {
    setSkillRatings((prev) => {
      let nextRatings;
      if (prev[skillName] === score) {
        const copy = { ...prev };
        delete copy[skillName];
        nextRatings = copy;
      } else {
        nextRatings = { ...prev, [skillName]: score };
      }
      // Generate MCQs when user selects skill competencies (without follow-up context) and store in cache
      triggerMcqPrewarm(role, roleSkills, nextRatings);
      return nextRatings;
    });
  };

  // Submit profile details & initiate assessment with mode + cached questions/MCQs
  const handleStartAssessment = async (e) => {
    if (e) e.preventDefault();

    const currentSkills = roleSkills.length > 0 ? roleSkills : getSkillsForRole(role);

    setIsStarting(true);
    setIsStreaming(true);
    try {
      const res = await axios.post('http://localhost:5000/api/employee/start', {
        prewarmKey,
        employeeId,
        name,
        role,
        roleSkills: currentSkills,
        skillRatings,
        resumeText,
        mode: activeMode,
        cachedMcqs,
        cachedQuestions
      });

      setIsStreaming(false);

      // Pass session data up to parent
      onStartAssessment({
        assessmentId: res.data.assessmentId,
        employeeId,
        name,
        role,
        skills: res.data.skills || currentSkills,
        skillRatings,
        firstQuestion: res.data.firstQuestion || null,
        mode: res.data.mode || activeMode
      });
    } catch (err) {
      console.error('Failed to initialize assessment:', err);
      setIsStreaming(false);
      const serverError = err.response?.data?.error || err.message;
      alert(`Could not start assessment: ${serverError || 'Please check that the backend server is running on port 5000.'}`);
    } finally {
      setIsStarting(false);
    }
  };

  const activeSkillsList =
    roleSkills.length > 0
      ? roleSkills
      : getSkillsForRole(role).length > 0
      ? getSkillsForRole(role)
      : [
          'Problem Solving & Architecture',
          'Code Quality & Maintainability',
          'System Design & Scalability',
          'Debugging & Root-Cause Analysis',
          'Cross-Functional Collaboration',
          'Technical Communication'
        ];

  const currentStepIndex = STEPS_META.findIndex((s) => s.id === currentPage);
  const ratedSkillsCount = Object.keys(skillRatings).length;

  // ============================================================================
  // PAGE 1: HERO LANDING PAGE WITH MODE COLOR THEME & START ASSESSMENT CTA
  // ============================================================================
  if (currentPage === 'hero') {
    return (
      <section className="relative min-h-[calc(100vh-5rem)] w-full bg-[#0a0a0a] text-white overflow-hidden flex flex-col justify-between py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
        {/* Mode-Colored Ambient Radial Backdrops */}
        <div
          className="pointer-events-none/0 pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[56rem] h-[32rem] rounded-full blur-3xl opacity-75 transition-all duration-700"
          style={{
            background: `radial-gradient(ellipse at center, ${dark.glowStrong || 'rgba(168,85,247,0.24)'} 0%, ${dark.glow || 'rgba(168,85,247,0.08)'} 45%, transparent 75%)`
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-15" />

        <div className="relative z-10 max-w-5xl mx-auto w-full my-auto">
          {/* Top Mode Configuration Pill */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-10 pb-5 border-b border-white/[0.08]">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-slate-400">
                Active Evaluation Mode
              </span>
              <span className={`inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold border ${dark.badge}`}>
                <ModeIcon mode={activeMode} className="w-3.5 h-3.5" />
                <span>{theme.name}</span>
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <FiShield className={`w-3.5 h-3.5 ${dark.textAccent}`} />
              <span>Configured by HR Management • Confidential Session</span>
            </div>
          </div>

          {/* Hero Main Copy */}
          <div className="max-w-3xl">
            <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-mono uppercase tracking-[0.2em] border mb-6 ${dark.pill}`}>
              <FiZap className="w-3.5 h-3.5" />
              <span>{theme.badge}</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white leading-[1.08] mb-5">
              {theme.portalTitle.split(' ').slice(0, -1).join(' ')}{' '}
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage: `linear-gradient(135deg, #ffffff 0%, ${dark.accentHex || '#a855f7'} 100%)`
                }}
              >
                {theme.portalTitle.split(' ').slice(-1)}
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed mb-4 max-w-2xl">
              {theme.portalSubtitle}
            </p>
            <p className="text-sm text-slate-400 leading-relaxed mb-8 max-w-2xl">
              {theme.description}
            </p>

            {/* Primary CTA Button */}
            <div className="flex flex-wrap items-center gap-4 mb-12">
              <button
                type="button"
                onClick={() => setCurrentPage('basic-info')}
                className={`group inline-flex items-center gap-3 px-8 py-4 rounded-full font-semibold text-sm tracking-wide transition-all duration-300 cursor-pointer ${dark.button}`}
              >
                <span>Start Assessment</span>
                <FiArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>

              <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-white/[0.03] border border-white/10 text-xs text-slate-300">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: dark.accentHex }} />
                <span>Instant MCQ & Resume Pre-Caching Enabled</span>
              </div>
            </div>
          </div>

          {/* 4-Step Assessment Flow Preview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                step: 'STEP 01',
                title: 'Role & Basic Profile',
                desc: 'Enter your ID, name, and target role. Role selection immediately caches Coding MCQs.',
                icon: FiUser
              },
              {
                step: 'STEP 02',
                title: 'Resume Intelligence',
                desc: 'Upload your PDF resume. Questions are generated and cached the moment your resume updates.',
                icon: FiFileText
              },
              {
                step: 'STEP 03',
                title: 'Skills Rating (1–10)',
                desc: 'Optionally self-rate your role competencies from 1 to 10 (non-mandatory).',
                icon: FiSliders
              },
              {
                step: 'STEP 04',
                title: 'Adaptive AI Session',
                desc: 'Complete conversational deep-dive probes and 2 practical code output MCQs.',
                icon: FiCpu
              }
            ].map((item) => {
              const IconComponent = item.icon;
              return (
                <div
                  key={item.step}
                  onClick={() => setCurrentPage('basic-info')}
                  className={`group p-5 rounded-2xl bg-[#111113]/90 border ${dark.cardBorder} ${dark.cardHoverBorder} transition-all duration-300 cursor-pointer flex flex-col justify-between`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-[10px] font-mono uppercase tracking-[0.2em] ${dark.textAccent}`}>
                        {item.step}
                      </span>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${dark.badge}`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                    </div>
                    <h3 className="text-sm font-bold text-white mb-1.5 group-hover:text-white transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  // ============================================================================
  // MULTI-STEP WIZARD SHELL (PAGES 2, 3, 4, 5)
  // ============================================================================
  return (
    <div className="relative min-h-[calc(100vh-5rem)] bg-[#0a0a0a] text-slate-100 py-8 sm:py-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Ambient Mode Radial Glow */}
      <div
        className="pointer-events-none absolute -top-28 left-1/2 -translate-x-1/2 w-[48rem] h-[24rem] rounded-full blur-3xl opacity-60 transition-all duration-700"
        style={{
          background: `radial-gradient(ellipse at center, ${dark.glow || 'rgba(168,85,247,0.16)'} 0%, transparent 70%)`
        }}
      />

      <div className="relative z-10 max-w-3xl mx-auto">
        {/* Top Mode & Stepper Bar */}
        <div className="mb-6 bg-[#111113]/90 backdrop-blur-xl p-4 rounded-2xl border border-white/[0.08] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${dark.badge}`}>
              <ModeIcon mode={activeMode} className="w-3.5 h-3.5" />
              <span>{theme.name}</span>
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Step {currentStepIndex + 1} of {STEPS_META.length}
            </span>
          </div>

          {/* Live Background Cache Badges */}
          <div className="flex flex-wrap items-center gap-2">
            {mcqCacheStatus !== 'idle' && (
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border ${
                mcqCacheStatus === 'cached'
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/30 animate-pulse'
              }`}>
                <FiCode className="w-3 h-3" />
                <span>{mcqCacheStatus === 'cached' ? 'MCQs Cached' : 'Caching MCQs…'}</span>
              </span>
            )}
            {questionCacheStatus !== 'idle' && (
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border ${
                questionCacheStatus === 'cached'
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/30 animate-pulse'
              }`}>
                <FiZap className="w-3 h-3" />
                <span>{questionCacheStatus === 'cached' ? 'Resume Qs Cached' : 'Generating Resume Qs…'}</span>
              </span>
            )}
          </div>
        </div>

        {/* Stepper Pills */}
        <div className="grid grid-cols-5 gap-2 mb-8">
          {STEPS_META.map((step, idx) => {
            const isActive = step.id === currentPage;
            const isDone = idx < currentStepIndex;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => {
                  if (idx <= currentStepIndex) setCurrentPage(step.id);
                }}
                disabled={idx > currentStepIndex}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  isActive
                    ? `${dark.badge} shadow-sm cursor-pointer`
                    : isDone
                    ? 'bg-white/[0.04] border-white/15 text-slate-300 hover:bg-white/[0.07] cursor-pointer'
                    : 'bg-white/[0.02] border-white/[0.06] text-slate-600 cursor-not-allowed'
                }`}
              >
                <div className="text-[10px] font-mono uppercase tracking-wider opacity-75">
                  {step.number}
                </div>
                <div className="text-xs font-semibold truncate mt-0.5">
                  {step.label}
                </div>
              </button>
            );
          })}
        </div>

        {/* ==================================================================== */}
        {/* PAGE 2: BASIC CANDIDATE / EMPLOYEE INFO & ROLE SELECTION             */}
        {/* ==================================================================== */}
        {currentPage === 'basic-info' && (
          <div className={`bg-[#111113]/95 backdrop-blur-xl p-6 sm:p-8 rounded-2xl border ${dark.cardBorder} shadow-2xl space-y-6`}>
            <div className="border-b border-white/[0.08] pb-5">
              <span className={`text-[11px] font-mono uppercase tracking-[0.2em] ${dark.textAccent} block mb-1`}>
                Step 02 • Identity & Target Benchmark
              </span>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Basic Information & Role Selection
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                Enter your identification details and select your role. Selecting a role immediately pre-generates and caches your technical Coding MCQs.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  {theme.idLabel}
                </label>
                <input
                  type="text"
                  required
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder={theme.idPlaceholder}
                  className={`w-full p-3 bg-[#0a0a0a] border border-white/15 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none transition-all ${dark.focusRing}`}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Johnson"
                  className={`w-full p-3 bg-[#0a0a0a] border border-white/15 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none transition-all ${dark.focusRing}`}
                />
              </div>
            </div>

            {/* Searchable Role Selection Combobox */}
            <div className="relative" ref={dropdownRef}>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                {theme.roleLabel}{' '}
                <span className="text-[11px] text-slate-500 font-normal normal-case">
                  (Triggers instant Coding MCQ generation & caching)
                </span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={searchQuery}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearchQuery(val);
                    setRole(val);
                    setIsDropdownOpen(true);
                    const skills = getSkillsForRole(val);
                    setRoleSkills(skills);
                    if (skills.length > 0) {
                      triggerMcqPrewarm(val, skills);
                    }
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  placeholder="Search role e.g. Frontend Developer, Data Scientist, DevOps & Cloud Engineer..."
                  className={`w-full p-3 pr-10 bg-[#0a0a0a] border border-white/15 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none transition-all ${dark.focusRing}`}
                />
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="absolute right-3 top-3.5 text-slate-400 hover:text-white focus:outline-none cursor-pointer"
                >
                  <svg className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {/* Floating Dark Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute z-30 w-full mt-2 bg-[#141417] border border-white/15 rounded-xl shadow-2xl max-h-72 overflow-y-auto">
                  {filteredCategories.length > 0 ? (
                    filteredCategories.map((category) => (
                      <div key={category.category} className="border-b border-white/[0.06] last:border-0">
                        <div className="px-3.5 py-2 bg-[#0a0a0a]/90 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest sticky top-0 backdrop-blur-md">
                          {category.category}
                        </div>
                        {category.roles.map((item) => (
                          <div
                            key={item.title}
                            onClick={() => handleSelectRole(item.title)}
                            className={`px-4 py-3 cursor-pointer hover:bg-white/[0.06] transition-colors ${
                              role === item.title ? 'bg-white/[0.08]' : ''
                            }`}
                          >
                            <div className="font-semibold text-white text-sm">{item.title}</div>
                            <div className="text-xs text-slate-400 truncate mt-0.5">
                              {item.skills.slice(0, 5).join(' • ')}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-400">
                      Custom role <span className="text-white font-semibold">&ldquo;{searchQuery}&rdquo;</span> selected. Click below to cache MCQs for this custom role.
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsDropdownOpen(false);
                            triggerMcqPrewarm(searchQuery, []);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${dark.buttonSecondary}`}
                        >
                          Use Custom Role & Pre-Cache MCQs
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Benchmark Skills Preview Badge Container */}
            {role && (
              <div className={`p-4 rounded-xl border ${dark.borderAccent} ${dark.bgAccentSubtle} transition-all`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                    <FiTarget className={`w-4 h-4 ${dark.textAccent}`} />
                    <span>Mapped Competencies for {role}</span>
                  </span>
                  <span className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full border ${dark.pill}`}>
                    {activeSkillsList.length} Core Skills
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {activeSkillsList.map((skill, idx) => (
                    <span
                      key={idx}
                      className="bg-[#0a0a0a]/90 text-slate-200 text-xs font-medium px-3 py-1 rounded-lg border border-white/10"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setCurrentPage('hero')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-all cursor-pointer"
              >
                <FiArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                type="button"
                disabled={!employeeId.trim() || !name.trim() || !role.trim()}
                onClick={() => {
                  if (mcqCacheStatus === 'idle' && role.trim()) {
                    triggerMcqPrewarm(role, activeSkillsList);
                  }
                  setCurrentPage('resume');
                }}
                className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer ${dark.button} disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <span>Next: Upload Resume</span>
                <FiArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* PAGE 3: RESUME UPLOAD PAGE (IMMEDIATE QUESTION GENERATION & CACHE)   */}
        {/* ==================================================================== */}
        {currentPage === 'resume' && (
          <div className={`bg-[#111113]/95 backdrop-blur-xl p-6 sm:p-8 rounded-2xl border ${dark.cardBorder} shadow-2xl space-y-6`}>
            <div className="border-b border-white/[0.08] pb-5">
              <span className={`text-[11px] font-mono uppercase tracking-[0.2em] ${dark.textAccent} block mb-1`}>
                Step 03 • Resume Intelligence & Question Pre-Generation
              </span>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Upload Candidate / Employee Resume
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                Upload your PDF resume. As soon as your resume is updated, NEX AI immediately begins generating and caching personalized interview questions in the background.
              </p>
            </div>

            {/* PDF Upload Dropzone */}
            <label
              className={`group relative flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed ${dark.borderAccent} bg-[#0a0a0a]/70 hover:bg-white/[0.03] transition-all cursor-pointer text-center`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border mb-3 ${dark.badge}`}>
                <FiUploadCloud className="w-6 h-6" />
              </div>
              <span className="text-sm font-semibold text-white mb-1">
                {resumeFileName ? `Uploaded: ${resumeFileName}` : theme.resumeLabel}
              </span>
              <span className="text-xs text-slate-400">
                Click to select a PDF file (Max 10MB) • Instant text extraction & question caching
              </span>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="sr-only"
              />
            </label>

            {/* Parsing Indicator */}
            {isParsing && (
              <div className={`flex items-center gap-3 p-4 rounded-xl border ${dark.badge}`}>
                <div className={`animate-spin rounded-full h-4 w-4 border-2 ${dark.spinner} border-t-transparent`} />
                <span className="text-xs font-medium">
                  Extracting verified text from PDF and triggering background question generation...
                </span>
              </div>
            )}

            {/* Resume Text Preview / Direct Editor */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Extracted Resume Content / Project Highlights
                </label>
                {resumeText && (
                  <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                    <FiCheckCircle className="w-3.5 h-3.5" />
                    <span>
                      {questionCacheStatus === 'cached'
                        ? 'Parsed & Questions Cached'
                        : questionCacheStatus === 'caching'
                        ? 'Parsed • Caching Questions…'
                        : 'Parsed Successfully'}
                    </span>
                  </span>
                )}
              </div>
              <textarea
                value={resumeText}
                onChange={(e) => handleManualResumeUpdate(e.target.value)}
                placeholder="Upload a PDF above, or paste your key projects, technical achievements, and responsibilities here to immediately trigger question generation..."
                className={`w-full h-44 p-4 bg-[#0a0a0a] border border-white/15 rounded-xl text-xs text-slate-200 font-mono leading-relaxed focus:outline-none transition-all ${dark.focusRing}`}
              />
            </div>

            {/* Navigation Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setCurrentPage('basic-info')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-all cursor-pointer"
              >
                <FiArrowLeft className="w-4 h-4" />
                <span>Back to Basic Info</span>
              </button>

              <button
                type="button"
                disabled={isParsing}
                onClick={() => setCurrentPage('skills')}
                className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer ${dark.button} disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <span>Next: Skills & Competencies</span>
                <FiArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* PAGE 4: SKILLS & COMPETENCIES SELF-RATING (1-10, NON-MANDATORY)      */}
        {/* ==================================================================== */}
        {currentPage === 'skills' && (
          <div className={`bg-[#111113]/95 backdrop-blur-xl p-6 sm:p-8 rounded-2xl border ${dark.cardBorder} shadow-2xl space-y-6`}>
            <div className="border-b border-white/[0.08] pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[11px] font-mono uppercase tracking-[0.2em] ${dark.textAccent}`}>
                    Step 04 • Competency Self-Assessment
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider bg-white/[0.06] text-slate-300 border border-white/10">
                    Optional • Non-Mandatory
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  Rate Your Skills & Competencies (1–10)
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  Rate your confidence in the benchmark competencies for <span className="text-white font-semibold">{role}</span> from 1 to 10. All questions on this page are completely optional.
                </p>
              </div>

              <div className="text-right flex-shrink-0">
                <span className={`inline-block px-3 py-1.5 rounded-xl text-xs font-mono border ${dark.pill}`}>
                  {ratedSkillsCount} / {activeSkillsList.length} Rated
                </span>
              </div>
            </div>

            {/* Skills 1-10 Rating Cards */}
            <div className="space-y-3 max-h-[26rem] overflow-y-auto pr-1">
              {activeSkillsList.map((skill) => {
                const currentScore = skillRatings[skill] || null;
                return (
                  <div
                    key={skill}
                    className="p-4 rounded-xl bg-[#0a0a0a]/90 border border-white/10 hover:border-white/20 transition-all"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{skill}</span>
                        <span className="text-[11px] text-slate-500 font-mono">(Optional)</span>
                      </div>
                      <span className={`text-xs font-mono ${currentScore ? dark.textAccent : 'text-slate-500'}`}>
                        {currentScore ? `${currentScore}/10 — ${getSkillTierLabel(currentScore)}` : 'Unrated'}
                      </span>
                    </div>

                    <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                        const isSelected = currentScore === num;
                        return (
                          <button
                            key={num}
                            type="button"
                            onClick={() => handleRateSkill(skill, num)}
                            className={`py-2 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer ${
                              isSelected
                                ? dark.ratingActive
                                : 'bg-[#141417] text-slate-400 border-white/10 hover:border-white/25 hover:text-white'
                            }`}
                          >
                            {num}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Navigation Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setCurrentPage('resume')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-all cursor-pointer"
              >
                <FiArrowLeft className="w-4 h-4" />
                <span>Back to Resume</span>
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentPage('launch')}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-all cursor-pointer"
                >
                  Skip Optional Ratings
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentPage('launch')}
                  className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer ${dark.button}`}
                >
                  <span>Next: To Assessment</span>
                  <FiArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* PAGE 5: PRE-ASSESSMENT THOUGHTLINE & FINAL LAUNCH SCREEN             */}
        {/* ==================================================================== */}
        {currentPage === 'launch' && (
          <div className={`bg-[#111113]/95 backdrop-blur-xl p-6 sm:p-8 rounded-2xl border ${dark.cardBorder} shadow-2xl space-y-6`}>
            <div className="border-b border-white/[0.08] pb-5">
              <span className={`text-[11px] font-mono uppercase tracking-[0.2em] ${dark.textAccent} block mb-1`}>
                Step 05 • AI Assessment Readiness
              </span>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Ready to Begin Your {theme.name}
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                Review your session summary and reasoning trace below before launching the adaptive interview.
              </p>
            </div>

            {/* ThoughtLine Reasoning Trace Component Before Starting Assessment */}
            <div className={`p-5 rounded-2xl bg-[#0a0a0a] border ${dark.borderAccent} flex flex-col items-start justify-center`}>
              <ThoughtLine
                working={isStreaming}
                steps={['Reading the question', 'Searching your notes', 'Drafting an answer']}
                label="Thinking…"
                doneLabel="Thought for"
                glyph="sparkle"
                fontSize={16}
                breathPeriod={1.6}
                breathDepth={0.45}
                settleDuration={350}
                settleBlur={2}
                collapsible
                collapseOnSettle
                showTimer
                color="#f8fafc"
                glyphColor={dark.accentHex}
                onSettle={(seconds) => console.log(`thought for ${seconds}s`)}
              />
            </div>

            {/* Candidate Summary Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[#0a0a0a] border border-white/10">
                <span className="text-slate-500 block mb-0.5 font-mono uppercase text-[10px]">Participant</span>
                <span className="text-white font-semibold text-sm">{name} ({employeeId})</span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#0a0a0a] border border-white/10">
                <span className="text-slate-500 block mb-0.5 font-mono uppercase text-[10px]">Target Role</span>
                <span className="text-white font-semibold text-sm">{role}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#0a0a0a] border border-white/10">
                <span className="text-slate-500 block mb-0.5 font-mono uppercase text-[10px]">Pre-Cached Assets</span>
                <span className="text-emerald-400 font-semibold">
                  {mcqCacheStatus === 'cached' ? 'Coding MCQs Cached' : 'Coding MCQs Ready'} •{' '}
                  {questionCacheStatus === 'cached' ? 'Resume Qs Cached' : 'Adaptive Engine Ready'}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#0a0a0a] border border-white/10">
                <span className="text-slate-500 block mb-0.5 font-mono uppercase text-[10px]">Self-Rated Skills</span>
                <span className="text-slate-200 font-semibold">
                  {ratedSkillsCount > 0 ? `${ratedSkillsCount} Competencies Rated` : 'Skipped (Optional)'}
                </span>
              </div>
            </div>

            {/* Mode Notice */}
            <div className={`p-4 rounded-xl border ${dark.badge} text-xs leading-relaxed`}>
              <strong className="block uppercase tracking-wider text-[11px] mb-1">{theme.name} Mandate</strong>
              {theme.notice}
            </div>

            {/* Launch Button */}
            <div className="flex items-center justify-between pt-4 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setCurrentPage('skills')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-all cursor-pointer"
              >
                <FiArrowLeft className="w-4 h-4" />
                <span>Back to Skills</span>
              </button>

              <button
                type="button"
                disabled={isStarting}
                onClick={handleStartAssessment}
                className={`inline-flex items-center gap-3 px-8 py-3.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${dark.button} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isStarting ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                    <span>Launching {theme.name}…</span>
                  </>
                ) : (
                  <>
                    <span>{theme.submitButtonText}</span>
                    <FiArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
