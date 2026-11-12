# OMNI-CHECK
### Orchestrated Multi-Agent Network for Intelligence, Compliance, HR Evaluation, and Control Kernel

[![MERN Stack](https://img.shields.io/badge/Stack-MERN%20%2B%20AI-00ffff.svg)](https://github.com/VISHNUGATTU/OMNI-CHECK)
[![Architecture](https://img.shields.io/badge/Architecture-3--Tier%20Microkernel-a855f7.svg)](https://github.com/VISHNUGATTU/OMNI-CHECK)
[![Logic](https://img.shields.io/badge/Logic-3--Valued%20Kleene-10b981.svg)](https://github.com/VISHNUGATTU/OMNI-CHECK)

OMNI-CHECK is an enterprise-grade artificial intelligence and compliance platform that unifies deterministic policy auditing with adaptive workforce intelligence.

Based on the research paper:
> **"OMNI-CHECK: Orchestrated Multi-agent Network for Intelligence, Compliance, HR Evaluation, and Control Kernel"**  
> *VNR Vignana Jyothi Institute of Engineering and Technology (VNR VJIET)*

---

## 🏛️ Project Architecture (3 Folders)

The project is structured into three clean, dedicated tiers:

```
OMNI-CHECK/
├── client/                     # MERN Frontend (React 18 + Vite + Tailwind CSS)
│   ├── src/
│   │   ├── components/         # Glassmorphic UI, Evidence Graph Visualizer, Neural Canvas
│   │   ├── pages/
│   │   │   ├── HomePage.jsx                 # Futuristic landing & platform overview
│   │   │   ├── ComplianceInvestigation.jsx  # Module 1: Document audit, policy compiler & graph
│   │   │   ├── HRSuite.jsx                  # Module 2: Requisitions, candidate pipeline & resume parser
│   │   │   ├── LiveInterviewRoom.jsx        # Module 2: Webcam proctoring, mic/speech & honeypot
│   │   │   ├── CandidateReportView.jsx      # Module 2: 4-Competency audit & question-by-question QA report
│   │   │   ├── EmployeePortal.jsx           # Module 3: NEX_AI adaptive evaluation portal
│   │   │   └── HRDashboard.jsx              # Executive HR analytics & batch Excel console
│   │   └── services/api.js     # Unified REST & WebSocket client
│   └── package.json
│
├── server/                     # MERN Backend (Node.js + Express + MongoDB)
│   ├── config/db.js            # Dual-Mode Persistence: MongoDB (Mongoose) + Local JSON Fallback
│   ├── models/schemas.js       # Investigation, JobRequirement, CandidateAssessment, ActivityLog
│   ├── routes/
│   │   ├── complianceRoutes.js # /api/compliance/* (investigations, policy compiler, rule engine)
│   │   ├── hrRoutes.js         # /api/hr/* (jobs, candidates, proctoring alerts, evaluations)
│   │   └── assessmentRoutes.js # /api/* (NEX_AI 8-turn adaptive tests, PDF reports, Excel upload)
│   ├── services/
│   │   ├── llmService.js       # Multi-provider LLM coordinator (Gemini 3.x/2.5/1.5 & Groq Llama 3.3)
│   │   ├── policyCompiler.js   # Natural-language policy to structured JSON rules r=(t,e,c,τ,q,x,a,γ,s)
│   │   ├── ruleEngine.js       # Deterministic 3-valued Kleene rule engine (True, False, Unknown)
│   │   ├── documentParser.js   # Multi-format parser (PDF, DOCX, XLSX, TXT, URLs)
│   │   ├── evidenceGraph.js    # W3C PROV-O graph generator & cross-document conflict detector
│   │   └── interviewEngine.js  # 15-Milestone roadmap, Milestone 7 Honeypot Trap, transcript interceptor
│   ├── server.js               # Express HTTP server + WebSocket live interview stream (/ws)
│   └── package.json
│
└── ai-engine/                  # Python AI Research & Adversarial Kernel
    ├── app/
    │   ├── compliance/         # Formal policy compiler, rule engine, cross-doc reasoning
    │   │   ├── omni_bench_*    # Omni-Bench adversarial evaluation benchmark suite
    │   │   ├── policy_compiler.py
    │   │   ├── rule_engine.py
    │   │   └── policy_schema.py
    │   ├── models/             # Domain schemas
    │   └── main.py             # FastAPI microservice for research benchmarking (/compile, /evaluate)
    ├── docs/                   # Architectural blueprints & SVG flow diagrams
    └── requirements.txt
```

---

## 🚀 Key Modules & Capabilities

### 1. Module 1: Document Compliance & Investigation Kernel
- **Policy-to-Executable Compiler**: Formulates natural-language policies into validated structured rules:
  $$r = (t, e, c, \tau, q, x, a, \gamma, s)$$
  Where $t$ is rule type, $e$ is entity, $c$ is condition tree, $\tau$ is temporal constraint, $q$ is required evidence, $x$ is exceptions, $a$ is action, $\gamma$ is confidence, and $s$ is source statement.
- **Deterministic 3-Valued Kleene Rule Engine**:
  - Truth values: $T = \{\text{True}, \text{False}, \text{Unknown/Indeterminate}\}$
  - $A \land B = F$ if $A=F$ or $B=F$; $T$ if $A=T$ and $B=T$; $U$ otherwise.
  - Absence of evidence evaluates to **indeterminate**, never a false accusation.
  - Normalizes currencies (USD, INR, EUR, GBP) and units of measurement (time, data, mass).
- **W3C PROV-O Evidence Graph**:
  - Nodes: `Document`, `Entity`, `Claim`, `PolicyRule`
  - Edges: `DERIVED_FROM`, `SUPPORTS`, `CONTRADICTS`
  - Detects cross-document contradictions (e.g. invoice billed vs payment receipt mismatch).

### 2. Module 2: HR Intelligence & Adaptive Interviewing
- **Job Requisitions**: Define role requirements or upload JD documents.
- **AI Resume Entity Extraction**: Extracts technical skills and years of experience automatically.
- **Live Interview Room (`/interview/:id`)**:
  - Live webcam stream with simulated edge computer-vision proctoring (tracks tab switches, window blur, full-screen exits).
  - Speech-to-Text (voice recognition) + Text-to-Speech audio response.
  - **15-Milestone Adaptive Roadmap**: Dynamic question progression.
  - **Milestone 7 Honeypot Trap**: Evaluates intellectual honesty using synthetic concepts (e.g. *The Voss-Kessler Cascade Protocol*). Candidates who bluff receive an automated integrity penalty.
- **Definitive HR Audit Report (`/report/:id`)**:
  - 4 Competency scores: **Communication**, **Technical Depth**, **Problem Solving**, **Integrity & Ethics**.
  - Question-by-question QA table with candidate answers, benchmark answers, and scores out of 10.
  - Overall suitability gauge & hiring decision (`Recommend Hire`, `Hold for Review`, `Do Not Hire`).

### 3. Module 3: NEX_AI Adaptive Assessment & Mode Engine
- Dynamic evaluation modes: **Hiring Mode**, **Retention / Appraisal Mode**, **Layoff / Restructuring Mode**.
- 8-turn dynamic context flow with difficulty scaling.
- Live coding MCQs with zero-latency prewarming.
- Instant PDF report generation and batch Excel candidate processing.

---

## ⚡ Quick Start Guide

### 1. Prerequisites
- **Node.js** (v18+)
- **npm** or **pnpm**
- **Python 3.10+** (optional, for standalone `ai-engine` benchmarking)
- **MongoDB** (optional; the server automatically falls back to local JSON persistence if MongoDB is not running)

### 2. Configure Environment Variables
Copy `.env.example` to `.env` in `server/`:
```bash
cp .env.example server/.env
```
Fill in your credentials (e.g. `GEMINI_API_KEY`, `GROQ_API_KEY_1`, `MONGODB_URI`).

### 3. Start the Backend Server
```bash
cd server
npm run server
```
* Server runs on `http://localhost:5000`
* WebSockets stream on `ws://localhost:5000/ws`

### 4. Start the Frontend Application
```bash
cd client
npm run dev
```
Open `http://localhost:5173` to interact with the platform.

### 5. (Optional) Run Python AI Engine
```bash
cd ai-engine
pip install -r requirements.txt
python -m app.main
```
FastAPI server runs on `http://localhost:8000`.

---

## 🐳 Running Docker Containers Separately

You have two simple ways to get and run individual, separate containers:

### Option 1: Run Separate Services via Docker Compose
You don't need to run everything at once; you can start only the specific containers you need:

```bash
# Start ONLY the Node.js Server container:
docker-compose up -d server

# Start ONLY the React Client container:
docker-compose up -d client

# Start ONLY the Python AI Engine container:
docker-compose up -d ai-engine

# Start standalone MongoDB & Redis containers:
docker-compose up -d mongo redis
```

To see running separate containers:
```bash
docker ps
```

To stop a specific container:
```bash
docker-compose stop server
```

### Option 2: Build & Run Individual Raw Docker Containers
You can build and run any container completely standalone:

```bash
# 1. Build and run Server Container alone:
docker build -t omnicheck-server ./server
docker run -d --name my-server -p 5000:5000 --env-file server/.env omnicheck-server

# 2. Build and run Client Container alone:
docker build -t omnicheck-client ./client
docker run -d --name my-client -p 80:80 omnicheck-client

# 3. Build and run AI Engine Container alone:
docker build -t omnicheck-ai ./ai-engine
docker run -d --name my-ai-engine -p 8000:8000 --env-file ai-engine/.env omnicheck-ai
```

---

## 🌐 Full Stack One-Command Orchestration
If you ever want all 5 containers to boot together in a unified network:
```bash
docker-compose up --build -d
```



---

## 🔒 Security & Privacy
- Zero credential leakage: secrets are managed exclusively through environment variables.
- Resilient local fallback allows full evaluation without cloud dependencies or database instances.

