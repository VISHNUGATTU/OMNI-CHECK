const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { Investigation } = require('../models/schemas');
const policyCompiler = require('../services/policyCompiler');
const ruleEngine = require('../services/ruleEngine');
const documentParser = require('../services/documentParser');
const evidenceGraph = require('../services/evidenceGraph');
const vectorService = require('../services/vectorService');
const queueService = require('../services/queueService');
const aiEngineClient = require('../services/aiEngineClient');

// Multer storage for uploaded compliance documents
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_'));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB max
});

// Run compliance investigation (synchronous with queue event telemetry)
router.post('/investigate', upload.fields([
  { name: 'documents', maxCount: 10 },
  { name: 'rulebookFile', maxCount: 1 }
]), async (req, res) => {
  const startTime = Date.now();
  const job = queueService.createJob({
    type: 'COMPLIANCE_INVESTIGATION',
    payload: { objective: req.body.objective }
  });

  try {
    const { objective, rulebookText, urls } = req.body;
    
    if (!objective || !objective.trim()) {
      queueService.failJob(job.id, new Error('Investigation objective is required.'));
      return res.status(400).json({ error: 'Investigation objective is required.' });
    }

    // 1. Process Rulebook Text
    queueService.updateProgress(job.id, { progress: 15, stage: 'Parsing Rulebook & Target Files' });
    let finalRulebookText = (rulebookText || '').trim();
    if (req.files && req.files.rulebookFile && req.files.rulebookFile[0]) {
      const parsedRuleFile = await documentParser.parseFile(
        req.files.rulebookFile[0].path, 
        req.files.rulebookFile[0].originalname
      );
      finalRulebookText = parsedRuleFile.text + '\n' + finalRulebookText;
    }

    // 2. Parse Uploaded Documents & Embed into Vector Store
    const documentTexts = [];
    const targetDocsMeta = [];
    vectorService.clear();

    if (req.files && req.files.documents) {
      for (const file of req.files.documents) {
        const parsed = await documentParser.parseFile(file.path, file.originalname);
        documentTexts.push(parsed);
        targetDocsMeta.push({
          filename: parsed.filename,
          fileType: parsed.fileType,
          extractedChars: parsed.extractedChars
        });

        // Index document chunks into Semantic Vector Store
        await vectorService.addDocument({
          id: parsed.filename,
          text: parsed.text.slice(0, 3000),
          metadata: { fileType: parsed.fileType }
        });
      }
    }

    // 3. Process URL sources if provided
    const urlTexts = [];
    const targetUrls = [];
    if (urls) {
      const urlList = Array.isArray(urls) ? urls : urls.split(',').map(u => u.trim()).filter(Boolean);
      for (const u of urlList) {
        targetUrls.push(u);
        const text = await documentParser.fetchUrlContent(u);
        urlTexts.push({ url: u, text });

        await vectorService.addDocument({
          id: u,
          text: text.slice(0, 3000),
          metadata: { type: 'URL' }
        });
      }
    }

    // 4. Semantic Search ranking for relevant clauses
    queueService.updateProgress(job.id, { progress: 35, stage: 'Semantic Retrieval & Policy Compilation' });
    const semanticHits = await vectorService.search(objective, 3);

    // 5. Compile Policy into Structured Rules: r = (t, e, c, tau, q, x, a, gamma, s)
    // Try Python AI Engine microservice if active, else local JS compiler
    let compilerResult = await aiEngineClient.compilePolicy(finalRulebookText || objective);
    if (!compilerResult) {
      compilerResult = await policyCompiler.compile(finalRulebookText || objective);
    }
    const compiledRules = compilerResult.rules || [];

    // 6. Extract Facts and Evidence from parsed documents
    queueService.updateProgress(job.id, { progress: 60, stage: 'Fact Extraction & Kleene Logic' });
    const extractionResult = await documentParser.extractFactsAndEvidence({
      documentTexts,
      urlTexts,
      objective
    });

    const { facts, evidence, claims } = extractionResult;

    // 7. Execute Deterministic 3-Valued Kleene Rule Engine
    let ruleEngineResult = await aiEngineClient.evaluateRules(compiledRules, facts, evidence);
    if (!ruleEngineResult) {
      ruleEngineResult = ruleEngine.evaluate({
        rules: compiledRules,
        facts,
        evidence,
        evaluationDate: new Date()
      });
    }

    // 8. Construct W3C PROV-O Evidence Graph & Conflict Detection
    queueService.updateProgress(job.id, { progress: 85, stage: 'W3C PROV-O Graph Assembly' });
    const graphResult = evidenceGraph.buildGraph({
      documents: targetDocsMeta,
      facts,
      evidence,
      claims,
      rules: compiledRules,
      ruleEvaluations: ruleEngineResult.ruleEvaluations
    });

    const latencyMs = Date.now() - startTime;

    // 9. Persist Investigation Record
    const investigationRecord = await Investigation.create({
      title: `Investigation: ${objective.slice(0, 50)}...`,
      objective,
      rulebookText: finalRulebookText,
      targetDocuments: targetDocsMeta,
      targetUrls,
      extractedFacts: facts,
      compiledRules,
      unparsedStatements: compilerResult.unparsed_statements,
      ruleEngineResult,
      evidenceGraph: {
        nodes: graphResult.nodes,
        edges: graphResult.edges
      },
      metrics: {
        latencyMs,
        rulesCount: compiledRules.length,
        documentsCount: targetDocsMeta.length,
        conflictsDetected: graphResult.conflictsCount,
        semanticHitsCount: semanticHits.length
      }
    });

    queueService.completeJob(job.id, investigationRecord);

    return res.json({
      success: true,
      jobId: job.id,
      investigation: investigationRecord
    });
  } catch (err) {
    console.error('[Compliance Router] Investigation error:', err);
    queueService.failJob(job.id, err);
    return res.status(500).json({ error: 'Internal investigation failed: ' + err.message });
  }
});

// Poll background job status
router.get('/jobs/:jobId', (req, res) => {
  const job = queueService.getJob(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  return res.json(job);
});

// List investigations
router.get('/investigations', async (req, res) => {
  try {
    const list = await Investigation.find();
    return res.json(list);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Get investigation details
router.get('/investigations/:id', async (req, res) => {
  try {
    const inv = await Investigation.findById(req.params.id);
    if (!inv) return res.status(404).json({ error: 'Investigation not found.' });
    return res.json(inv);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Direct policy compiler endpoint
router.post('/compile-policy', async (req, res) => {
  try {
    const { policyText } = req.body;
    let result = await aiEngineClient.compilePolicy(policyText);
    if (!result) {
      result = await policyCompiler.compile(policyText);
    }
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Direct rule engine execution endpoint
router.post('/evaluate-rules', async (req, res) => {
  try {
    const { rules, facts, evidence, evaluationDate } = req.body;
    let result = await aiEngineClient.evaluateRules(rules, facts, evidence);
    if (!result) {
      result = ruleEngine.evaluate({
        rules: rules || [],
        facts: facts || {},
        evidence: evidence || [],
        evaluationDate: evaluationDate || new Date()
      });
    }
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Semantic Vector Similarity query endpoint
router.post('/semantic-search', async (req, res) => {
  try {
    const { query, topK } = req.body;
    const results = await vectorService.search(query || '', topK || 5);
    return res.json({ query, results });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
