const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { JobRequirement, CandidateAssessment, ActivityLog } = require('../models/schemas');
const interviewEngine = require('../services/interviewEngine');
const documentParser = require('../services/documentParser');
const llmService = require('../services/llmService');

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`);
  }
});

const upload = multer({ storage, limits: { fileSize: 15 * 1024 * 1024 } });

// --- 1. JOB REQUISITIONS ---
router.post('/jobs', upload.single('jdFile'), async (req, res) => {
  try {
    const { title, department, jdText } = req.body;
    let finalJdText = jdText || '';

    if (req.file) {
      const parsed = await documentParser.parseFile(req.file.path, req.file.originalname);
      finalJdText = parsed.text + '\n' + finalJdText;
    }

    if (!title || !finalJdText.trim()) {
      return res.status(400).json({ error: 'Job title and description are required.' });
    }

    const job = await JobRequirement.create({
      title,
      department: department || 'Engineering',
      jdText: finalJdText.trim()
    });

    return res.status(201).json(job);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/jobs', async (req, res) => {
  try {
    const jobs = await JobRequirement.find();
    return res.json(jobs);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// --- 2. CANDIDATE ENROLLMENT & RESUME UPLOAD ---
router.post('/enroll', async (req, res) => {
  try {
    const { employeeName, email, jobId, department } = req.body;
    if (!employeeName) {
      return res.status(400).json({ error: 'Candidate name is required.' });
    }

    let jobRoleTitle = 'Software Engineer';
    let jdText = '';
    if (jobId) {
      const job = await JobRequirement.findById(jobId);
      if (job) {
        jobRoleTitle = job.title;
        jdText = job.jdText;
      }
    }

    const candidate = await CandidateAssessment.create({
      employeeName,
      email: email || '',
      jobRoleId: jobId || '',
      jobRoleTitle,
      department: department || 'Engineering',
      jdText,
      status: 'Enrolled',
      chatHistory: [
        {
          role: 'assistant',
          content: `Hello ${employeeName}. I am your OMNICheck AI Senior Technical Interviewer for the ${jobRoleTitle} position. Please ensure your microphone and camera are active. Whenever you are ready, say hello to begin our evaluation.`
        }
      ]
    });

    return res.status(201).json(candidate);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/candidates/:id/resume', upload.single('resumeFile'), async (req, res) => {
  try {
    const candidate = await CandidateAssessment.findById(req.params.id);
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

    let finalResumeText = req.body.resumeText || '';
    if (req.file) {
      const parsed = await documentParser.parseFile(req.file.path, req.file.originalname);
      finalResumeText = parsed.text + '\n' + finalResumeText;
    }

    // AI skill extraction from resume
    const extractionPrompt = `Extract key technical skills and total years of engineering experience from this candidate resume:\n"""${finalResumeText.slice(0, 3000)}"""\nReturn valid JSON: {"skills": ["skill1", "skill2"], "experienceYears": number}`;
    const extractedData = await llmService.generateJSON({
      prompt: extractionPrompt,
      systemPrompt: 'You extract technical skills accurately. Return JSON only.'
    });

    const skills = extractedData?.skills || ['JavaScript', 'Node.js', 'React'];
    const experienceYears = extractedData?.experienceYears || 2;

    const updated = await CandidateAssessment.findByIdAndUpdate(req.params.id, {
      resumeText: finalResumeText.trim(),
      skills,
      experienceYears,
      status: 'Ready for Interview'
    });

    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// --- 3. CANDIDATE LIST & PROFILE ---
router.get('/candidates', async (req, res) => {
  try {
    const candidates = await CandidateAssessment.find();
    return res.json(candidates);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/candidates/:id', async (req, res) => {
  try {
    const candidate = await CandidateAssessment.findById(req.params.id);
    if (!candidate) return res.status(404).json({ error: 'Candidate not found.' });
    return res.json(candidate);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// --- 4. INTERACTIVE INTERVIEW TURN (REST / Streaming Fallback) ---
router.post('/candidates/:id/message', async (req, res) => {
  try {
    const { userMessage } = req.body;
    const candidate = await CandidateAssessment.findById(req.params.id);
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

    // Step 1: Clean transcript with grammar interceptor
    const cleanedText = await interviewEngine.cleanTranscript({
      rawText: userMessage,
      candidate
    });

    // Step 2: Append user message
    const history = candidate.chatHistory || [];
    history.push({ role: 'user', content: cleanedText, timestamp: new Date() });

    // Calculate current milestone turn
    const userTurnCount = history.filter(m => m.role === 'user').length;
    
    // Step 3: Get next question
    const nextQ = await interviewEngine.getNextQuestion({
      candidate,
      chatHistory: history,
      currentTurn: userTurnCount + 1
    });

    history.push({ role: 'assistant', content: nextQ.question, timestamp: new Date() });

    const updated = await CandidateAssessment.findByIdAndUpdate(req.params.id, {
      chatHistory: history,
      status: userTurnCount >= 15 ? 'Completed' : 'In Progress',
      honeypotTriggered: nextQ.isHoneypot || candidate.honeypotTriggered
    });

    return res.json({
      candidate: updated,
      cleanedText,
      reply: nextQ.question,
      milestone: nextQ.milestone,
      turn: userTurnCount + 1
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// --- 5. PROCTORING TELEMETRY ---
router.post('/candidates/:id/proctor-alert', async (req, res) => {
  try {
    const { category, description, riskWeight } = req.body;
    const alert = await interviewEngine.logProctorAlert(req.params.id, {
      category,
      description,
      riskWeight: riskWeight || 5
    });
    return res.json({ success: true, alert });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// --- 6. TRIGGER DEEP EVALUATION & QA REPORT ---
router.post('/candidates/:id/evaluate', async (req, res) => {
  try {
    const evaluated = await interviewEngine.evaluateCandidate(req.params.id);
    return res.json({ success: true, candidate: evaluated });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// --- 7. MILESTONES METADATA ---
router.get('/milestones', (req, res) => {
  return res.json(interviewEngine.getMilestones());
});

module.exports = router;

