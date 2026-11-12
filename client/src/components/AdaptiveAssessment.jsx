import { useState } from 'react';

export default function AdaptiveAssessment() {
  const [candidate, setCandidate] = useState('');
  const [score, setScore] = useState(78);

  const handleGenerate = () => {
    const nextScore = Math.min(99, Math.max(50, Number(candidate.length) % 30 + 60));
    setScore(nextScore);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xl font-semibold text-slate-800">Adaptive Assessment</h3>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700">
          Match Score: {score}%
        </span>
      </div>

      <label className="mb-2 block text-sm font-medium text-slate-600">Candidate profile</label>
      <textarea
        value={candidate}
        onChange={(e) => setCandidate(e.target.value)}
        rows="4"
        placeholder="Enter candidate summary, skills, and experience..."
        className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none ring-0 transition focus:border-indigo-400"
      />

      <button
        type="button"
        onClick={handleGenerate}
        className="mt-4 inline-flex rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500">

        Generate assessment
      </button>
    </div>
  );
}
