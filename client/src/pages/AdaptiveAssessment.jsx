import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getClientModeTheme } from '../data/modeThemes';
import ModeIcon from '../components/ui/ModeIcon';
import ThoughtLine from './ThoughtLine';
import { FiCheckCircle, FiFileText, FiCode, FiCopy, FiCheck, FiRefreshCw } from 'react-icons/fi';

const EVALUATION_STAGES = [
  {
    id: 1,
    title: 'Locking Assessment Transcript & Responses',
    sub: 'Persisting final turn answers into encrypted session record'
  },
  {
    id: 2,
    title: 'Verifying Code Snippet MCQ Outputs',
    sub: 'Executing runtime verification and grading output accuracy'
  },
  {
    id: 3,
    title: 'Benchmarking Role Competencies via Gemini AI',
    sub: 'Cross-referencing interview evidence against role skills & resume'
  },
  {
    id: 4,
    title: 'Compiling Executive PDF Scorecard',
    sub: 'Formatting multi-section PDF report for HR Console'
  }
];

export default function AdaptiveAssessment({
  assessmentId,
  employeeId,
  name,
  role,
  roleSkills,
  initialQuestion,
  mode = 'retention',
  onReset
}) {
  const [currentQuestion, setCurrentQuestion] = useState(initialQuestion?.question || '');
  const [questionType, setQuestionType] = useState(initialQuestion?.type || 'open_ended');
  const [codeSnippet, setCodeSnippet] = useState(initialQuestion?.codeSnippet || '');
  const [codeLanguage, setCodeLanguage] = useState(initialQuestion?.language || 'javascript');
  const [options, setOptions] = useState(initialQuestion?.options || []);
  const [selectedOption, setSelectedOption] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const [topic, setTopic] = useState(initialQuestion?.topic || '');
  const [answer, setAnswer] = useState('');
  const [progress, setProgress] = useState({
    turn: initialQuestion?.question ? 1 : 0,
    total: initialQuestion?.totalTurns || 8
  });
  const [status, setStatus] = useState('idle');
  const [reportFile, setReportFile] = useState(null);
  const [executiveDecision, setExecutiveDecision] = useState(null);
  const [codingMcqScore, setCodingMcqScore] = useState(null);
  const [evalStageIndex, setEvalStageIndex] = useState(0);
  const [evalErrorMsg, setEvalErrorMsg] = useState(null);

  const theme = getClientModeTheme(mode);
  const dark = theme.dark || {};
  const isStreaming = status === 'loading' || status === 'evaluating';

  // Animate through the 4 report generation stages while status === 'evaluating'
  useEffect(() => {
    if (status !== 'evaluating') return undefined;
    setEvalStageIndex(0);
    const interval = setInterval(() => {
      setEvalStageIndex((prev) => (prev < EVALUATION_STAGES.length - 1 ? prev + 1 : prev));
    }, 1600);
    return () => clearInterval(interval);
  }, [status]);

  const startAssessmentWithInitial = () => {
    if (initialQuestion?.question) {
      setCurrentQuestion(initialQuestion.question);
      setQuestionType(initialQuestion.type || 'open_ended');
      setCodeSnippet(initialQuestion.codeSnippet || '');
      setCodeLanguage(initialQuestion.language || 'javascript');
      setOptions(initialQuestion.options || []);
      setSelectedOption(null);
      setTopic(initialQuestion.topic);
      setProgress({ turn: 1, total: initialQuestion.totalTurns || 8 });
    } else {
      fetchNextQuestion();
    }
  };

  const runEvaluationReport = async () => {
    setStatus('evaluating');
    setEvalErrorMsg(null);
    let lastErr = null;

    // Up to 2 automatic attempts in case of transient network / burst delay
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const evalRes = await axios.post('http://localhost:5000/api/assessment/evaluate', {
          assessmentId,
          mode
        });
        setEvalStageIndex(EVALUATION_STAGES.length - 1);
        setReportFile(evalRes.data.reportFile);
        setExecutiveDecision(
          evalRes.data.executiveDecision ||
            evalRes.data.metrics?.executiveDecision ||
            evalRes.data.metrics?.hiringRecommendation?.decision ||
            evalRes.data.metrics?.performanceRating?.rating ||
            evalRes.data.metrics?.retentionPriority?.priority ||
            evalRes.data.metrics?.retentionDecision?.decision ||
            null
        );
        setCodingMcqScore(evalRes.data.metrics?.codingMcqScore || null);
        setStatus('complete');
        return;
      } catch (err) {
        lastErr = err;
        console.warn(`Evaluation attempt #${attempt} warning:`, err.message);
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 1200));
        }
      }
    }

    setEvalErrorMsg(
      lastErr?.response?.data?.error ||
        'Report generation took longer than expected. Click below to retry generating your PDF.'
    );
    setStatus('eval_error');
  };

  const fetchNextQuestion = async () => {
    const currentAnswer = answer;
    const isFinalTurn = progress.turn >= progress.total && progress.total > 0;

    // Immediately show the dedicated Report Generation Waiting Page when submitting the final turn
    if (isFinalTurn) {
      setStatus('evaluating');
      setEvalErrorMsg(null);
    } else {
      setStatus('loading');
    }

    try {
      const payload = {
        assessmentId,
        previousAnswer: currentAnswer,
        roleSkills,
        mode
      };

      const res = await axios.post('http://localhost:5000/api/assessment/next-question', payload);

      if (res.data.status === 'complete') {
        await runEvaluationReport();
      } else {
        setCurrentQuestion(res.data.question);
        setQuestionType(res.data.type || 'open_ended');
        setCodeSnippet(res.data.codeSnippet || '');
        setCodeLanguage(res.data.language || 'javascript');
        setOptions(res.data.options || []);
        setSelectedOption(null);
        setTopic(res.data.topic);
        setProgress({ turn: res.data.turn, total: res.data.totalTurns });
        setAnswer('');
        setStatus('idle');
      }
    } catch (err) {
      console.error('Error fetching question:', err);
      if (isFinalTurn) {
        // Even if next-question had a hiccup on final turn, attempt report generation
        await runEvaluationReport();
      } else {
        setStatus('idle');
        alert(err.response?.data?.error || 'Error fetching question. Please try again.');
      }
    }
  };

  const handleSelectOption = (opt) => {
    setSelectedOption(opt.id);
    setAnswer(`Option ${opt.id}: ${opt.text}`);
  };

  const handleCopyCode = () => {
    if (codeSnippet) {
      navigator.clipboard.writeText(codeSnippet);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  // =========================================================
  // VIEW: DEDICATED REPORT GENERATION WAITING PAGE
  // =========================================================
  if (status === 'evaluating' || status === 'eval_error') {
    const evalPercent =
      status === 'eval_error'
        ? 90
        : Math.min(96, Math.round(((evalStageIndex + 1) / EVALUATION_STAGES.length) * 95));

    return (
      <div className="relative py-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Ambient Mode Radial Glow */}
        <div
          className="pointer-events-none absolute -top-28 left-1/2 -translate-x-1/2 w-[48rem] h-[24rem] rounded-full blur-3xl opacity-55 transition-all duration-700"
          style={{
            background: `radial-gradient(ellipse at center, ${dark.glow || 'rgba(168,85,247,0.16)'} 0%, transparent 70%)`
          }}
        />

        <div
          className={`relative z-10 max-w-xl mx-auto p-7 sm:p-8 bg-[#111113]/95 border ${dark.cardBorder} rounded-2xl shadow-2xl animate-fadeIn`}
        >
          {/* Header Spinner / Icon */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="relative mb-4">
              {status === 'evaluating' && (
                <div
                  className={`absolute -inset-2 rounded-full border-2 ${dark.spinner || 'border-emerald-400'} border-t-transparent animate-spin`}
                />
              )}
              <div
                className={`w-16 h-16 ${dark.badge} rounded-full flex items-center justify-center border shadow-lg`}
              >
                <ModeIcon mode={mode} className="w-8 h-8" />
              </div>
            </div>

            <span className={`px-3 py-0.5 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider border mb-2.5 ${dark.badge}`}>
              {status === 'evaluating' ? 'Finalizing Assessment Report' : 'Report Synthesis Paused'}
            </span>

            <h2 className="text-2xl font-bold text-white mb-1.5">
              {status === 'evaluating'
                ? 'Generating Your Executive PDF Report…'
                : 'Ready to Finalize Your Report'}
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm max-w-md">
              {status === 'evaluating'
                ? `All ${progress.total} responses for ${name} have been recorded. Please wait a few seconds while NEX AI compiles your verified scorecard.`
                : evalErrorMsg}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-5">
            <div className="flex justify-between items-center text-xs font-mono mb-2">
              <span className="text-slate-400 uppercase tracking-wider">
                {status === 'evaluating' ? theme.evaluatingText || 'Synthesizing Evaluation Metrics…' : 'Awaiting Retry'}
              </span>
              <span className="text-white font-bold">{evalPercent}%</span>
            </div>
            <div className="w-full bg-white/[0.08] rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-700 ${dark.progressFill}`}
                style={{ width: `${evalPercent}%` }}
              />
            </div>
          </div>

          {/* Live ThoughtLine Trace */}
          {status === 'evaluating' && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-[#0a0a0a] border border-white/10">
              <ThoughtLine
                working={true}
                steps={[
                  'Auditing interview transcript',
                  'Executing code snippet output verification',
                  'Benchmarking role competencies',
                  'Rendering executive PDF report'
                ]}
                label="Compiling Report…"
                doneLabel="Compiled in"
                glyph="sparkle"
                fontSize={15}
                breathPeriod={1.5}
                breathDepth={0.45}
                showTimer
                color="#f8fafc"
                glyphColor={dark.accentHex}
              />
            </div>
          )}

          {/* 4-Stage Pipeline Checklist */}
          <div className="bg-[#0a0a0a] p-4 sm:p-5 rounded-xl border border-white/10 space-y-3 mb-6">
            {EVALUATION_STAGES.map((stage, idx) => {
              const isDone = idx < evalStageIndex && status === 'evaluating';
              const isCurrent = idx === evalStageIndex && status === 'evaluating';
              return (
                <div
                  key={stage.id}
                  className={`flex items-start gap-3 p-2.5 rounded-lg transition-all ${
                    isCurrent
                      ? 'bg-white/[0.05] border border-white/15'
                      : isDone
                      ? 'opacity-90'
                      : 'opacity-45'
                  }`}
                >
                  <div className="mt-0.5 flex-shrink-0">
                    {isDone ? (
                      <FiCheckCircle className="w-4 h-4 text-emerald-400" />
                    ) : isCurrent ? (
                      <div
                        className={`w-4 h-4 rounded-full border-2 ${dark.spinner || 'border-white'} border-t-transparent animate-spin`}
                      />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-white/25 flex items-center justify-center text-[9px] font-mono text-slate-400">
                        {stage.id}
                      </div>
                    )}
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-white leading-snug">{stage.title}</div>
                    <div className="text-[11px] text-slate-400 leading-snug mt-0.5">{stage.sub}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {status === 'eval_error' && (
            <button
              type="button"
              onClick={runEvaluationReport}
              className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-2 ${dark.button}`}
            >
              <FiRefreshCw className="w-4 h-4" />
              <span>Retry Report Generation</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // =========================================================
  // VIEW: ASSESSMENT COMPLETED STATE
  // =========================================================
  if (status === 'complete') {
    return (
      <div className="relative py-12 px-4 sm:px-6 lg:px-8">
        <div
          className={`max-w-xl mx-auto p-8 text-center bg-[#111113]/95 border ${dark.cardBorder} rounded-2xl shadow-2xl animate-fadeIn`}
        >
          <div
            className={`w-16 h-16 ${dark.badge} rounded-full flex items-center justify-center mx-auto mb-5 border shadow-lg`}
          >
            <ModeIcon mode={mode} className="w-8 h-8" />
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">
            {theme.completedTitle}
          </h2>
          <p className="text-slate-400 mb-6 text-sm">
            Thank you, <span className="font-semibold text-white">{name}</span>! {theme.completedSubtitle}
          </p>

          <div className="bg-[#0a0a0a] p-5 rounded-xl border border-white/10 text-left space-y-3 mb-6">
            <div className="flex justify-between items-center text-xs border-b border-white/[0.08] pb-2.5">
              <span className="text-slate-400 font-medium">Assessment Mode</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${dark.badge}`}>
                {theme.badge}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs border-b border-white/[0.08] pb-2.5">
              <span className="text-slate-400 font-medium">Session ID</span>
              <span className="font-mono text-slate-200 font-semibold">
                {assessmentId ? assessmentId.slice(0, 13) + '...' : 'Complete'}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs border-b border-white/[0.08] pb-2.5">
              <span className="text-slate-400 font-medium">Participant Name & ID</span>
              <span className="text-slate-200 font-semibold">
                {name} {employeeId ? `(${employeeId})` : ''}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs border-b border-white/[0.08] pb-2.5">
              <span className="text-slate-400 font-medium">Target Role</span>
              <span className="font-semibold text-white">{role || 'General Competency'}</span>
            </div>
            {executiveDecision && (
              <div className="flex justify-between items-center text-xs border-b border-white/[0.08] pb-2.5">
                <span className="text-slate-400 font-medium">Executive Verdict</span>
                <span
                  className={`font-bold px-2.5 py-0.5 rounded-full text-[11px] border ${
                    /do not|separation|pip|redundant|flag for review/i.test(executiveDecision)
                      ? 'bg-rose-500/15 text-rose-300 border-rose-500/35'
                      : /hold|conditional|revisit|reassign|redeploy|intervention|needs development/i.test(
                          executiveDecision
                        )
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/35'
                      : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
                  }`}
                >
                  {executiveDecision}
                </span>
              </div>
            )}
            {codingMcqScore && (
              <div className="flex justify-between items-center text-xs border-b border-white/[0.08] pb-2.5">
                <span className="text-slate-400 font-medium">Coding MCQ Output Score</span>
                <span className="font-mono font-bold text-slate-200">{codingMcqScore}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-medium">Report Status</span>
              <span className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-medium px-2.5 py-0.5 rounded-full text-[11px] flex items-center gap-1.5">
                <FiCheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Generated & {theme.completedDestination}</span>
              </span>
            </div>
          </div>

          {reportFile && (
            <div className="mb-6 p-3.5 bg-[#0a0a0a] rounded-xl border border-white/10 flex items-center justify-between text-xs">
              <span className="text-slate-300 truncate max-w-xs font-mono flex items-center gap-2">
                <FiFileText className={`w-4 h-4 ${dark.textAccent} flex-shrink-0`} />
                <span className="truncate">{reportFile}</span>
              </span>
              <a
                href={`http://localhost:5000/api/reports/${encodeURIComponent(reportFile)}`}
                target="_blank"
                rel="noreferrer"
                className={`font-semibold underline ${dark.textAccent}`}
              >
                View PDF
              </a>
            </div>
          )}

          <button
            onClick={() => {
              if (onReset) onReset();
              else window.location.reload();
            }}
            className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${dark.button}`}
          >
            Return to Portal
          </button>
        </div>
      </div>
    );
  }

  // =========================================================
  // VIEW: ASSESSMENT TURN 0 OR IN-PROGRESS QUESTION SCREEN
  // =========================================================
  return (
    <div className="relative py-8 sm:py-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Ambient Mode Radial Glow */}
      <div
        className="pointer-events-none absolute -top-28 left-1/2 -translate-x-1/2 w-[48rem] h-[24rem] rounded-full blur-3xl opacity-55 transition-all duration-700"
        style={{
          background: `radial-gradient(ellipse at center, ${dark.glow || 'rgba(168,85,247,0.16)'} 0%, transparent 70%)`
        }}
      />

      <div
        className={`relative z-10 max-w-2xl mx-auto bg-[#111113]/95 backdrop-blur-xl p-6 sm:p-8 rounded-2xl shadow-2xl border ${dark.cardBorder} transition-all`}
      >
        {progress.turn === 0 ? (
          <div className="text-center py-6">
            <div className={`inline-block p-3.5 ${dark.badge} border rounded-full mb-3`}>
              <ModeIcon mode={mode} className="w-6 h-6" />
            </div>
            <div className="mb-2">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border mb-2 ${dark.badge}`}>
                {theme.badge}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Ready to begin, {name}?</h2>
            <p className="text-slate-400 mb-5">
              Position: <span className="font-semibold text-white">{role}</span>
            </p>

            {/* ThoughtLine Reasoning Trace Component */}
            <div className="max-w-md mx-auto mb-6 p-4 rounded-xl bg-[#0a0a0a] border border-white/10 text-left">
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

            {roleSkills && roleSkills.length > 0 && (
              <div className="max-w-md mx-auto mb-6 bg-[#0a0a0a] p-4 rounded-xl border border-white/10 text-left">
                <span className="text-xs font-bold text-slate-400 uppercase block mb-2">
                  Benchmarked Competencies:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {roleSkills.map((skill, i) => (
                    <span
                      key={i}
                      className="text-xs bg-[#141417] text-slate-200 px-2.5 py-1 rounded-lg border border-white/10 font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className={`max-w-md mx-auto p-3.5 mb-6 rounded-xl text-xs border ${dark.badge}`}>
              {theme.notice}
              <span className="block mt-1 font-semibold">
                Includes 2 practical code snippet output MCQs testing hands-on technical proficiency.
              </span>
            </div>

            <button
              onClick={startAssessmentWithInitial}
              disabled={status !== 'idle'}
              className={`px-8 py-3.5 rounded-xl font-bold transition-all shadow-sm cursor-pointer ${dark.button}`}
            >
              {status === 'loading' ? 'Generating first question...' : 'Begin Questions'}
            </button>
          </div>
        ) : (
          // =========================================================
          // VIEW: IN-PROGRESS ADAPTIVE QUESTION SCREEN
          // =========================================================
          <div className="flex flex-col min-h-[68vh]">
            {/* Top Progress & Topic Header */}
            <div className="mb-5 pb-4 border-b border-white/[0.08]">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border flex items-center gap-1.5 ${dark.pill}`}
                  >
                    {questionType === 'mcq' ? (
                      <>
                        <FiCode className="w-3.5 h-3.5" />
                        <span>Coding Output MCQ</span>
                      </>
                    ) : (
                      <span>Topic: {topic.replace(/_/g, ' ')}</span>
                    )}
                  </span>
                  <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                    ({theme.shortTitle} Mode)
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-slate-300">
                  Question {progress.turn} of {progress.total}
                </span>
              </div>

              {/* Visual Progress Bar */}
              <div className="w-full bg-white/[0.08] rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${dark.progressFill}`}
                  style={{ width: `${(progress.turn / progress.total) * 100}%` }}
                />
              </div>
            </div>

            {/* ThoughtLine Reasoning Trace Header */}
            <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-[#0a0a0a]/90 border border-white/[0.08]">
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
                color="#e2e8f0"
                glyphColor={dark.accentHex}
                onSettle={(seconds) => console.log(`thought for ${seconds}s`)}
              />
            </div>

            {/* Question Text Prompt */}
            <div className={`p-4.5 bg-[#0a0a0a] rounded-xl border ${dark.borderAccent} mb-4`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[11px] font-mono font-bold uppercase tracking-wider ${dark.textAccent}`}>
                  {questionType === 'mcq' ? 'Code Comprehension Challenge' : 'Interviewer Question'}
                </span>
                {questionType === 'mcq' && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border ${dark.badge}`}>
                    Select One Option
                  </span>
                )}
              </div>
              <p className="text-base font-semibold text-white leading-relaxed">
                {currentQuestion}
              </p>
            </div>

            {/* =================================================== */}
            {/* RENDER CODING MCQ SNIPPET & OPTIONS                 */}
            {/* =================================================== */}
            {questionType === 'mcq' ? (
              <div className="space-y-4 mb-4">
                {/* Code Snippet Box */}
                {codeSnippet && (
                  <div className="rounded-xl overflow-hidden border border-white/15 bg-[#060608] shadow-xl">
                    {/* Terminal Header Bar */}
                    <div className="flex items-center justify-between px-4 py-2.5 bg-[#0d0d10] border-b border-white/10 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                        </div>
                        <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold ml-2">
                          {codeLanguage}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyCode}
                        className="text-[11px] text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 font-mono"
                      >
                        {copiedCode ? (
                          <>
                            <FiCheck className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <FiCopy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Code Editor Body */}
                    <pre className="p-4 text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed select-text">
                      <code>{codeSnippet}</code>
                    </pre>
                  </div>
                )}

                {/* Multiple Choice Options Grid */}
                <div className="space-y-2.5">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Select Expected Output / Return Value:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {(options || []).map((opt) => {
                      const isSelected = selectedOption === opt.id;
                      return (
                        <div
                          key={opt.id}
                          onClick={() => handleSelectOption(opt)}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                            isSelected
                              ? `${dark.badge} shadow-md`
                              : 'border-white/10 bg-[#0a0a0a] hover:bg-white/[0.04] hover:border-white/25'
                          }`}
                        >
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                              isSelected
                                ? dark.button
                                : 'bg-[#141417] text-slate-300 border border-white/15'
                            }`}
                          >
                            {opt.id}
                          </span>
                          <div className="font-mono text-xs text-slate-100 font-medium pt-0.5 break-all">
                            {opt.text}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              // ===================================================
              // RENDER CONVERSATIONAL TEXTAREA                     //
              // ===================================================
              <div className="flex-1 overflow-y-auto pr-1 mb-4">
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Provide a specific, evidence-based response referring to your real projects, tools, or decisions..."
                  className={`w-full p-4 border border-white/15 rounded-xl h-44 resize-none bg-[#0a0a0a] text-slate-100 placeholder-slate-500 text-sm leading-relaxed focus:outline-none transition-all ${dark.focusRing}`}
                  disabled={status !== 'idle'}
                />
              </div>
            )}

            {/* Evaluating / Loading Notice */}
            <div className="pt-2 mt-auto">
              {status === 'evaluating' && (
                <div className={`flex items-center gap-3 p-3.5 mb-3 border rounded-xl text-xs animate-pulse ${dark.badge}`}>
                  <div className={`animate-spin rounded-full h-4 w-4 border-2 ${dark.spinner} border-t-transparent flex-shrink-0`} />
                  <span className="font-semibold">{theme.evaluatingText}</span>
                </div>
              )}

              <button
                onClick={fetchNextQuestion}
                disabled={(questionType === 'mcq' ? !selectedOption : !answer.trim()) || status !== 'idle'}
                className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${dark.button} disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {status === 'loading'
                  ? 'Processing Response...'
                  : status === 'evaluating'
                  ? 'Generating Comprehensive Report...'
                  : questionType === 'mcq'
                  ? selectedOption
                    ? `Submit Answer (Option ${selectedOption}) & Proceed`
                    : 'Select an Option above to Proceed'
                  : progress.turn >= progress.total
                  ? 'Submit & Conclude Assessment'
                  : 'Submit Answer & Proceed'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
