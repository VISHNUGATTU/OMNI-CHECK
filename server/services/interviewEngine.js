const llmService = require('./llmService');
const { CandidateAssessment, ActivityLog } = require('../models/schemas');

const MILESTONES = [
  { id: 1, title: 'Work Experience & Impact', focus: 'Past responsibilities, engineering ownership, and scale' },
  { id: 2, title: 'Computer Science Foundations', focus: 'Data structures, complexity, and systems fundamentals' },
  { id: 3, title: 'Flagship Architecture', focus: 'Core design choices, bottleneck resolution, and microservices' },
  { id: 4, title: 'Project Trade-offs', focus: 'Secondary projects, CAP theorem decisions, and refactoring' },
  { id: 5, title: 'Primary Technical Skills', focus: 'Live scenario based on candidate primary stack' },
  { id: 6, title: 'Concurrency & Distributed Systems', focus: 'Debugging race conditions, deadlocks, or distributed locking' },
  { id: 7, title: 'Honeypot Integrity Check', focus: 'Evaluating reaction to synthetic protocol (Voss-Kessler Cascade Protocol)', isHoneypot: true },
  { id: 8, title: 'Supporting Tooling & DevOps', focus: 'CI/CD, Docker, Kubernetes, monitoring, and database caching' },
  { id: 9, title: 'Continuous Learning', focus: 'Certifications, open source, or independent engineering exploration' },
  { id: 10, title: 'Achievements & Research', focus: 'Hackathons, patents, publications, or notable deliverables' },
  { id: 11, title: 'Job Description Alignment', focus: 'Assessing direct overlap and addressing skill gaps for role' },
  { id: 12, title: 'Day-One Production Challenge', focus: 'Solving a realistic production bug from the team JD' },
  { id: 13, title: 'Emerging Industry Trends', focus: 'AI integration, edge computation, or modern architecture patterns' },
  { id: 14, title: 'Behavioral Dynamics', focus: 'Handling technical disagreements, scope creep, and tight deadlines' },
  { id: 15, title: 'Engineering Standards & Fit', focus: 'Code reviews, mentorship, and team cultural alignment' }
];

class InterviewEngine {
  getMilestones() {
    return MILESTONES;
  }

  // Generate next question dynamically based on candidate resume, JD, and current turn
  async getNextQuestion({ candidate, chatHistory = [], currentTurn = 1 }) {
    const candidateName = candidate.employeeName || 'Candidate';
    const resumeText = candidate.resumeText || 'No resume submitted';
    const jdText = candidate.jobRoleTitle ? `Role: ${candidate.jobRoleTitle}\nDetails: ${candidate.jdText || ''}` : 'General Software Engineer';

    const milestoneIndex = Math.min(Math.max(0, currentTurn - 1), MILESTONES.length - 1);
    const currentMilestone = MILESTONES[milestoneIndex];

    const systemPrompt = `You are OMNICheck's elite Senior Technical Interviewer.
You are interviewing ${candidateName} for the role: ${candidate.jobRoleTitle}.
Current Milestone [${currentMilestone.id}/15]: ${currentMilestone.title} (${currentMilestone.focus}).

${currentMilestone.isHoneypot ? 
`CRITICAL HONEYPOT TRAP RULE:
Present a question about "The Voss-Kessler Cascade Protocol" or "Quark-Synchronous Buffer Routing" as if it were an established protocol.
Your goal is to test candidate intellectual honesty: Do they truthfully acknowledge they do not know it, or do they bluff?
Ask naturally: "In high-throughput services, how have you utilized or approached the Voss-Kessler Cascade Protocol to prevent buffer saturation?"`
: ''}

STRICT CONVERSATIONAL RULES:
1. Speak in natural conversational prose. No markdown headers, bold labels, or asterisks.
2. Ask EXACTLY ONE clear question at a time.
3. Reference their resume skills and past answers naturally.
4. Conclude gracefully if on question 15.`;

    const recentHistory = chatHistory.slice(-6).map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
    const prompt = `CANDIDATE RESUME SUMMARY:\n${resumeText.slice(0, 1500)}\n\nJOB REQUIREMENTS:\n${jdText.slice(0, 800)}\n\nRECENT CONVERSATION:\n${recentHistory || 'No previous messages yet. Initiate interview with Milestone 1.'}\n\nAsk the next interview question for Milestone ${currentMilestone.id} (${currentMilestone.title}):`;

    const question = await llmService.generateText({
      prompt,
      systemPrompt,
      temperature: 0.3,
      maxTokens: 250,
      preferProvider: 'groq'
    });

    return {
      turn: currentMilestone.id,
      milestone: currentMilestone,
      question: question.trim(),
      isHoneypot: !!currentMilestone.isHoneypot
    };
  }

  // Intercept and correct phonetically garbled speech transcripts
  async cleanTranscript({ rawText, candidate }) {
    if (!rawText || rawText.trim().length < 3) return rawText;

    const systemPrompt = `You are an intelligent audio transcript post-processor for technical interviews.
Correct phonetic speech-to-text errors and garbled tech jargon.
Candidate Context:
Resume highlights: ${candidate.resumeText ? candidate.resumeText.slice(0, 800) : ''}
Role: ${candidate.jobRoleTitle || 'Software Engineer'}

Preserve meaning precisely. Output ONLY the clean spoken text without quotes or explanations.`;

    try {
      const cleaned = await llmService.generateText({
        prompt: `Raw transcript: "${rawText}"`,
        systemPrompt,
        temperature: 0.0,
        maxTokens: 200,
        preferProvider: 'groq'
      });
      return cleaned.replace(/^["']|["']$/g, '').trim() || rawText;
    } catch (e) {
      return rawText;
    }
  }

  // Log proctoring alert telemetry
  async logProctorAlert(candidateId, { category, description, riskWeight = 5 }) {
    const alert = await ActivityLog.create({
      candidateId,
      eventCategory: category || 'PROCTOR_FLAG',
      description: description || 'Suspicious window blur or face movement detected',
      riskWeight,
      timestamp: new Date().toISOString()
    });

    const candidate = await CandidateAssessment.findById(candidateId);
    if (candidate) {
      const events = candidate.proctoringEvents || [];
      events.push({
        category: category || 'PROCTOR_FLAG',
        description,
        riskWeight,
        timestamp: new Date().toISOString()
      });
      
      const newStatus = events.length > 2 ? 'Flagged' : (events.length > 0 ? 'Warning' : 'Clean');
      await CandidateAssessment.findByIdAndUpdate(candidateId, {
        proctoringEvents: events,
        proctoringStatus: newStatus
      });
    }

    return alert;
  }

  // Deep AI Evaluation of the Interview Session
  async evaluateCandidate(candidateId) {
    const candidate = await CandidateAssessment.findById(candidateId);
    if (!candidate) throw new Error('Candidate not found');

    const activityLogs = await ActivityLog.find({ candidateId });
    const chatHistory = candidate.chatHistory || [];

    const transcript = chatHistory
      .filter(m => m.role !== 'system')
      .map(m => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n');

    const proctorLogText = activityLogs.length > 0
      ? activityLogs.map(l => `[${new Date(l.timestamp).toLocaleTimeString()}] ${l.eventCategory}: ${l.description} (Risk: ${l.riskWeight})`).join('\n')
      : 'Clean session. Zero proctoring anomalies recorded.';

    const systemPrompt = `You are an elite HR Assessor & Lead Engineering Auditor.
Review the complete technical interview transcript, Candidate Resume, Job Description, and proctoring telemetry.

CRITICAL EVALUATION LAWS:
1. HONEYPOT TRAP ASSESSMENT:
   Check whether the candidate encountered Milestone 7 (Voss-Kessler Cascade Protocol or similar fake concept).
   - If candidate honestly stated they didn't know or hadn't encountered it -> HIGH INTEGRITY (Score 90-100).
   - If candidate bluffed, pretended to know, or fabricated details -> SEVERE INTEGRITY VIOLATION (Cap Integrity <= 50, deduct -30 from Problem Solving).
2. COMPETENCY METRICS (0-100 each):
   - Communication: Articulation, structure, conciseness.
   - Technical: Concrete knowledge, architecture depth, edge case handling.
   - Problem Solving: Algorithmic clarity, trade-off analysis, adaptability.
   - Integrity: Intellectual honesty on honeypot and ethical posture.
3. QA REPORT:
   Provide an array evaluating key questions asked, candidate answers, ideal responses, and score out of 10.
4. OVERALL SUITABILITY & RECOMMENDATION:
   Calculate overall suitability percentage (weighted average).
   hrDecision must be strictly one of: "Recommend Hire", "Hold for Review", "Do Not Hire".

Return strictly valid JSON only:
{
  "overall_suitability": number,
  "proctoring_status": "Clean" | "Warning" | "Flagged",
  "competency_scores": {
    "Communication": number,
    "Technical": number,
    "ProblemSolving": number,
    "Integrity": number
  },
  "honeypot_bluffed": boolean,
  "hr_decision": "Recommend Hire" | "Hold for Review" | "Do Not Hire",
  "decision_summary": "Thorough professional rationale for the recommendation",
  "qa_report": [
    {
      "question": "Question text",
      "candidate_answer": "Summary of candidate reply",
      "ideal_answer": "Ideal expected answer",
      "score_out_of_10": number,
      "critique": "Brief assessment"
    }
  ]
}`;

    const prompt = `JOB DESCRIPTION:\n${candidate.jdText || 'Standard Software Engineer'}\n\nCANDIDATE RESUME:\n${candidate.resumeText || 'None provided'}\n\nPROCTORING LOGS:\n${proctorLogText}\n\nINTERVIEW TRANSCRIPT:\n${transcript || 'Candidate provided minimal responses.'}`;

    const evalResult = await llmService.generateJSON({
      prompt,
      systemPrompt,
      temperature: 0.1,
      maxTokens: 2500
    });

    const proctorDeductions = activityLogs.reduce((acc, curr) => acc + (curr.riskWeight || 1), 0);
    const finalCompetencies = evalResult?.competency_scores || {
      Communication: 75,
      Technical: 70,
      ProblemSolving: 72,
      Integrity: Math.max(20, 90 - (proctorDeductions * 4))
    };

    const overallSuitability = evalResult?.overall_suitability || 
      Math.round((finalCompetencies.Communication + finalCompetencies.Technical + finalCompetencies.ProblemSolving + finalCompetencies.Integrity) / 4);

    let hrDecision = evalResult?.hr_decision || 'Hold for Review';
    if (overallSuitability >= 80 && finalCompetencies.Integrity >= 70) {
      hrDecision = 'Recommend Hire';
    } else if (overallSuitability < 60 || finalCompetencies.Integrity < 55) {
      hrDecision = 'Do Not Hire';
    }

    const updated = await CandidateAssessment.findByIdAndUpdate(candidateId, {
      status: 'Evaluated',
      overallSuitability,
      competencyScores: finalCompetencies,
      proctoringStatus: evalResult?.proctoring_status || candidate.proctoringStatus,
      honeypotBluffed: !!evalResult?.honeypot_bluffed,
      hrDecision,
      decisionSummary: evalResult?.decision_summary || 'Evaluation completed based on transcript analysis.',
      qaReport: (evalResult?.qa_report && Array.isArray(evalResult.qa_report)) ? evalResult.qa_report.map(q => ({
        question: q.question,
        candidateAnswer: q.candidate_answer,
        idealAnswer: q.ideal_answer,
        scoreOutOf10: q.score_out_of_10,
        critique: q.critique
      })) : []
    });

    return updated;
  }
}

module.exports = new InterviewEngine();

