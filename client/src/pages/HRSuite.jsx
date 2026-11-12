import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Briefcase, Plus, FileText, Upload, Video, 
  CheckCircle2, Clock, AlertTriangle, ArrowRight, ShieldAlert, Sparkles 
} from 'lucide-react';
import { getJobs, createJob, enrollCandidate, uploadResume, getCandidates } from '../services/api';

export default function HRSuite() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('candidates'); // candidates | jobs | enroll
  const [jobs, setJobs] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);

  // New Job Form State
  const [jobTitle, setJobTitle] = useState('Senior Backend & Distributed Systems Engineer');
  const [department, setDepartment] = useState('Engineering');
  const [jdText, setJdText] = useState(`We are seeking an experienced Backend Engineer to design scalable distributed architectures.
Key Responsibilities:
- Design microservices with Node.js, Python, or Go.
- Manage PostgreSQL databases and Redis caching.
- Solve concurrency and latency challenges.
- Adhere to strict security and CI/CD best practices.`);

  // Enroll Candidate Form State
  const [candidateName, setCandidateName] = useState('Afsheen Khan');
  const [candidateEmail, setCandidateEmail] = useState('afsheen.khan@example.com');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [resumeText, setResumeText] = useState(`Afsheen Khan - Senior Software Engineer
Summary: 5+ years of experience designing high-throughput backend services and cloud architectures.
Skills: Node.js, Express, MongoDB, PostgreSQL, Redis, Docker, Microservices, React.
Flagship Project: Distributed Event Processing Pipeline handling 100K msg/sec using Kafka and Redis caching.
Education: B.Tech in Computer Science.`);
  const [resumeFile, setResumeFile] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [jobsRes, candRes] = await Promise.all([getJobs(), getCandidates()]);
      if (Array.isArray(jobsRes.data)) {
        setJobs(jobsRes.data);
        if (jobsRes.data.length > 0 && !selectedJobId) {
          setSelectedJobId(jobsRes.data[0]._id || jobsRes.data[0].id);
        }
      }
      if (Array.isArray(candRes.data)) {
        setCandidates(candRes.data);
      }
    } catch (e) {
      console.warn('Error fetching HR data:', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateJob = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('title', jobTitle);
      formData.append('department', department);
      formData.append('jdText', jdText);

      await createJob(formData);
      alert('Job Requisition created successfully!');
      fetchData();
      setActiveTab('candidates');
    } catch (err) {
      alert('Failed to create job: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleEnrollCandidate = async (e) => {
    e.preventDefault();
    try {
      // Step 1: Enroll candidate
      const enrollRes = await enrollCandidate({
        employeeName: candidateName,
        email: candidateEmail,
        jobId: selectedJobId,
        department
      });

      const newCandId = enrollRes.data?._id || enrollRes.data?.id;

      // Step 2: Upload resume text or file
      if (newCandId) {
        const formData = new FormData();
        formData.append('resumeText', resumeText);
        if (resumeFile) formData.append('resumeFile', resumeFile);
        await uploadResume(newCandId, formData);
      }

      alert('Candidate enrolled and resume analyzed successfully!');
      fetchData();
      setActiveTab('candidates');
    } catch (err) {
      alert('Enrollment failed: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
                Module 2: HR Intelligence & Adaptive Interview Suite
              </h1>
              <p className="text-xs text-slate-400">
                Job Requisitions &middot; AI Resume Entity Extraction &middot; Live Proctoring &middot; 15-Milestone Interview Roadmap
              </p>
            </div>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('candidates')}
            className={`text-xs px-3.5 py-2 rounded-xl font-medium transition ${
              activeTab === 'candidates' 
                ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' 
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            Candidate Pipeline ({candidates.length})
          </button>
          <button
            onClick={() => setActiveTab('enroll')}
            className={`text-xs px-3.5 py-2 rounded-xl font-medium transition flex items-center gap-1.5 ${
              activeTab === 'enroll' 
                ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' 
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            <Plus className="w-3.5 h-3.5" /> Enroll Candidate
          </button>
          <button
            onClick={() => setActiveTab('jobs')}
            className={`text-xs px-3.5 py-2 rounded-xl font-medium transition flex items-center gap-1.5 ${
              activeTab === 'jobs' 
                ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' 
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" /> Job Requisitions ({jobs.length})
          </button>
        </div>
      </div>

      {/* TAB 1: CANDIDATE PIPELINE */}
      {activeTab === 'candidates' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {candidates.map(cand => {
              const candId = cand._id || cand.id;
              const hasReport = cand.status === 'Evaluated' || cand.qaReport?.length > 0;

              return (
                <div
                  key={candId}
                  className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4 hover:border-purple-500/40 transition group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-100 text-sm group-hover:text-purple-300 transition">
                        {cand.employeeName}
                      </h3>
                      <p className="text-xs text-slate-400">{cand.jobRoleTitle}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${
                      cand.status === 'Evaluated' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                      cand.status === 'In Progress' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' :
                      'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    }`}>
                      {cand.status}
                    </span>
                  </div>

                  {/* Skills Pill List */}
                  {cand.skills && cand.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {cand.skills.slice(0, 4).map((sk, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/5">
                          {sk}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Proctoring Status Pill */}
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-white/5">
                    <span className="text-slate-500 flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5 text-slate-400" /> Proctoring:
                    </span>
                    <span className={`text-[11px] font-medium ${
                      cand.proctoringStatus === 'Clean' ? 'text-emerald-400' :
                      cand.proctoringStatus === 'Warning' ? 'text-amber-400' : 'text-rose-400'
                    }`}>
                      {cand.proctoringStatus || 'Clean'}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      onClick={() => navigate(`/interview/${candId}`)}
                      className="py-2 px-3 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                    >
                      <Video className="w-3.5 h-3.5" /> Launch Interview
                    </button>
                    {hasReport ? (
                      <button
                        onClick={() => navigate(`/report/${candId}`)}
                        className="py-2 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                      >
                        <FileText className="w-3.5 h-3.5" /> View Report
                      </button>
                    ) : (
                      <button
                        disabled
                        className="py-2 px-3 rounded-xl bg-white/5 text-slate-500 border border-white/5 text-xs font-medium cursor-not-allowed text-center"
                      >
                        Pending Interview
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {candidates.length === 0 && (
              <div className="col-span-full p-12 text-center text-slate-500 border border-dashed border-white/10 rounded-2xl">
                No candidates enrolled yet. Click "Enroll Candidate" to get started!
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ENROLL CANDIDATE */}
      {activeTab === 'enroll' && (
        <div className="max-w-2xl mx-auto rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-5">
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            Enroll Candidate & Resume Ingestion
          </h2>

          <form onSubmit={handleEnrollCandidate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Full Name</label>
                <input
                  type="text"
                  required
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  className="w-full text-xs bg-black/40 border border-white/10 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Email Address</label>
                <input
                  type="email"
                  value={candidateEmail}
                  onChange={(e) => setCandidateEmail(e.target.value)}
                  className="w-full text-xs bg-black/40 border border-white/10 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">Target Job Requisition</label>
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="w-full text-xs bg-black/40 border border-white/10 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-purple-500"
              >
                {jobs.map(j => (
                  <option key={j._id || j.id} value={j._id || j.id} className="bg-slate-900">
                    {j.title} ({j.department})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">Candidate Resume (PDF or Paste Text)</label>
              <div className="mb-2">
                <input
                  type="file"
                  accept=".pdf,.txt,.docx"
                  onChange={(e) => setResumeFile(e.target.files[0])}
                  className="text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-purple-500/20 file:text-purple-300 hover:file:bg-purple-500/30"
                />
              </div>
              <textarea
                rows={5}
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder="Or paste candidate resume markdown/text here..."
                className="w-full text-xs font-mono bg-black/40 border border-white/10 rounded-xl p-3 text-slate-300 focus:outline-none focus:border-purple-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold tracking-wide transition shadow-lg shadow-purple-600/30"
            >
              Enroll Candidate & Extract Skills
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: JOB REQUISITIONS */}
      {activeTab === 'jobs' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-purple-400" /> Create Job Requisition
            </h3>

            <form onSubmit={handleCreateJob} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Job Title</label>
                <input
                  type="text"
                  required
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="w-full text-xs bg-black/40 border border-white/10 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">Department</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full text-xs bg-black/40 border border-white/10 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">Job Description (JD)</label>
                <textarea
                  rows={6}
                  required
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                  className="w-full text-xs font-mono bg-black/40 border border-white/10 rounded-xl p-2.5 text-slate-300 focus:outline-none focus:border-purple-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition"
              >
                Save Job Requisition
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Job Postings</h3>
            {jobs.map(j => (
              <div
                key={j._id || j.id}
                className="p-4 rounded-xl border border-white/10 bg-white/[0.02] space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-100 text-sm">{j.title}</span>
                  <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px]">
                    {j.department}
                  </span>
                </div>
                <p className="text-slate-400 font-sans line-clamp-3">{j.jdText}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

