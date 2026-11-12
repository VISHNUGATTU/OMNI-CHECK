import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import Navbar from './components/layout/Navbar';
import IntroSplash from './components/brand/IntroSplash';
import HomePage from './pages/HomePage';
import ComplianceInvestigation from './pages/ComplianceInvestigation';
import HRSuite from './pages/HRSuite';
import LiveInterviewRoom from './pages/LiveInterviewRoom';
import CandidateReportView from './pages/CandidateReportView';
import EmployeePortal from './pages/EmployeePortal';
import HRDashboard from './pages/HRDashboard';

export default function App() {
  const location = useLocation();
  const [activeMode, setActiveMode] = useState('retention');

  // Fetch active mode periodically and on location change
  useEffect(() => {
    const fetchMode = () => {
      axios.get('http://localhost:5000/api/settings/mode')
        .then((res) => {
          if (res.data?.activeMode) {
            setActiveMode(res.data.activeMode);
          }
        })
        .catch(() => {});
    };
    fetchMode();
    const interval = setInterval(fetchMode, 5000);
    return () => clearInterval(interval);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-100 antialiased flex flex-col font-sans transition-colors duration-200">
      {/* Intro Splash Animation */}
      <IntroSplash />

      {/* Global Header */}
      <Navbar activeMode={activeMode} />

      {/* Main Page Content */}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage activeMode={activeMode} />} />
          
          {/* Module 1: Document Compliance & Investigation */}
          <Route path="/compliance" element={<ComplianceInvestigation />} />
          
          {/* Module 2: HR Intelligence, Requisitions & Interviews */}
          <Route path="/hr-suite" element={<HRSuite />} />
          <Route path="/interview/:id" element={<LiveInterviewRoom />} />
          <Route path="/report/:id" element={<CandidateReportView />} />
          
          {/* Module 3: NEX_AI Adaptive Assessment */}
          <Route path="/employee" element={<EmployeePortal />} />
          <Route path="/hr" element={<HRDashboard />} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
