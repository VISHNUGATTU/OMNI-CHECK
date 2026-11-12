import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import EmployeeInput from './EmployeeInput';
import AdaptiveAssessment from './AdaptiveAssessment';
import { MODE_THEMES, DEFAULT_CLIENT_MODE, getClientModeTheme } from '../data/modeThemes';

export default function EmployeePortal() {
  const [searchParams] = useSearchParams();
  const urlModeParam = searchParams.get('mode')?.toLowerCase();
  const validUrlMode = urlModeParam && MODE_THEMES[urlModeParam] ? urlModeParam : null;

  const [serverMode, setServerMode] = useState(DEFAULT_CLIENT_MODE);
  const [assessmentSession, setAssessmentSession] = useState(null);
  const [isLoadingMode, setIsLoadingMode] = useState(!validUrlMode);

  // Sync mode with server configuration when not overridden by URL param
  useEffect(() => {
    if (validUrlMode) return undefined;
    let mounted = true;
    axios
      .get('http://localhost:5000/api/settings/mode')
      .then((res) => {
        if (mounted && res.data.activeMode && MODE_THEMES[res.data.activeMode]) {
          setServerMode(res.data.activeMode);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch server active mode:', err.message);
      })
      .finally(() => {
        if (mounted) setIsLoadingMode(false);
      });
    return () => {
      mounted = false;
    };
  }, [validUrlMode]);

  const activeMode = validUrlMode || serverMode;
  const theme = getClientModeTheme(activeMode);
  const dark = theme.dark || {};

  if (isLoadingMode) {
    return (
      <div className="min-h-[calc(100vh-5rem)] bg-[#0a0a0a] flex flex-col items-center justify-center py-20 text-slate-400">
        <div className={`animate-spin rounded-full h-8 w-8 border-2 ${dark.spinner || 'border-purple-400'} border-t-transparent mb-3`} />
        <p className="text-xs font-mono uppercase tracking-widest">Synchronizing Portal Configuration…</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-[#0a0a0a] text-slate-100">
      {!assessmentSession ? (
        <EmployeeInput
          activeMode={activeMode}
          onStartAssessment={setAssessmentSession}
        />
      ) : (
        <AdaptiveAssessment
          assessmentId={assessmentSession.assessmentId}
          employeeId={assessmentSession.employeeId}
          name={assessmentSession.name}
          role={assessmentSession.role}
          roleSkills={assessmentSession.skills}
          skillRatings={assessmentSession.skillRatings}
          initialQuestion={assessmentSession.firstQuestion}
          mode={assessmentSession.mode || activeMode}
          onReset={() => setAssessmentSession(null)}
        />
      )}
    </div>
  );
}
