import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL
});

// Health check
export const checkHealth = () => axios.get('http://localhost:5000/health');

// --- Module 1: Compliance & Investigation APIs ---
export const startInvestigation = (formData) => 
  api.post('/compliance/investigate', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });

export const getInvestigations = () => api.get('/compliance/investigations');
export const getInvestigation = (id) => api.get(`/compliance/investigations/${id}`);
export const compilePolicy = (policyText) => api.post('/compliance/compile-policy', { policyText });
export const evaluateRules = (payload) => api.post('/compliance/evaluate-rules', payload);

// --- Module 2: HR Intelligence & Interview APIs ---
export const getJobs = () => api.get('/hr/jobs');
export const createJob = (formData) => 
  api.post('/hr/jobs', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });

export const enrollCandidate = (data) => api.post('/hr/enroll', data);
export const uploadResume = (candidateId, formData) => 
  api.post(`/hr/candidates/${candidateId}/resume`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });

export const getCandidates = () => api.get('/hr/candidates');
export const getCandidate = (id) => api.get(`/hr/candidates/${id}`);
export const sendInterviewMessage = (candidateId, userMessage) => 
  api.post(`/hr/candidates/${candidateId}/message`, { userMessage });

export const sendProctorAlert = (candidateId, alertData) => 
  api.post(`/hr/candidates/${candidateId}/proctor-alert`, alertData);

export const evaluateInterview = (candidateId) => 
  api.post(`/hr/candidates/${candidateId}/evaluate`);

export const getMilestones = () => api.get('/hr/milestones');

// --- Module 3: NEX_AI Assessment APIs ---
export const getActiveMode = () => api.get('/settings/mode');
export const setActiveMode = (activeMode) => api.post('/settings/mode', { activeMode });
export const getRoles = () => api.get('/roles');
export const startAssessment = (payload) => api.post('/employee/start', payload);
export const getNextQuestion = (payload) => api.post('/assessment/next-question', payload);
export const evaluateAssessment = (payload) => api.post('/assessment/evaluate', payload);
export const getReports = () => api.get('/reports');

export default api;
