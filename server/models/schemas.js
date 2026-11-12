const mongoose = require('mongoose');
const { ResilientCollection } = require('../config/db');

// --- Investigation Schema ---
const InvestigationSchema = new mongoose.Schema({
  title: { type: String, default: 'Compliance Investigation' },
  objective: { type: String, required: true },
  rulebookText: { type: String, default: '' },
  targetDocuments: [{
    filename: String,
    fileType: String,
    extractedChars: Number
  }],
  targetUrls: [String],
  extractedFacts: { type: mongoose.Schema.Types.Mixed, default: {} },
  compiledRules: { type: mongoose.Schema.Types.Mixed, default: [] },
  unparsedStatements: { type: mongoose.Schema.Types.Mixed, default: [] },
  ruleEngineResult: {
    status: { type: String, enum: ['compliant', 'violation', 'indeterminate', 'needs_review', 'pending'], default: 'pending' },
    summary: String,
    complianceScore: Number,
    ruleEvaluations: mongoose.Schema.Types.Mixed,
    indeterminateReasons: [String]
  },
  evidenceGraph: {
    nodes: [{ id: String, label: String, type: String, properties: mongoose.Schema.Types.Mixed }],
    edges: [{ id: String, source: String, target: String, relation: String, properties: mongoose.Schema.Types.Mixed }]
  },
  metrics: {
    latencyMs: Number,
    rulesCount: Number,
    documentsCount: Number,
    conflictsDetected: Number
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// --- Job Requirement Schema ---
const JobRequirementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  department: { type: String, default: 'Engineering' },
  jdText: { type: String, required: true },
  skillsRequired: [String],
  experienceRange: String,
  status: { type: String, default: 'Active' },
  createdAt: { type: Date, default: Date.now }
});

// --- Candidate Assessment Schema ---
const CandidateAssessmentSchema = new mongoose.Schema({
  employeeName: { type: String, required: true },
  email: { type: String },
  jobRoleId: { type: String },
  jobRoleTitle: { type: String, default: 'Software Engineer' },
  department: { type: String, default: 'Engineering' },
  status: { type: String, default: 'Enrolled' }, // Enrolled, Ready for Interview, In Progress, Completed, Evaluated
  resumeText: { type: String, default: '' },
  skills: [String],
  experienceYears: Number,
  mode: { type: String, default: 'hiring' },
  
  // Real-time interview chat history
  chatHistory: [{
    role: { type: String, enum: ['system', 'assistant', 'user'] },
    content: String,
    timestamp: { type: Date, default: Date.now }
  }],
  
  // Proctoring telemetry
  proctoringStatus: { type: String, default: 'Clean' }, // Clean, Warning, Flagged
  proctoringEvents: [{
    category: String,
    description: String,
    riskWeight: Number,
    timestamp: { type: Date, default: Date.now }
  }],
  
  // Honeypot test tracking
  honeypotTriggered: { type: Boolean, default: false },
  honeypotBluffed: { type: Boolean, default: false },
  
  // AI Competency Evaluation
  overallSuitability: { type: Number, default: 0 },
  competencyScores: {
    Communication: { type: Number, default: 0 },
    Technical: { type: Number, default: 0 },
    ProblemSolving: { type: Number, default: 0 },
    Integrity: { type: Number, default: 0 }
  },
  hrDecision: { type: String, default: 'Pending' }, // Recommend Hire, Hold for Review, Do Not Hire
  decisionSummary: String,
  qaReport: [{
    question: String,
    candidateAnswer: String,
    idealAnswer: String,
    scoreOutOf10: Number,
    critique: String
  }],
  pdfReportPath: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// --- Activity Log Schema ---
const ActivityLogSchema = new mongoose.Schema({
  candidateId: { type: String, index: true },
  eventCategory: { type: String, index: true },
  description: String,
  riskWeight: { type: Number, default: 1 },
  timestamp: { type: Date, default: Date.now }
});

let MongooseInvestigation, MongooseJob, MongooseCandidate, MongooseActivityLog;

try {
  MongooseInvestigation = mongoose.model('Investigation', InvestigationSchema);
  MongooseJob = mongoose.model('JobRequirement', JobRequirementSchema);
  MongooseCandidate = mongoose.model('CandidateAssessment', CandidateAssessmentSchema);
  MongooseActivityLog = mongoose.model('ActivityLog', ActivityLogSchema);
} catch (e) {
  // If model already registered
  MongooseInvestigation = mongoose.model('Investigation');
  MongooseJob = mongoose.model('JobRequirement');
  MongooseCandidate = mongoose.model('CandidateAssessment');
  MongooseActivityLog = mongoose.model('ActivityLog');
}

module.exports = {
  Investigation: new ResilientCollection('investigations', MongooseInvestigation),
  JobRequirement: new ResilientCollection('jobs', MongooseJob),
  CandidateAssessment: new ResilientCollection('candidates', MongooseCandidate),
  ActivityLog: new ResilientCollection('activityLogs', MongooseActivityLog)
};

