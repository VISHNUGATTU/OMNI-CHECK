import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { MODE_THEMES, getClientModeTheme } from '../data/modeThemes';
import ModeIcon from '../components/ui/ModeIcon';
import TopicIcon from '../components/ui/TopicIcon';
import {
  FiSliders,
  FiFileText,
  FiUsers,
  FiUpload,
  FiUserPlus,
  FiCheck,
  FiCheckCircle,
  FiLink,
  FiRefreshCw,
  FiEye,
  FiDownload,
  FiRotateCcw,
  FiSave,
  FiLayers,
  FiAlertCircle,
  FiSearch,
  FiExternalLink,
  FiArrowRight,
  FiX
} from 'react-icons/fi';

export default function HRDashboard() {
  // 4 Clean, Segregated Workspaces: 'modes' | 'flow' | 'directory' | 'reports'
  const [activeSection, setActiveSection] = useState('modes');

  // Platform Mode Configuration States
  const [activeMode, setActiveMode] = useState('retention');
  const [isChangingMode, setIsChangingMode] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Modals inside Talent Directory ('upload' | 'manual' | null)
  const [directoryModal, setDirectoryModal] = useState(null);

  // Excel Upload States
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Manual Form States
  const [formData, setFormData] = useState({
    employeeId: '',
    name: '',
    role: '',
    hrWorkHistory: '',
    hrFeedback: ''
  });
  const [manualStatus, setManualStatus] = useState('');

  // Directory States
  const [employees, setEmployees] = useState([]);
  const [isLoadingDirectory, setIsLoadingDirectory] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  // Assessment Reports States
  const [reports, setReports] = useState([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [reportSearchFilter, setReportSearchFilter] = useState('');
  const [reportModeFilter, setReportModeFilter] = useState('all');

  // Topic Configuration States
  const [allTopicDefinitions, setAllTopicDefinitions] = useState([]);
  const [modeTopicsData, setModeTopicsData] = useState({});
  const [customizingMode, setCustomizingMode] = useState('retention');
  const [isSavingTopics, setIsSavingTopics] = useState(false);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // Client-side topic dispersion logic matching the backend zero-latency generation flow
  const disperseTopicsClient = (topicCounts) => {
    const cleanCounts = {};
    for (const [key, val] of Object.entries(topicCounts || {})) {
      let count = 0;
      if (typeof val === 'number') {
        count = Math.max(0, parseInt(val, 10) || 0);
      } else if (val && typeof val === 'object') {
        if (val.enabled !== false) {
          count = Math.max(0, parseInt(val.count, 10) || 0);
        }
      }
      if (count > 0) cleanCounts[key] = count;
    }

    const total = Object.values(cleanCounts).reduce((a, b) => a + b, 0);
    if (total === 0) return [];

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

      if (candidates.length > 1 && lastTopic) {
        const nonRepeating = candidates.filter((k) => k !== lastTopic);
        if (nonRepeating.length > 0) {
          candidates = nonRepeating;
        }
      }

      if (step < 3) {
        const unstartedConv = candidates.filter((k) => k !== 'coding_mcq' && seenCount[k] === 0);
        if (unstartedConv.length > 0) {
          candidates = unstartedConv;
        } else if (candidates.some((k) => k !== 'coding_mcq')) {
          candidates = candidates.filter((k) => k !== 'coding_mcq');
        }
      }

      const strongBuffered = candidates.filter((k) => {
        if (k === 'coding_mcq') {
          if (step < 3) return false;
          return step - lastPlacedStep.coding_mcq >= 3;
        }
        if (seenCount[k] === 0) return true;
        return step - lastPlacedStep[k] >= 3;
      });

      const minBuffered = candidates.filter((k) => {
        if (k === 'coding_mcq') return step - lastPlacedStep.coding_mcq >= 2;
        if (seenCount[k] === 0) return true;
        return step - lastPlacedStep[k] >= 2;
      });

      const activeCandidates =
        strongBuffered.length > 0
          ? strongBuffered
          : minBuffered.length > 0
            ? minBuffered
            : candidates;

      activeCandidates.sort((a, b) => {
        if (step < 3) {
          const aUnstarted = seenCount[a] === 0 && a !== 'coding_mcq' ? 1 : 0;
          const bUnstarted = seenCount[b] === 0 && b !== 'coding_mcq' ? 1 : 0;
          if (bUnstarted !== aUnstarted) return bUnstarted - aUnstarted;

          const totalDiff = (initialTotal[b] || 0) - (initialTotal[a] || 0);
          if (totalDiff !== 0) return totalDiff;

          return (topicOrderIndex[a] || 0) - (topicOrderIndex[b] || 0);
        }

        const aMultiUnstarted = seenCount[a] === 0 && a !== 'coding_mcq' && remaining[a] >= 2 ? 1 : 0;
        const bMultiUnstarted = seenCount[b] === 0 && b !== 'coding_mcq' && remaining[b] >= 2 ? 1 : 0;
        if (bMultiUnstarted !== aMultiUnstarted) return bMultiUnstarted - aMultiUnstarted;

        const nextMcqTarget = mcqTargetSteps[seenCount.coding_mcq || 0] ?? 999;
        const aIsScheduledMcq = a === 'coding_mcq' && step >= nextMcqTarget ? 1 : 0;
        const bIsScheduledMcq = b === 'coding_mcq' && step >= nextMcqTarget ? 1 : 0;
        if (bIsScheduledMcq !== aIsScheduledMcq) return bIsScheduledMcq - aIsScheduledMcq;

        const aReadyFollowup = seenCount[a] > 0 && a !== 'coding_mcq' && step - lastPlacedStep[a] >= 3 ? 1 : 0;
        const bReadyFollowup = seenCount[b] > 0 && b !== 'coding_mcq' && step - lastPlacedStep[b] >= 3 ? 1 : 0;
        if (bReadyFollowup !== aReadyFollowup) return bReadyFollowup - aReadyFollowup;

        if (a === 'coding_mcq' || b === 'coding_mcq') {
          const urgentMcq = remaining.coding_mcq >= Math.ceil((total - step) / 2);
          if (!urgentMcq) {
            if (a === 'coding_mcq') return 1;
            if (b === 'coding_mcq') return -1;
          }
        }

        const aFirstQ = seenCount[a] === 0 && a !== 'coding_mcq' ? 1 : 0;
        const bFirstQ = seenCount[b] === 0 && b !== 'coding_mcq' ? 1 : 0;
        if (bFirstQ !== aFirstQ) return bFirstQ - aFirstQ;

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

      sequence.push({ topic: finalTopicName, rawTopic: chosen });
    }

    return sequence.map((s) => s.topic);
  };

  // Fetch full mode & topic configuration
  const fetchModeConfig = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/settings/mode-config');
      if (res.data) {
        if (res.data.activeMode) {
          setActiveMode(res.data.activeMode);
          setCustomizingMode(res.data.activeMode);
        }
        if (Array.isArray(res.data.allTopicDefinitions)) {
          setAllTopicDefinitions(res.data.allTopicDefinitions);
        }
        if (res.data.modes) {
          setModeTopicsData(res.data.modes);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch mode config:', err);
    }
  };

  // Switch active mode on the server
  const handleSelectMode = async (modeKey) => {
    if (isChangingMode) return;
    setIsChangingMode(true);
    try {
      const res = await axios.post('http://localhost:5000/api/settings/mode', { mode: modeKey });
      if (res.data.activeMode) {
        setActiveMode(res.data.activeMode);
        setCustomizingMode(modeKey);
        showToast(`${MODE_THEMES[modeKey]?.name || modeKey} is now active across the platform.`);
      }
    } catch (err) {
      console.error('Failed to change mode:', err);
      alert('Could not update active mode on server.');
    } finally {
      setIsChangingMode(false);
    }
  };

  // Toggle topic inclusion for a specific mode
  const handleToggleTopic = (modeKey, topicId) => {
    setModeTopicsData((prev) => {
      const modeData = prev[modeKey] || {};
      const currentConfig = { ...(modeData.topicsConfig || {}) };
      const currentTopic = currentConfig[topicId] || { enabled: false, count: 1 };
      const newEnabled = !currentTopic.enabled;

      currentConfig[topicId] = {
        ...currentTopic,
        enabled: newEnabled,
        count: currentTopic.count > 0 ? currentTopic.count : 1
      };

      const newDispersed = disperseTopicsClient(currentConfig);
      const totalQ = newDispersed.length;
      const mcqC = newDispersed.filter((t) => t.includes('coding_mcq')).length;

      return {
        ...prev,
        [modeKey]: {
          ...modeData,
          topicsConfig: currentConfig,
          dispersedTopics: newDispersed,
          totalQuestions: totalQ,
          mcqCount: mcqC,
          conversationalCount: totalQ - mcqC
        }
      };
    });
  };

  // Change question count for a specific topic
  const handleChangeTopicCount = (modeKey, topicId, newCount) => {
    const safeCount = Math.min(10, Math.max(1, parseInt(newCount, 10) || 1));
    setModeTopicsData((prev) => {
      const modeData = prev[modeKey] || {};
      const currentConfig = { ...(modeData.topicsConfig || {}) };
      const currentTopic = currentConfig[topicId] || { enabled: true, count: 1 };

      currentConfig[topicId] = {
        ...currentTopic,
        enabled: true,
        count: safeCount
      };

      const newDispersed = disperseTopicsClient(currentConfig);
      const totalQ = newDispersed.length;
      const mcqC = newDispersed.filter((t) => t.includes('coding_mcq')).length;

      return {
        ...prev,
        [modeKey]: {
          ...modeData,
          topicsConfig: currentConfig,
          dispersedTopics: newDispersed,
          totalQuestions: totalQ,
          mcqCount: mcqC,
          conversationalCount: totalQ - mcqC
        }
      };
    });
  };

  // Save customized topics & question counts to backend
  const handleSaveTopics = async (modeKey) => {
    setIsSavingTopics(true);
    try {
      const modeData = modeTopicsData[modeKey];
      if (!modeData || !modeData.topicsConfig) return;

      const enabledTopics = Object.values(modeData.topicsConfig).filter((t) => t.enabled && t.count > 0);
      if (enabledTopics.length === 0) {
        alert('Please enable at least one topic with at least 1 question.');
        return;
      }

      const res = await axios.post('http://localhost:5000/api/settings/mode-config', {
        modeKey,
        topicsConfig: modeData.topicsConfig
      });

      if (res.data.success) {
        showToast(
          `Saved ${MODE_THEMES[modeKey]?.name || modeKey} flow (${res.data.totalQuestions} questions: ${res.data.conversationalCount} conversational + ${res.data.mcqCount} MCQs).`
        );
        setModeTopicsData((prev) => ({
          ...prev,
          [modeKey]: {
            ...prev[modeKey],
            topicsConfig: res.data.topicsConfig,
            dispersedTopics: res.data.dispersedTopics,
            totalQuestions: res.data.totalQuestions,
            mcqCount: res.data.mcqCount,
            conversationalCount: res.data.conversationalCount
          }
        }));
      }
    } catch (err) {
      console.error('Failed to save topics config:', err);
      alert('Failed to save topics configuration on server.');
    } finally {
      setIsSavingTopics(false);
    }
  };

  // Reset topic configuration back to recommended defaults
  const handleResetTopics = async (modeKey) => {
    if (!window.confirm(`Reset ${MODE_THEMES[modeKey]?.name || modeKey} question flow to recommended defaults?`)) {
      return;
    }
    setIsSavingTopics(true);
    try {
      const res = await axios.post('http://localhost:5000/api/settings/mode-config/reset', { modeKey });
      if (res.data.success) {
        showToast(`${MODE_THEMES[modeKey]?.name || modeKey} reset to default question flow.`);
        setModeTopicsData((prev) => ({
          ...prev,
          [modeKey]: {
            ...prev[modeKey],
            topicsConfig: res.data.topicsConfig,
            dispersedTopics: res.data.dispersedTopics,
            totalQuestions: res.data.totalQuestions,
            mcqCount: res.data.mcqCount,
            conversationalCount: res.data.conversationalCount
          }
        }));
      }
    } catch (err) {
      console.error('Failed to reset topics config:', err);
    } finally {
      setIsSavingTopics(false);
    }
  };

  // Copy candidate / employee assessment link
  const handleCopyLink = (modeKey = activeMode) => {
    const url = `${window.location.origin}/employee?mode=${modeKey}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(modeKey);
    showToast(`Copied ${MODE_THEMES[modeKey]?.shortTitle || modeKey} assessment link to clipboard.`);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Fetch employees from database
  const fetchEmployees = async () => {
    setIsLoadingDirectory(true);
    try {
      const res = await axios.get('http://localhost:5000/api/hr/employees');
      setEmployees(res.data.employees || []);
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    } finally {
      setIsLoadingDirectory(false);
    }
  };

  // Fetch generated assessment reports
  const fetchReports = async () => {
    setIsLoadingReports(true);
    try {
      const res = await axios.get('http://localhost:5000/api/reports');
      setReports(res.data.reports || []);
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    } finally {
      setIsLoadingReports(false);
    }
  };

  useEffect(() => {
    fetchModeConfig();
    fetchReports();
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (activeSection === 'directory') {
      fetchEmployees();
      fetchReports();
    } else if (activeSection === 'reports') {
      fetchReports();
    }
  }, [activeSection]);

  // Handle Drag & Drop
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv'))) {
      setSelectedFile(file);
      setUploadResult(null);
    } else {
      alert('Please upload a valid Excel file (.xlsx, .xls, or .csv)');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setUploadResult(null);
    }
  };

  // Submit Excel file to backend
  const handleUploadExcel = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadResult(null);

    const data = new FormData();
    data.append('file', selectedFile);

    try {
      const res = await axios.post('http://localhost:5000/api/hr/upload-excel', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadResult({
        success: true,
        message: res.data.message,
        savedCount: res.data.savedCount,
        records: res.data.records || []
      });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchEmployees();
    } catch (err) {
      setUploadResult({
        success: false,
        message: err.response?.data?.error || 'Failed to upload and parse Excel file.'
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Submit Manual Employee record
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setManualStatus('Saving...');
    try {
      await axios.post('http://localhost:5000/api/hr/update', formData);
      setManualStatus('Saved!');
      setFormData({ employeeId: '', name: '', role: '', hrWorkHistory: '', hrFeedback: '' });
      fetchEmployees();
      showToast('Employee profile saved to directory.');
      setTimeout(() => {
        setManualStatus('');
        setDirectoryModal(null);
      }, 800);
    } catch (error) {
      const msg = error.response?.data?.error || 'Failed to save profile.';
      setManualStatus(msg);
    }
  };

  // Filtered employees for directory
  const filteredEmployees = employees.filter((emp) => {
    const q = searchFilter.toLowerCase();
    return (
      (emp.id && emp.id.toLowerCase().includes(q)) ||
      (emp.name && emp.name.toLowerCase().includes(q)) ||
      (emp.role && emp.role.toLowerCase().includes(q))
    );
  });

  // Calculate report counts per mode
  const reportCounts = {
    all: reports.length,
    hiring: reports.filter((r) => r.mode === 'hiring').length,
    assessment: reports.filter((r) => r.mode === 'assessment').length,
    retention: reports.filter((r) => r.mode === 'retention').length,
    layoff: reports.filter((r) => r.mode === 'layoff').length
  };

  // Filtered reports
  const filteredReports = reports.filter((rep) => {
    const matchesMode = reportModeFilter === 'all' || rep.mode === reportModeFilter;
    const q = reportSearchFilter.toLowerCase();
    const matchesSearch =
      (rep.filename && rep.filename.toLowerCase().includes(q)) ||
      (rep.name && rep.name.toLowerCase().includes(q)) ||
      (rep.employeeId && rep.employeeId.toLowerCase().includes(q)) ||
      (rep.decision && rep.decision.toLowerCase().includes(q));
    return matchesMode && matchesSearch;
  });

  const activeModeTheme = getClientModeTheme(activeMode);
  const activeDark = activeModeTheme.dark || {};
  const customizingTheme = getClientModeTheme(customizingMode);
  const customDark = customizingTheme.dark || {};

  const sections = [
    {
      id: 'modes',
      step: '01',
      label: 'Assessment Mode',
      desc: 'Select active mode & share link',
      icon: FiSliders
    },
    {
      id: 'flow',
      step: '02',
      label: 'Question Flow',
      desc: 'Topics, counts & sequence',
      icon: FiLayers
    },
    {
      id: 'directory',
      step: '03',
      label: 'Talent Directory',
      desc: 'Roster & Excel import',
      icon: FiUsers,
      badge: employees.length
    },
    {
      id: 'reports',
      step: '04',
      label: 'Evaluation Reports',
      desc: 'AI scorecards & PDFs',
      icon: FiFileText,
      badge: reports.length
    }
  ];

  const getFlowChipTitle = (topicString) => {
    if (topicString.includes('coding_mcq')) {
      const num = topicString.replace('coding_mcq_', '');
      return `MCQ #${num}`;
    }
    const matched = allTopicDefinitions.find((d) => d.id === topicString);
    return matched ? matched.shortLabel : topicString.replace(/_/g, ' ');
  };

  return (
    <div className="relative min-h-[calc(100vh-5rem)] bg-[#0a0a0a] text-slate-100 pb-20">
      {/* Subtle Ambient Glow */}
      <div
        className="pointer-events-none fixed inset-0 z-0 transition-all duration-700"
        style={{
          background: `radial-gradient(circle at 20% 10%, ${activeDark.glow || 'rgba(168,85,247,0.12)'}, transparent 45%)`
        }}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-[#16161a]/95 border border-emerald-500/30 text-emerald-300 text-xs font-semibold shadow-2xl backdrop-blur-xl">
          <FiCheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* ========================================================= */}
        {/* COMPACT EXECUTIVE HEADER BAR                              */}
        {/* ========================================================= */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-5 border-b border-white/[0.08]">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                HR Command Console
              </h1>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                  activeDark.badge || 'bg-white/10 text-white border-white/20'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                <ModeIcon mode={activeMode} className="w-3.5 h-3.5" />
                <span>{activeModeTheme.name}</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Manage evaluation modes, question sequences, candidate rosters, and PDF reports.
            </p>
          </div>

          {/* Quick Global Actions */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handleCopyLink(activeMode)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.09] text-slate-200 border border-white/10 transition-colors cursor-pointer"
            >
              {copiedLink === activeMode ? (
                <>
                  <FiCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Link Copied</span>
                </>
              ) : (
                <>
                  <FiLink className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy Portal Link</span>
                </>
              )}
            </button>

            <a
              href={`/employee?mode=${activeMode}`}
              target="_blank"
              rel="noreferrer"
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeDark.button || 'bg-white text-black'
              }`}
            >
              <span>Open Portal</span>
              <FiExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 4-STEP SEGREGATED WORKSPACE NAVIGATION                    */}
        {/* ========================================================= */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {sections.map((sec) => {
            const Icon = sec.icon;
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveSection(sec.id)}
                className={`group text-left p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between ${
                  isActive
                    ? `bg-[#141418] ${activeDark.cardBorder || 'border-white/25'} shadow-lg`
                    : 'bg-[#111113]/60 border-white/[0.06] hover:border-white/15 hover:bg-[#141418]/60'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2.5 rounded-xl border transition-colors ${
                      isActive
                        ? activeDark.badge || 'bg-white/10 text-white border-white/20'
                        : 'bg-white/[0.03] border-white/[0.06] text-slate-400 group-hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                        {sec.step}
                      </span>
                      <span className={`text-sm font-bold ${isActive ? 'text-white' : 'text-slate-300'}`}>
                        {sec.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{sec.desc}</p>
                  </div>
                </div>

                {typeof sec.badge === 'number' && sec.badge > 0 && (
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-white/15 text-white'
                        : 'bg-white/[0.05] text-slate-400'
                    }`}
                  >
                    {sec.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ========================================================= */}
        {/* WORKSPACE 1: ASSESSMENT MODE SELECTION                    */}
        {/* ========================================================= */}
        {activeSection === 'modes' && (
          <div className="space-y-6">
            {/* Clean 2x2 Mode Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.values(MODE_THEMES).map((m) => {
                const isSelected = activeMode === m.id;
                const mDark = m.dark || {};
                const mData = modeTopicsData[m.id] || {};
                const totalQ = mData.totalQuestions || 8;
                const mcqQ = mData.mcqCount || 2;

                return (
                  <div
                    key={m.id}
                    onClick={() => handleSelectMode(m.id)}
                    className={`relative p-6 rounded-2xl border transition-all cursor-pointer bg-[#111113]/90 flex flex-col justify-between ${
                      isSelected
                        ? `${mDark.cardBorder || 'border-white/30'} ring-1 ring-white/10`
                        : 'border-white/[0.07] hover:border-white/20'
                    }`}
                    style={
                      isSelected
                        ? { boxShadow: `0 12px 40px -12px ${mDark.glowStrong || 'rgba(0,0,0,0.5)'}` }
                        : undefined
                    }
                  >
                    <div>
                      {/* Card Top Row */}
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex items-center gap-3.5">
                          <span
                            className={`p-3 rounded-xl border flex items-center justify-center ${
                              mDark.badge || 'bg-white/5 border-white/10 text-white'
                            }`}
                          >
                            <ModeIcon mode={m.id} className="w-5 h-5" />
                          </span>
                          <div>
                            <h3 className="text-base font-bold text-white">{m.name}</h3>
                            <p className={`text-xs font-medium ${mDark.textAccent || 'text-slate-400'}`}>
                              {m.badge}
                            </p>
                          </div>
                        </div>

                        {isSelected ? (
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${
                              mDark.badge || 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            }`}
                          >
                            <FiCheck className="w-3.5 h-3.5" /> Active
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-slate-500 hover:text-slate-300 px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                            Click to Activate
                          </span>
                        )}
                      </div>

                      {/* Concise Description */}
                      <p className="text-xs text-slate-400 leading-relaxed mb-5">
                        {m.description}
                      </p>
                    </div>

                    {/* Card Footer: Key Pills + Actions */}
                    <div className="pt-4 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-white/[0.04] text-slate-300 border border-white/[0.07]">
                          {totalQ} Questions ({mcqQ} MCQs)
                        </span>
                        <span className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-white/[0.03] text-slate-400 border border-white/[0.06]">
                          {m.id === 'hiring'
                            ? 'No Burnout/Attrition'
                            : m.id === 'assessment'
                              ? 'Work Execution'
                              : m.id === 'layoff'
                                ? 'Role Criticality'
                                : 'Retention & Burnout'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCustomizingMode(m.id);
                            setActiveSection('flow');
                          }}
                          className="text-xs px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.09] text-slate-200 border border-white/10 font-semibold transition-colors cursor-pointer"
                        >
                          Configure Flow
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyLink(m.id);
                          }}
                          className="text-xs px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.09] text-slate-300 border border-white/10 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          {copiedLink === m.id ? (
                            <FiCheck className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <FiLink className="w-3.5 h-3.5" />
                          )}
                          <span>{copiedLink === m.id ? 'Copied' : 'Link'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Clean Next-Step Flow Bar */}
            <div className="p-5 rounded-2xl bg-[#111113]/90 border border-white/[0.08] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className={`p-2.5 rounded-xl border ${activeDark.badge || 'bg-white/10'}`}>
                  <FiLayers className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    Want to adjust topics or question counts for {activeModeTheme.name}?
                  </h4>
                  <p className="text-xs text-slate-400">
                    Customize which competencies are tested and preview the zero-latency question sequence.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setCustomizingMode(activeMode);
                  setActiveSection('flow');
                }}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer self-start sm:self-center ${
                  activeDark.buttonSecondary || 'bg-white/10 text-white border border-white/20'
                }`}
              >
                <span>Customize Question Flow</span>
                <FiArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* WORKSPACE 2: QUESTION FLOW STUDIO                         */}
        {/* ========================================================= */}
        {activeSection === 'flow' && (() => {
          const currentModeData = modeTopicsData[customizingMode] || {};
          const totalQ = currentModeData.totalQuestions || 0;
          const mcqQ = currentModeData.mcqCount || 0;
          const convQ = currentModeData.conversationalCount || 0;
          const dispersedSeq = currentModeData.dispersedTopics || [];

          return (
            <div className="space-y-6">
              {/* Top Control Bar: Mode Selector + Save/Reset */}
              <div className="p-5 rounded-2xl bg-[#111113]/90 border border-white/[0.08] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400 mr-1">Editing Mode:</span>
                  {Object.values(MODE_THEMES).map((m) => {
                    const isCurrent = customizingMode === m.id;
                    const mDark = m.dark || {};
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setCustomizingMode(m.id)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border ${
                          isCurrent
                            ? `${mDark.badge || 'bg-white/10 text-white border-white/20'}`
                            : 'bg-white/[0.02] text-slate-400 hover:text-white hover:bg-white/[0.05] border-white/[0.05]'
                        }`}
                      >
                        <ModeIcon mode={m.id} className="w-3.5 h-3.5" />
                        <span>{m.shortTitle}</span>
                        {activeMode === m.id && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Currently Active Mode" />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleResetTopics(customizingMode)}
                    disabled={isSavingTopics}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-xl transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <FiRotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Defaults</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveTopics(customizingMode)}
                    disabled={isSavingTopics}
                    className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 ${
                      customDark.button || 'bg-white text-black'
                    }`}
                  >
                    <FiSave className="w-3.5 h-3.5" />
                    <span>{isSavingTopics ? 'Saving...' : 'Save Question Flow'}</span>
                  </button>
                </div>
              </div>

              {/* Visual Sequence Timeline Card */}
              <div className="p-5 rounded-2xl bg-[#111113]/90 border border-white/[0.08] space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Live Question Sequence</span>
                      <span className="text-[11px] font-medium text-slate-400">
                        ({customizingTheme.name})
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Turn 1 & 2 pre-generate on resume upload • Turn 3+ interleave background follow-ups & skill MCQs.
                    </p>
                  </div>

                  {/* Compact Stat Pills */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-3 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-slate-200 font-semibold">
                      {totalQ} Total
                    </span>
                    <span className="px-3 py-1 rounded-lg bg-blue-500/10 border border-blue-500/25 text-blue-300 font-semibold">
                      {convQ} Conversational
                    </span>
                    <span className="px-3 py-1 rounded-lg bg-purple-500/10 border border-purple-500/25 text-purple-300 font-semibold">
                      {mcqQ} MCQs
                    </span>
                    <span className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 font-semibold">
                      ~{totalQ * 2}m
                    </span>
                  </div>
                </div>

                {dispersedSeq.length === 0 ? (
                  <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs font-semibold flex items-center gap-2">
                    <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>Enable at least one topic below to generate the question flow.</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 overflow-x-auto py-2">
                    {dispersedSeq.map((topicItem, idx) => {
                      const isMcq = topicItem.includes('coding_mcq');
                      const chipTitle = getFlowChipTitle(topicItem);
                      const prevOccurrences = dispersedSeq.slice(0, idx).filter((t) => t === topicItem).length;
                      const stageLabel = isMcq
                        ? 'Skill MCQ'
                        : prevOccurrences === 0
                          ? idx < 2
                            ? 'Resume Prewarm'
                            : '1st Question'
                          : 'Follow-Up';

                      return (
                        <React.Fragment key={idx}>
                          <div
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-xs whitespace-nowrap ${
                              isMcq
                                ? 'bg-purple-500/15 border-purple-500/35 text-purple-200'
                                : 'bg-white/[0.04] border-white/10 text-slate-200'
                            }`}
                          >
                            <span
                              className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                isMcq ? 'bg-purple-500/30 text-purple-100' : 'bg-white/10 text-white'
                              }`}
                            >
                              Q{idx + 1}
                            </span>
                            <div className="leading-tight">
                              <div className="font-bold">{chipTitle}</div>
                              <div className="text-[10px] text-slate-400">{stageLabel}</div>
                            </div>
                          </div>
                          {idx < dispersedSeq.length - 1 && (
                            <span className="text-slate-600 text-xs select-none">→</span>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Clean, Compact 2-Column Topic Toggle List */}
              <div className="p-5 rounded-2xl bg-[#111113]/90 border border-white/[0.08] space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">
                    Evaluation Topics & Question Counts
                  </h3>
                  <span className="text-xs text-slate-500">
                    Toggle topics on/off and set question counts (1–10)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {allTopicDefinitions.map((topicDef) => {
                    const currentTopicConfig = currentModeData.topicsConfig?.[topicDef.id] || {
                      enabled: false,
                      count: 1
                    };
                    const isEnabled = currentTopicConfig.enabled !== false && currentTopicConfig.count > 0;
                    const currentCount = currentTopicConfig.count || 1;

                    return (
                      <div
                        key={topicDef.id}
                        className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-4 ${
                          isEnabled
                            ? `bg-white/[0.04] ${customDark.cardBorder || 'border-white/20'}`
                            : 'bg-white/[0.015] border-white/[0.05] opacity-60 hover:opacity-90'
                        }`}
                      >
                        {/* Left: Toggle + Icon + Title & 1-line description */}
                        <div
                          onClick={() => handleToggleTopic(customizingMode, topicDef.id)}
                          className="flex items-center gap-3 cursor-pointer select-none min-w-0 flex-1"
                        >
                          <button
                            type="button"
                            role="switch"
                            aria-checked={isEnabled}
                            className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border transition-colors duration-200 ${
                              isEnabled
                                ? 'bg-emerald-500 border-emerald-400'
                                : 'bg-white/10 border-white/15'
                            }`}
                          >
                            <span
                              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition duration-200 mt-0.5 ${
                                isEnabled ? 'translate-x-4' : 'translate-x-0.5'
                              }`}
                            />
                          </button>

                          <TopicIcon
                            topicId={topicDef.id}
                            className={`w-4 h-4 flex-shrink-0 ${
                              isEnabled ? customDark.textAccent || 'text-white' : 'text-slate-500'
                            }`}
                          />

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold truncate ${isEnabled ? 'text-white' : 'text-slate-400'}`}>
                                {topicDef.label}
                              </span>
                              <span className="text-[10px] px-2 py-0.2 rounded bg-white/[0.06] text-slate-400 border border-white/10">
                                {topicDef.category}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                              {topicDef.description}
                            </p>
                          </div>
                        </div>

                        {/* Right: Compact Stepper */}
                        {isEnabled ? (
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => handleChangeTopicCount(customizingMode, topicDef.id, currentCount - 1)}
                              disabled={currentCount <= 1}
                              className="w-7 h-7 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white font-bold flex items-center justify-center text-xs disabled:opacity-30 cursor-pointer"
                            >
                              -
                            </button>
                            <span className="w-7 text-center text-xs font-mono font-bold text-white">
                              {currentCount}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleChangeTopicCount(customizingMode, topicDef.id, currentCount + 1)}
                              disabled={currentCount >= 10}
                              className="w-7 h-7 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white font-bold flex items-center justify-center text-xs disabled:opacity-30 cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-600 font-medium flex-shrink-0">Off</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ========================================================= */}
        {/* WORKSPACE 3: UNIFIED TALENT DIRECTORY (ROSTER + IMPORT)   */}
        {/* ========================================================= */}
        {activeSection === 'directory' && (
          <div className="bg-[#111113]/90 border border-white/[0.08] rounded-2xl p-6 space-y-5">
            {/* Directory Action Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <FiSearch className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Search by ID, Name, or Role..."
                  className="w-full pl-10 pr-4 py-2.5 bg-[#0a0a0a] border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-white/30"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setUploadResult(null);
                    setDirectoryModal('upload');
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.09] text-slate-200 border border-white/10 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <FiUpload className="w-3.5 h-3.5" />
                  <span>Import Excel</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setManualStatus('');
                    setDirectoryModal('manual');
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                    activeDark.button || 'bg-white text-black'
                  }`}
                >
                  <FiUserPlus className="w-3.5 h-3.5" />
                  <span>Add Profile</span>
                </button>

                <button
                  type="button"
                  onClick={fetchEmployees}
                  className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] text-slate-300 border border-white/10 cursor-pointer transition-colors"
                  title="Refresh Directory"
                >
                  <FiRefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Directory Table */}
            {isLoadingDirectory ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-white/40 border-t-transparent mx-auto mb-2" />
                Loading employee roster...
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="text-center py-14 border border-white/[0.06] rounded-2xl bg-[#0a0a0a]/60 space-y-3">
                <FiUsers className="w-8 h-8 text-slate-600 mx-auto" />
                <div>
                  <p className="text-sm font-bold text-slate-200">No Profiles Found</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Add a profile manually or import an Excel roster to get started.
                  </p>
                </div>
              </div>
            ) : (
              <div className="border border-white/[0.08] rounded-xl overflow-hidden bg-[#0a0a0a]/60">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm text-slate-300">
                    <thead className="bg-white/[0.03] text-slate-400 uppercase text-[11px] tracking-wider border-b border-white/[0.08] font-semibold">
                      <tr>
                        <th className="px-4 py-3">ID</th>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Role</th>
                        <th className="px-4 py-3">Work History</th>
                        <th className="px-4 py-3">Manager Notes</th>
                        <th className="px-4 py-3 text-right">Report</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06]">
                      {filteredEmployees.map((emp) => {
                        const empReport = reports.find(
                          (r) =>
                            r.employeeId === emp.id ||
                            (emp.name && r.name && r.name.toLowerCase() === emp.name.toLowerCase())
                        );

                        return (
                          <tr key={emp.id} className="hover:bg-white/[0.025] transition-colors">
                            <td className="px-4 py-3.5 font-mono font-bold text-white text-xs">{emp.id}</td>
                            <td className="px-4 py-3.5 font-semibold text-slate-100">{emp.name || '-'}</td>
                            <td className="px-4 py-3.5">
                              {emp.role ? (
                                <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-white/[0.05] text-slate-200 border border-white/10">
                                  {emp.role}
                                </span>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-xs text-slate-400 max-w-xs truncate" title={emp.hr_work_history}>
                              {emp.hr_work_history || '-'}
                            </td>
                            <td className="px-4 py-3.5 text-xs text-slate-400 max-w-xs truncate" title={emp.hr_feedback}>
                              {emp.hr_feedback || '-'}
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              {empReport ? (
                                <a
                                  href={`http://localhost:5000${empReport.downloadUrl}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/10 transition-colors"
                                >
                                  <FiFileText className="w-3.5 h-3.5" /> View PDF
                                </a>
                              ) : (
                                <span className="text-slate-600 text-xs">Pending</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* WORKSPACE 4: EVALUATION REPORTS (PDF SCORECARDS)          */}
        {/* ========================================================= */}
        {activeSection === 'reports' && (
          <div className="bg-[#111113]/90 border border-white/[0.08] rounded-2xl p-6 space-y-5">
            {/* Filter & Search Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
                <button
                  onClick={() => setReportModeFilter('all')}
                  className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap border ${
                    reportModeFilter === 'all'
                      ? 'bg-white text-[#0a0a0a] border-white'
                      : 'bg-white/[0.03] text-slate-400 hover:text-white border-white/10'
                  }`}
                >
                  All ({reportCounts.all})
                </button>
                {Object.values(MODE_THEMES).map((m) => {
                  const isActiveFilter = reportModeFilter === m.id;
                  const mDark = m.dark || {};
                  return (
                    <button
                      key={m.id}
                      onClick={() => setReportModeFilter(m.id)}
                      className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 border ${
                        isActiveFilter
                          ? `${mDark.badge || 'bg-white/15 text-white border-white/30'}`
                          : 'bg-white/[0.02] text-slate-400 hover:text-white border-white/[0.06]'
                      }`}
                    >
                      <ModeIcon mode={m.id} className="w-3.5 h-3.5" />
                      <span>
                        {m.shortTitle} ({reportCounts[m.id] || 0})
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-72">
                  <FiSearch className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={reportSearchFilter}
                    onChange={(e) => setReportSearchFilter(e.target.value)}
                    placeholder="Search reports..."
                    className="w-full pl-10 pr-3 py-2 bg-[#0a0a0a] border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-white/30"
                  />
                </div>
                <button
                  onClick={fetchReports}
                  className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] text-slate-300 border border-white/10 cursor-pointer"
                  title="Refresh Reports"
                >
                  <FiRefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Reports Table */}
            {isLoadingReports ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-white/40 border-t-transparent mx-auto mb-2" />
                Loading assessment reports...
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="text-center py-14 border border-white/[0.06] rounded-2xl bg-[#0a0a0a]/60">
                <FiFileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-200">No Reports Found</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Completed assessment PDFs will automatically appear here.
                </p>
              </div>
            ) : (
              <div className="border border-white/[0.08] rounded-xl overflow-hidden bg-[#0a0a0a]/60">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm text-slate-300">
                    <thead className="bg-white/[0.03] text-slate-400 uppercase text-[11px] tracking-wider border-b border-white/[0.08] font-semibold">
                      <tr>
                        <th className="px-4 py-3">Candidate / Employee</th>
                        <th className="px-4 py-3">Mode</th>
                        <th className="px-4 py-3">Executive Verdict</th>
                        <th className="px-4 py-3">Report File</th>
                        <th className="px-4 py-3">Generated</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06]">
                      {filteredReports.map((rep) => {
                        const repTheme = getClientModeTheme(rep.mode);
                        const repDark = repTheme.dark || {};
                        const verdictText = rep.decision || 'Evaluated';
                        const isReject = /do not|separation|pip|redundant|flag for review/i.test(verdictText);
                        const isHold = /hold|conditional|revisit|reassign|redeploy|intervention|needs development/i.test(
                          verdictText
                        );
                        const isTopTier = /strong|promote|fast-track|must retain|priority retain|exceed/i.test(
                          verdictText
                        );
                        const verdictBadgeClass = isReject
                          ? 'bg-rose-500/15 text-rose-300 border-rose-500/35'
                          : isHold
                          ? 'bg-amber-500/15 text-amber-300 border-amber-500/35'
                          : isTopTier
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
                          : 'bg-sky-500/15 text-sky-300 border-sky-500/35';

                        return (
                          <tr key={rep.filename} className="hover:bg-white/[0.025] transition-colors">
                            <td className="px-4 py-3.5">
                              <div className="font-bold text-white">{rep.name}</div>
                              <div className="text-[11px] font-mono text-slate-400">{rep.employeeId}</div>
                            </td>
                            <td className="px-4 py-3.5">
                              <span
                                className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                                  repDark.badge || 'bg-white/10 text-white border-white/20'
                                }`}
                              >
                                <ModeIcon mode={rep.mode} className="w-3 h-3" />
                                <span>{repTheme.shortTitle}</span>
                              </span>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex flex-col items-start gap-1">
                                <span
                                  className={`inline-flex items-center text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${verdictBadgeClass}`}
                                >
                                  {verdictText}
                                </span>
                                {rep.codingMcqScore && (
                                  <span className="text-[10px] font-mono text-slate-400">
                                    MCQ: {rep.codingMcqScore}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3.5 font-mono text-xs text-slate-300">
                              {rep.filename}
                            </td>
                            <td className="px-4 py-3.5 text-xs text-slate-400">
                              {rep.createdAtFormatted}
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <a
                                  href={`http://localhost:5000${rep.downloadUrl}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    repDark.button || 'bg-white text-black'
                                  }`}
                                >
                                  <FiEye className="w-3.5 h-3.5" /> View
                                </a>
                                <a
                                  href={`http://localhost:5000${rep.downloadUrl}`}
                                  download={rep.filename}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 border border-white/10 rounded-lg text-xs font-semibold transition-colors"
                                  title="Download PDF"
                                >
                                  <FiDownload className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: BULK EXCEL IMPORT                                */}
      {/* ========================================================= */}
      {directoryModal === 'upload' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[#121216] border border-white/15 rounded-2xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div>
                <h3 className="text-base font-bold text-white">Bulk Excel / CSV Import</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Import employee profiles, roles, and manager notes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDirectoryModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadExcel} className="space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  isDragOver
                    ? 'border-white/40 bg-white/[0.05]'
                    : 'border-white/15 hover:border-white/30 bg-[#0a0a0a]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <FiUpload className="w-7 h-7 text-slate-400 mx-auto mb-2.5" />
                <p className="text-xs sm:text-sm font-semibold text-white">
                  {selectedFile ? selectedFile.name : 'Click or drag & drop an .xlsx or .csv file'}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Columns: Employee ID, Employee Name, Job Role, Employee History, Personal Review
                </p>
              </div>

              <div className="flex items-center justify-between text-xs">
                <a
                  href="http://localhost:5000/api/hr/template"
                  download="Employee_HR_Import_Template.xlsx"
                  className="inline-flex items-center gap-1.5 text-slate-300 hover:text-white underline"
                >
                  <FiDownload className="w-3.5 h-3.5" /> Download Sample Excel Template
                </a>
                {selectedFile && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
                  >
                    Remove file
                  </button>
                )}
              </div>

              {uploadResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs font-semibold ${
                    uploadResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {uploadResult.message}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDirectoryModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-white/[0.05] hover:bg-white/[0.1] cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={!selectedFile || isUploading}
                  className={`px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-40 cursor-pointer ${
                    activeDark.button || 'bg-white text-black'
                  }`}
                >
                  {isUploading ? 'Importing...' : 'Upload & Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: SINGLE PROFILE ENTRY                             */}
      {/* ========================================================= */}
      {directoryModal === 'manual' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[#121216] border border-white/15 rounded-2xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div>
                <h3 className="text-base font-bold text-white">Add / Update Profile</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Save individual employee or candidate context for AI interviews.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDirectoryModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">ID *</label>
                  <input
                    type="text"
                    required
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    className="w-full p-2.5 bg-[#0a0a0a] border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-white/30"
                    placeholder="e.g. EMP-101"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2.5 bg-[#0a0a0a] border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-white/30"
                    placeholder="e.g. Jane Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Role / Position</label>
                <input
                  type="text"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full p-2.5 bg-[#0a0a0a] border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-white/30"
                  placeholder="e.g. Frontend Developer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Work History</label>
                <textarea
                  value={formData.hrWorkHistory}
                  onChange={(e) => setFormData({ ...formData, hrWorkHistory: e.target.value })}
                  className="w-full p-2.5 bg-[#0a0a0a] border border-white/10 rounded-xl h-20 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-white/30"
                  placeholder="Recent projects, key responsibilities..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Manager Review Notes</label>
                <textarea
                  value={formData.hrFeedback}
                  onChange={(e) => setFormData({ ...formData, hrFeedback: e.target.value })}
                  className="w-full p-2.5 bg-[#0a0a0a] border border-white/10 rounded-xl h-20 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-white/30"
                  placeholder="Performance insights, observations..."
                />
              </div>

              {manualStatus && (
                <div className="text-xs font-semibold text-emerald-400">{manualStatus}</div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDirectoryModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-white/[0.05] hover:bg-white/[0.1] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                    activeDark.button || 'bg-white text-black'
                  }`}
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
