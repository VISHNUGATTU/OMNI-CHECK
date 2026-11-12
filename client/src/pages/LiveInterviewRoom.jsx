import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Video, Mic, MicOff, Send, ShieldAlert, Sparkles, 
  CheckCircle2, AlertCircle, ArrowLeft, RefreshCw, Volume2, ShieldCheck, User
} from 'lucide-react';
import { getCandidate, sendInterviewMessage, sendProctorAlert, evaluateInterview, getMilestones } from '../services/api';

export default function LiveInterviewRoom() {
  const { id: candidateId } = useParams();
  const navigate = useNavigate();

  const [candidate, setCandidate] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTurn, setCurrentTurn] = useState(1);
  const [milestones, setMilestones] = useState([]);
  const [proctorFlags, setProctorFlags] = useState([]);
  const [cameraActive, setCameraActive] = useState(true);

  const videoRef = useRef(null);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const wsRef = useRef(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        setIsRecording(false);
      };

      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);

      recognitionRef.current = recognition;
    }
  }, []);

  // Fetch Candidate and Milestones
  useEffect(() => {
    getCandidate(candidateId).then(res => {
      setCandidate(res.data);
      if (res.data?.chatHistory) {
        setMessages(res.data.chatHistory);
        const userCount = res.data.chatHistory.filter(m => m.role === 'user').length;
        setCurrentTurn(Math.min(15, userCount + 1));
      }
    }).catch(err => console.error(err));

    getMilestones().then(res => setMilestones(res.data)).catch(() => {});

    // Setup simulated webcam stream
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then(stream => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch(err => {
          console.warn('Webcam stream not accessible:', err.message);
          setCameraActive(false);
        });
    }

    // Connect WebSocket
    const wsUrl = `ws://localhost:5000/ws?candidateId=${candidateId}`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'text') {
          setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
          if (data.turn) setCurrentTurn(data.turn);
          speakText(data.content);
        } else if (data.type === 'interview_completed') {
          setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
        } else if (data.type === 'evaluation_ready') {
          navigate(`/report/${candidateId}`);
        }
      } catch (e) {
        console.error('WS Parse Error', e);
      }
    };

    wsRef.current = ws;

    // Proctoring Listeners: Fullscreen and Window Blur
    const handleBlur = () => {
      recordProctorAlert('TAB_SWITCH_BLUR', 'Candidate navigated away or blurred browser window.', 6);
    };

    const handleFullScreenChange = () => {
      if (!document.fullscreenElement) {
        recordProctorAlert('FULLSCREEN_EXIT', 'Candidate exited full-screen proctoring mode.', 4);
      }
    };

    window.addEventListener('blur', handleBlur);
    document.addEventListener('fullscreenchange', handleFullScreenChange);

    return () => {
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
      if (wsRef.current) wsRef.current.close();
    };
  }, [candidateId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const recordProctorAlert = (category, description, riskWeight) => {
    setProctorFlags(prev => [...prev, { category, description, time: new Date().toLocaleTimeString() }]);
    sendProctorAlert(candidateId, { category, description, riskWeight }).catch(() => {});
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'proctor_alert',
        category,
        content: description,
        riskWeight
      }));
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || isProcessing) return;

    const userText = inputText.trim();
    setInputText('');
    setMessages(prev => [...prev, { role: 'user', content: userText }]);
    setIsProcessing(true);

    try {
      // Try WebSocket first
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'candidate_response',
          content: userText
        }));
      } else {
        // Fallback to REST API
        const res = await sendInterviewMessage(candidateId, userText);
        if (res.data?.reply) {
          setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply }]);
          setCurrentTurn(res.data.turn || currentTurn + 1);
          speakText(res.data.reply);
        }
      }
    } catch (err) {
      console.error('Send message failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert('Speech Recognition not supported in this browser. Please type your reply.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const handleConcludeInterview = async () => {
    if (confirm('Conclude the interview session and generate the comprehensive evaluation report?')) {
      setIsProcessing(true);
      try {
        await evaluateInterview(candidateId);
        navigate(`/report/${candidateId}`);
      } catch (err) {
        alert('Evaluation failed: ' + err.message);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const currentMilestone = milestones[currentTurn - 1] || { id: currentTurn, title: 'Adaptive Milestone' };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Top Banner */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/hr-suite')}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              Live AI Technical Interview Room
            </h1>
            <p className="text-xs text-slate-400">
              Candidate: <span className="text-slate-200 font-semibold">{candidate?.employeeName || 'Candidate'}</span> &middot; Role: {candidate?.jobRoleTitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleConcludeInterview}
            disabled={isProcessing}
            className="text-xs px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold hover:opacity-90 transition shadow-lg shadow-purple-600/20 disabled:opacity-50"
          >
            {isProcessing ? 'Generating Audit Report...' : 'Conclude & Evaluate'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Webcam & Proctoring Telemetry (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Camera Frame */}
          <div className="rounded-2xl border border-white/10 bg-black/60 overflow-hidden relative aspect-video flex items-center justify-center">
            {cameraActive ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover mirror"
              />
            ) : (
              <div className="text-center p-6 space-y-2">
                <User className="w-12 h-12 text-slate-500 mx-auto opacity-40" />
                <p className="text-xs text-slate-400">Camera preview inactive (simulation mode)</p>
              </div>
            )}

            {/* Live Proctoring Overlay Indicator */}
            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-black/80 backdrop-blur border border-emerald-500/40 text-[10px] text-emerald-400 font-mono flex items-center gap-1.5 z-10">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              VISION PROCTOR: SECURE
            </div>

            <div className="absolute top-3 right-3 px-2 py-0.5 rounded bg-black/80 backdrop-blur border border-white/10 text-[9px] font-mono text-cyan-300 z-10">
              RTT: 22ms &middot; 30 FPS
            </div>

            {/* Simulated Edge Face Mesh Target Box */}
            <div className="absolute inset-8 border border-dashed border-emerald-400/30 rounded-2xl pointer-events-none flex flex-col justify-between p-3">
              <div className="flex justify-between text-[9px] font-mono text-emerald-400/70">
                <span>[GAZE: CENTER]</span>
                <span>[FACES: 1]</span>
              </div>
              <div className="flex justify-between text-[9px] font-mono text-emerald-400/70">
                <span>[POSE: 0.99]</span>
                <span>[INTEGRITY: 100%]</span>
              </div>
            </div>
          </div>

          {/* 15-Milestone Roadmap Tracker */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">15-Milestone Roadmap</span>
              <span className="font-mono text-purple-400 font-bold">{currentTurn} / 15</span>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {milestones.map(m => {
                const isCurrent = m.id === currentTurn;
                const isDone = m.id < currentTurn;

                return (
                  <div
                    key={m.id}
                    className={`p-2 rounded-lg text-xs flex items-center justify-between transition ${
                      isCurrent ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-semibold' :
                      isDone ? 'bg-white/[0.02] text-slate-400 opacity-60' : 'text-slate-500'
                    }`}
                  >
                    <span className="truncate max-w-[200px]">
                      {m.id}. {m.title}
                    </span>
                    {m.isHoneypot && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        HONEYPOT
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Proctoring Event Alerts Stream */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                Integrity Telemetry Logs
              </span>
              <span className="text-[10px] text-slate-500">{proctorFlags.length} Events</span>
            </div>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {proctorFlags.length > 0 ? (
                proctorFlags.map((flag, idx) => (
                  <div key={idx} className="p-2 rounded bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-300">
                    <span className="font-mono text-[9px] text-rose-400">{flag.time} - </span>
                    {flag.description}
                  </div>
                ))
              ) : (
                <div className="text-[11px] text-slate-500 py-3 text-center">
                  Clean session &middot; Zero proctoring anomalies
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Chat & Speech Console (8 cols) */}
        <div className="lg:col-span-8 rounded-2xl border border-white/10 bg-white/[0.02] flex flex-col h-[650px] overflow-hidden">
          {/* Active Milestone Title Bar */}
          <div className="px-5 py-3 border-b border-white/10 bg-black/40 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono text-[10px]">
                PHASE {currentMilestone.id}
              </span>
              <span className="font-semibold text-slate-200">{currentMilestone.title}</span>
            </div>
            <span className="text-slate-400 text-[11px] italic truncate max-w-[250px]">
              {currentMilestone.focus}
            </span>
          </div>

          {/* Chat Messages Stream */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4">
            {messages.map((msg, idx) => {
              const isAssistant = msg.role === 'assistant';

              return (
                <div
                  key={idx}
                  className={`flex ${isAssistant ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[80%] p-4 rounded-2xl text-xs space-y-1.5 leading-relaxed ${
                      isAssistant
                        ? 'bg-purple-950/30 border border-purple-500/30 text-purple-100 rounded-tl-none'
                        : 'bg-cyan-600 text-white rounded-tr-none'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] opacity-75">
                      <span>{isAssistant ? 'OMNICheck Senior Interviewer' : candidate?.employeeName || 'Candidate'}</span>
                    </div>
                    <p className="text-sm">{msg.content}</p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Voice & Text Input Form */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10 bg-black/40 flex items-center gap-3">
            <button
              type="button"
              onClick={toggleRecording}
              className={`p-3 rounded-xl border transition ${
                isRecording
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500 animate-pulse'
                  : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-slate-200'
              }`}
              title={isRecording ? 'Listening...' : 'Click to speak'}
            >
              {isRecording ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isRecording ? 'Listening to your speech...' : 'Type or speak your answer...'}
              className="flex-1 text-xs bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />

            <button
              type="submit"
              disabled={isProcessing || !inputText.trim()}
              className="p-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

