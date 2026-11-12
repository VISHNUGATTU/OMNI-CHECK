import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Upload, FileText, Globe, Play, CheckCircle2, 
  XCircle, AlertTriangle, HelpCircle, ArrowRight, Layers, FileCode, Clock, RefreshCw
} from 'lucide-react';
import { startInvestigation, getInvestigations, getInvestigation } from '../services/api';
import EvidenceGraphVisualizer from '../components/compliance/EvidenceGraphVisualizer';

const SAMPLE_POLICIES = {
  finance: {
    title: 'Financial & Procurement Policy',
    objective: 'Audit vendor invoices and expense claims for unauthorized amounts, missing receipts, and duplicate billings.',
    rulebook: `1. All transaction expenses above 10,000 USD require written manager approval.
2. Invoices must have an attached official tax receipt (severity: high).
3. Any expense reimbursement claim submitted older than 60 days must be rejected.
4. Payments must match the billed purchase order total exactly.`
  },
  security: {
    title: 'Cloud IT & Cyber Security Policy',
    objective: 'Audit production cloud server infrastructure, access controls, and encryption standards.',
    rulebook: `1. Database servers storing customer data must not be publicly accessible (severity: critical).
2. SSH administrative access must be restricted to internal VPN IP ranges.
3. Backup archives must be encrypted at rest.
4. Security audits must be conducted within 90 days of release.`
  },
  hr: {
    title: 'Workforce & Integrity Policy',
    objective: 'Verify candidate identity credentials, academic documentation, and background disclosures.',
    rulebook: `1. All enrolled candidates must submit a verified government ID document.
2. Previous employment dates on resume must match verified background check records.
3. Any candidate who bluffs or misrepresents technical protocols must receive an integrity penalty.`
  }
};

export default function ComplianceInvestigation() {
  const [objective, setObjective] = useState(SAMPLE_POLICIES.finance.objective);
  const [rulebookText, setRulebookText] = useState(SAMPLE_POLICIES.finance.rulebook);
  const [urls, setUrls] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeStage, setActiveStage] = useState(0);
  const [currentResult, setCurrentResult] = useState(null);
  const [pastInvestigations, setPastInvestigations] = useState([]);
  const [selectedTab, setSelectedTab] = useState('overview'); // overview | rules | graph | facts

  // Load past investigations
  useEffect(() => {
    loadInvestigations();
  }, []);

  const loadInvestigations = async () => {
    try {
      const res = await getInvestigations();
      if (Array.isArray(res.data)) {
        setPastInvestigations(res.data);
      }
    } catch (e) {
      console.warn('Could not load past investigations:', e.message);
    }
  };

  const handleApplySample = (key) => {
    const sample = SAMPLE_POLICIES[key];
    if (sample) {
      setObjective(sample.objective);
      setRulebookText(sample.rulebook);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleStartInvestigation = async () => {
    if (!objective.trim()) {
      alert('Please specify an investigation objective.');
      return;
    }

    setIsProcessing(true);
    setActiveStage(1);
    setCurrentResult(null);

    // Simulated progress stage updates
    const t1 = setTimeout(() => setActiveStage(2), 1200);
    const t2 = setTimeout(() => setActiveStage(3), 2500);

    const formData = new FormData();
    formData.append('objective', objective);
    formData.append('rulebookText', rulebookText);
    if (urls) formData.append('urls', urls);

    selectedFiles.forEach(file => {
      formData.append('documents', file);
    });

    try {
      const res = await startInvestigation(formData);
      clearTimeout(t1);
      clearTimeout(t2);
      setActiveStage(4);

      if (res.data?.investigation) {
        setCurrentResult(res.data.investigation);
        loadInvestigations();
      }
    } catch (err) {
      alert('Investigation failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'compliant':
        return (
          <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> FULLY COMPLIANT
          </span>
        );
      case 'violation':
        return (
          <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5">
            <XCircle className="w-4 h-4" /> VIOLATION DETECTED
          </span>
        );
      case 'indeterminate':
        return (
          <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4" /> INDETERMINATE (INSUFFICIENT EVIDENCE)
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs font-semibold flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" /> HUMAN REVIEW REQUIRED
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
                Module 1: Document Compliance & Investigation Kernel
              </h1>
              <p className="text-xs text-slate-400">
                Natural-Language Policy Compiler &middot; Deterministic 3-Valued Kleene Rule Engine &middot; W3C PROV-O Evidence Graph
              </p>
            </div>
          </div>
        </div>

        {/* Quick Sample Policy Pills */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Quick Templates:</span>
          {Object.entries(SAMPLE_POLICIES).map(([k, v]) => (
            <button
              key={k}
              onClick={() => handleApplySample(k)}
              className="text-xs px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition"
            >
              {v.title.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Input Form (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-5">
            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              1. Investigation Objective
            </h2>
            <textarea
              rows={3}
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="e.g. Audit financial invoices and reimbursement receipts..."
              className="w-full text-xs bg-black/40 border border-white/10 rounded-xl p-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
            />

            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <FileCode className="w-4 h-4 text-purple-400" />
              2. Natural-Language Policy / Rulebook
            </h2>
            <textarea
              rows={6}
              value={rulebookText}
              onChange={(e) => setRulebookText(e.target.value)}
              placeholder="Paste natural-language compliance rules..."
              className="w-full text-xs font-mono bg-black/40 border border-white/10 rounded-xl p-3 text-slate-300 placeholder-slate-600 focus:outline-none focus:border-purple-500/50"
            />

            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-400" />
              3. Target Documents (PDF, DOCX, XLSX, TXT)
            </h2>
            <div className="border border-dashed border-white/15 rounded-xl p-4 text-center hover:border-cyan-500/40 transition cursor-pointer relative bg-black/20">
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <FileText className="w-6 h-6 mx-auto mb-2 text-slate-400" />
              <p className="text-xs text-slate-300 font-medium">Click to upload audit files</p>
              <p className="text-[10px] text-slate-500 mt-1">
                {selectedFiles.length > 0 
                  ? `${selectedFiles.length} file(s) attached: ${selectedFiles.map(f => f.name).join(', ')}`
                  : 'Up to 10 files (PDF, DOCX, XLSX, CSV, TXT)'}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-400" /> External Reference URLs (comma separated)
              </label>
              <input
                type="text"
                value={urls}
                onChange={(e) => setUrls(e.target.value)}
                placeholder="https://example.com/vendor-guidelines"
                className="w-full text-xs bg-black/40 border border-white/10 rounded-xl p-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            <button
              onClick={handleStartInvestigation}
              disabled={isProcessing}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-semibold tracking-wide flex items-center justify-center gap-2 hover:opacity-95 transition disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Running Stage {activeStage}/4...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  Launch Investigation Kernel
                </>
              )}
            </button>
          </div>

          {/* Past Investigations Mini Drawer */}
          {pastInvestigations.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Past Investigations</h3>
              <div className="divide-y divide-white/5 max-h-48 overflow-y-auto">
                {pastInvestigations.slice(0, 5).map(inv => (
                  <div
                    key={inv._id || inv.id}
                    onClick={() => setCurrentResult(inv)}
                    className="py-2 px-1 hover:bg-white/5 cursor-pointer flex items-center justify-between text-xs transition rounded"
                  >
                    <span className="truncate max-w-[200px] text-slate-300 font-medium">{inv.objective}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {inv.ruleEngineResult?.status || 'Done'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Execution Output & Tabs (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Active Processing Pipeline Indicator */}
          {isProcessing && (
            <div className="p-6 rounded-2xl border border-cyan-500/30 bg-cyan-950/20 space-y-4 animate-pulse">
              <h3 className="text-sm font-semibold text-cyan-300 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                Executing Asynchronous Audit Kernel
              </h3>
              <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                <div className={`p-2 rounded-lg border ${activeStage >= 1 ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200' : 'border-white/10 text-slate-500'}`}>
                  1. Document Extraction
                </div>
                <div className={`p-2 rounded-lg border ${activeStage >= 2 ? 'border-purple-400 bg-purple-500/20 text-purple-200' : 'border-white/10 text-slate-500'}`}>
                  2. Policy Compiler
                </div>
                <div className={`p-2 rounded-lg border ${activeStage >= 3 ? 'border-blue-400 bg-blue-500/20 text-blue-200' : 'border-white/10 text-slate-500'}`}>
                  3. 3-Valued Kleene Engine
                </div>
                <div className={`p-2 rounded-lg border ${activeStage >= 4 ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200' : 'border-white/10 text-slate-500'}`}>
                  4. Evidence Graph
                </div>
              </div>
            </div>
          )}

          {currentResult ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-6">
              {/* Verdict Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div>
                  <div className="text-[11px] font-mono text-slate-400">AUDIT VERDICT</div>
                  <div className="mt-1">{getStatusBadge(currentResult.ruleEngineResult?.status)}</div>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
                  <div>
                    <span className="text-slate-500">Score:</span>{' '}
                    <span className="text-slate-200 font-bold">{currentResult.ruleEngineResult?.complianceScore || 0}%</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Latency:</span>{' '}
                    <span className="text-slate-200 font-bold">{currentResult.metrics?.latencyMs || 0}ms</span>
                  </div>
                </div>
              </div>

              {/* Rationale Summary */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-slate-300">
                <p className="font-semibold text-slate-200 mb-1">Executive Summary:</p>
                {currentResult.ruleEngineResult?.summary || 'Evaluation concluded.'}
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                {[
                  { id: 'overview', label: 'Evaluation Matrix' },
                  { id: 'rules', label: `Compiled Rules (${currentResult.compiledRules?.length || 0})` },
                  { id: 'graph', label: 'Evidence Graph (W3C PROV-O)' },
                  { id: 'facts', label: 'Extracted Facts' }
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTab(t.id)}
                    className={`text-xs px-3 py-1.5 rounded-lg transition font-medium ${
                      selectedTab === t.id 
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Tab 1: Evaluation Matrix */}
              {selectedTab === 'overview' && (
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Deterministic 3-Valued Kleene Evaluation
                  </h4>
                  <div className="divide-y divide-white/5 border border-white/10 rounded-xl overflow-hidden bg-black/40">
                    {(currentResult.ruleEngineResult?.ruleEvaluations || []).map((ev, i) => (
                      <div key={i} className="p-3.5 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-cyan-400 font-semibold">{ev.ruleId}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            ev.verdict === 'compliant' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                            ev.verdict === 'violation' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                            'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}>
                            {ev.verdict}
                          </span>
                        </div>
                        <p className="text-slate-300 font-sans">{ev.sourceText}</p>
                        <p className="text-[11px] text-slate-400 font-mono bg-white/[0.02] p-2 rounded">
                          {ev.rationale}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 2: Compiled Rules */}
              {selectedTab === 'rules' && (
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Policy Compiler Schema: r = (t, e, c, &tau;, q, x, a, &gamma;, s)
                  </h4>
                  <div className="space-y-3">
                    {(currentResult.compiledRules || []).map((rule, idx) => (
                      <div key={idx} className="p-4 rounded-xl border border-white/10 bg-black/40 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono text-[10px]">
                            {rule.rule_type} : {rule.entity}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            Confidence: {Math.round((rule.confidence || 0.8) * 100)}%
                          </span>
                        </div>
                        <p className="text-slate-200 font-medium">"{rule.source_text}"</p>
                        <pre className="p-2.5 rounded bg-black/60 text-[11px] font-mono text-cyan-300/90 overflow-x-auto">
                          {JSON.stringify(rule.condition, null, 2)}
                        </pre>
                        {rule.required_evidence?.length > 0 && (
                          <div className="text-[10px] text-emerald-400">
                            Required Evidence: {rule.required_evidence.map(e => e.type).join(', ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 3: Evidence Graph */}
              {selectedTab === 'graph' && (
                <EvidenceGraphVisualizer graphData={currentResult.evidenceGraph} />
              )}

              {/* Tab 4: Facts */}
              {selectedTab === 'facts' && (
                <div className="p-4 rounded-xl border border-white/10 bg-black/50">
                  <pre className="text-xs font-mono text-slate-300 overflow-x-auto">
                    {JSON.stringify(currentResult.extractedFacts, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div className="p-16 text-center text-slate-500 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center space-y-3">
              <ShieldCheck className="w-10 h-10 opacity-30 text-cyan-400" />
              <p className="text-sm">Configure your objective and documents on the left, then launch the audit kernel.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

