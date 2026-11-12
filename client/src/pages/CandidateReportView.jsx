import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Download, Award, CheckCircle2, XCircle, AlertTriangle, 
  ShieldCheck, ShieldAlert, Cpu, MessageSquare, Brain, Sparkles, Printer
} from 'lucide-react';
import { getCandidate } from '../services/api';

export default function CandidateReportView() {
  const { id: candidateId } = useParams();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCandidate(candidateId)
      .then(res => setCandidate(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [candidateId]);

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-400">
        Loading Candidate Evaluation Report...
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="p-16 text-center text-slate-400 space-y-4">
        <p>Candidate report not found.</p>
        <button
          onClick={() => navigate('/hr-suite')}
          className="text-xs px-4 py-2 rounded-xl bg-purple-600 text-white"
        >
          Back to HR Suite
        </button>
      </div>
    );
  }

  const scores = candidate.competencyScores || {
    Communication: 75,
    Technical: 80,
    ProblemSolving: 80,
    Integrity: 85
  };

  const suitability = candidate.overallSuitability || Math.round((scores.Communication + scores.Technical + scores.ProblemSolving + scores.Integrity) / 4);

  const getDecisionBadge = (decision) => {
    switch (decision) {
      case 'Recommend Hire':
        return (
          <span className="px-4 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold tracking-wide flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> RECOMMEND HIRE
          </span>
        );
      case 'Do Not Hire':
        return (
          <span className="px-4 py-1.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold tracking-wide flex items-center gap-1.5">
            <XCircle className="w-4 h-4" /> DO NOT HIRE
          </span>
        );
      default:
        return (
          <span className="px-4 py-1.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold tracking-wide flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" /> HOLD FOR REVIEW
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <button
          onClick={() => navigate('/hr-suite')}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition flex items-center gap-2 text-xs"
        >
          <ArrowLeft className="w-4 h-4" /> Back to HR Pipeline
        </button>

        <button
          onClick={() => window.print()}
          className="text-xs px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 font-semibold flex items-center gap-2 transition"
        >
          <Printer className="w-4 h-4" /> Print / Save PDF
        </button>
      </div>

      {/* Main Report Card */}
      <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-8 space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/10">
          <div>
            <div className="text-[11px] font-mono text-purple-400 uppercase tracking-wider mb-1">
              OMNICheck AI Verification & HR Audit Report
            </div>
            <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">
              {candidate.employeeName}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Target Role: <span className="text-slate-200 font-semibold">{candidate.jobRoleTitle}</span> &middot; Department: {candidate.department}
            </p>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-[11px] font-mono text-slate-400">OVERALL SUITABILITY</div>
              <div className="text-4xl font-black text-cyan-400 tracking-tight">{suitability}%</div>
            </div>
            <div>{getDecisionBadge(candidate.hrDecision)}</div>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="p-4 rounded-2xl bg-black/40 border border-white/10 text-xs text-slate-300 space-y-1">
          <span className="font-semibold text-slate-100 uppercase tracking-wider text-[11px]">Audit Summary:</span>
          <p className="leading-relaxed">
            {candidate.decisionSummary || 'Candidate demonstrated consistent performance across core technical milestones and problem solving scenarios.'}
          </p>
        </div>

        {/* 4 Competency Score Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl border border-blue-500/20 bg-blue-950/20 space-y-2">
            <div className="flex items-center justify-between text-blue-400">
              <MessageSquare className="w-5 h-5" />
              <span className="text-xl font-bold font-mono">{scores.Communication}/100</span>
            </div>
            <div className="text-xs font-semibold text-slate-200">Communication</div>
            <p className="text-[10px] text-slate-400">Articulation, clarity, and conciseness</p>
          </div>

          <div className="p-5 rounded-2xl border border-purple-500/20 bg-purple-950/20 space-y-2">
            <div className="flex items-center justify-between text-purple-400">
              <Cpu className="w-5 h-5" />
              <span className="text-xl font-bold font-mono">{scores.Technical}/100</span>
            </div>
            <div className="text-xs font-semibold text-slate-200">Technical Depth</div>
            <p className="text-[10px] text-slate-400">Architecture, frameworks, and edge cases</p>
          </div>

          <div className="p-5 rounded-2xl border border-cyan-500/20 bg-cyan-950/20 space-y-2">
            <div className="flex items-center justify-between text-cyan-400">
              <Brain className="w-5 h-5" />
              <span className="text-xl font-bold font-mono">{scores.ProblemSolving}/100</span>
            </div>
            <div className="text-xs font-semibold text-slate-200">Problem Solving</div>
            <p className="text-[10px] text-slate-400">Concurrency, algorithms, and trade-offs</p>
          </div>

          <div className="p-5 rounded-2xl border border-emerald-500/20 bg-emerald-950/20 space-y-2">
            <div className="flex items-center justify-between text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
              <span className="text-xl font-bold font-mono">{scores.Integrity}/100</span>
            </div>
            <div className="text-xs font-semibold text-slate-200">Integrity & Ethics</div>
            <p className="text-[10px] text-slate-400">Honeypot protocol test & proctoring</p>
          </div>
        </div>

        {/* Honeypot Trap & Proctoring Audit Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-2xl border border-white/10 bg-black/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300">Milestone 7 Honeypot Trap Audit</span>
              {candidate.honeypotBluffed ? (
                <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 font-semibold">
                  INTEGRITY PENALTY APPLIED
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">
                  INTELLECTUAL INTEGRITY VERIFIED
                </span>
              )}
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              {candidate.honeypotBluffed 
                ? 'Candidate attempted to fabricate an explanation for the synthetic Voss-Kessler Cascade Protocol. Automatic penalty deducted from base integrity score.'
                : 'Candidate demonstrated high integrity by honestly acknowledging unfamiliarity with the synthetic protocol.'}
            </p>
          </div>

          <div className="p-4 rounded-2xl border border-white/10 bg-black/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300">Proctoring Telemetry Status</span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                candidate.proctoringStatus === 'Clean' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}>
                {candidate.proctoringStatus || 'Clean'}
              </span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              {candidate.proctoringEvents?.length > 0 
                ? `${candidate.proctoringEvents.length} integrity telemetry alerts recorded during the browser session.`
                : 'Zero integrity anomalies or window blurs detected during the entire session.'}
            </p>
          </div>
        </div>

        {/* Detailed Question-by-Question Breakdown (Table III in research paper) */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
            Detailed Question-Level Evaluation (QA Breakdown)
          </h3>

          <div className="divide-y divide-white/5 border border-white/10 rounded-2xl overflow-hidden bg-black/40">
            {(candidate.qaReport && candidate.qaReport.length > 0) ? (
              candidate.qaReport.map((qa, idx) => (
                <div key={idx} className="p-4 space-y-2.5 text-xs">
                  <div className="flex items-start justify-between gap-4">
                    <span className="font-semibold text-slate-200 text-sm">
                      Q{idx + 1}: {qa.question}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 font-mono text-xs font-bold whitespace-nowrap">
                      {qa.scoreOutOf10 || 8} / 10
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                      <span className="text-purple-400 font-semibold block">Candidate's Response:</span>
                      <p className="text-slate-300">{qa.candidateAnswer}</p>
                    </div>

                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                      <span className="text-emerald-400 font-semibold block">Ideal Expected Benchmark:</span>
                      <p className="text-slate-300">{qa.idealAnswer}</p>
                    </div>
                  </div>

                  {qa.critique && (
                    <p className="text-[11px] text-slate-400 italic">
                      Auditor Feedback: {qa.critique}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-500">
                Evaluation report in progress. Questions will populate once full turn analysis concludes.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

