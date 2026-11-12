require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const path = require('path');
const { WebSocketServer } = require('ws');
const { connectDB } = require('./config/db');

const assessmentRoutes = require('./routes/assessmentRoutes');
const complianceRoutes = require('./routes/complianceRoutes');
const hrRoutes = require('./routes/hrRoutes');
const interviewEngine = require('./services/interviewEngine');
const { CandidateAssessment } = require('./models/schemas');

const app = express();
const server = http.createServer(app);

// Initialize WebSockets for low-latency audio/text live interview room
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static reports and uploads
app.use('/reports', express.static(path.join(__dirname, 'reports')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount API Routes
app.use('/api', assessmentRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/hr', hrRoutes);

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    framework: 'OMNI-CHECK Universal MERN + AI Kernel',
    timestamp: new Date().toISOString()
  });
});

// --- WEBSOCKET LIVE INTERVIEW HANDLER ---
wss.on('connection', async (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const candidateId = url.searchParams.get('candidateId');

  console.log(`[WS] Client connected for candidate: ${candidateId}`);

  if (!candidateId) {
    ws.send(JSON.stringify({ type: 'error', content: 'candidateId query parameter required' }));
    return;
  }

  const candidate = await CandidateAssessment.findById(candidateId);
  if (!candidate) {
    ws.send(JSON.stringify({ type: 'error', content: 'Candidate not found' }));
    return;
  }

  // Welcome message
  const welcomeText = `Hello ${candidate.employeeName}. I am your OMNICheck AI Senior Technical Interviewer for the ${candidate.jobRoleTitle} role. Let us begin with your career background and flagship projects.`;
  ws.send(JSON.stringify({ type: 'text', content: welcomeText, turn: 1 }));

  ws.on('message', async (messageRaw) => {
    try {
      const data = JSON.parse(messageRaw.toString());

      // 1. Silent Proctoring Telemetry
      if (data.type === 'proctor_alert') {
        await interviewEngine.logProctorAlert(candidateId, {
          category: data.category || 'PROCTOR_FLAG',
          description: data.content || 'Potential integrity event detected',
          riskWeight: data.riskWeight || 5
        });
        return;
      }

      // 2. Candidate Speech or Text Response
      if (data.type === 'candidate_response') {
        const rawText = data.content || '';
        
        // Clean transcript with AI phonetic interceptor
        const cleanedText = await interviewEngine.cleanTranscript({
          rawText,
          candidate
        });

        // Broadcast cleaned transcript back to UI
        ws.send(JSON.stringify({ type: 'user_text', content: cleanedText }));

        // Append to history
        const history = candidate.chatHistory || [];
        history.push({ role: 'user', content: cleanedText, timestamp: new Date() });

        const turnCount = history.filter(m => m.role === 'user').length;

        // Fetch Next Adaptive Question
        const nextQ = await interviewEngine.getNextQuestion({
          candidate,
          chatHistory: history,
          currentTurn: turnCount + 1
        });

        history.push({ role: 'assistant', content: nextQ.question, timestamp: new Date() });

        await CandidateAssessment.findByIdAndUpdate(candidateId, {
          chatHistory: history,
          status: turnCount >= 15 ? 'Completed' : 'In Progress'
        });

        ws.send(JSON.stringify({
          type: 'text',
          content: nextQ.question,
          milestone: nextQ.milestone,
          turn: turnCount + 1,
          isHoneypot: nextQ.isHoneypot
        }));

        // If completed 15 questions or candidate asks to end, trigger evaluation
        if (turnCount >= 15 || rawText.toLowerCase().includes('end interview') || rawText.toLowerCase().includes('stop interview')) {
          ws.send(JSON.stringify({
            type: 'interview_completed',
            content: `Thank you for your time, ${candidate.employeeName}. This concludes our interview. Generating your comprehensive evaluation report now.`
          }));

          interviewEngine.evaluateCandidate(candidateId)
            .then(evaluated => {
              ws.send(JSON.stringify({ type: 'evaluation_ready', report: evaluated }));
            })
            .catch(err => {
              console.error('[WS Evaluation Error]', err.message);
            });
        }
      }
    } catch (e) {
      console.error('[WS Message Error]', e.message);
      ws.send(JSON.stringify({ type: 'error', content: 'Error processing message: ' + e.message }));
    }
  });

  ws.on('close', () => {
    console.log(`[WS] Connection closed for candidate: ${candidateId}`);
  });
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(`🚀 OMNI-CHECK MERN + AI Unified Server Running!`);
    console.log(`📡 HTTP & REST APIs: http://localhost:${PORT}`);
    console.log(`⚡ WebSocket Server: ws://localhost:${PORT}/ws`);
    console.log(`📁 Uploads & Reports: http://localhost:${PORT}/reports`);
    console.log(`====================================================`);
  });
});
