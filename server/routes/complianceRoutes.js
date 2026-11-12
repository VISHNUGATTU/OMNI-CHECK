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

// Run full asynchronous compliance investigation
router.post('/investigate', upload.fields([
  { name: 'documents', maxCount: 10 },
  { name: 'rulebookFile', maxCount: 1 }
]), async (req, res) => {
  const startTime = Date.now();
  try {
    const { objective, rulebookText, urls } = req.body;
    
    if (!objective || !objective.trim()) {
      return res.status(400).json({ error: 'Investigation objective is required.' });
    }

    // 1. Process Rulebook Text
    let finalRulebookText = (rulebookText || '').trim();
    if (req.files && req.files.rulebookFile && req.files.rulebookFile[0]) {
      const parsedRuleFile = await documentParser.parseFile(
        req.files.rulebookFile[0].path, 
        req.files.rulebookFile[0].originalname
      );
      finalRulebookText = parsedRuleFile.text + '\n' + finalRulebookText;
    }

    // 2. Parse Uploaded Documents
    const documentTexts = [];
    const targetDocsMeta = [];
    if (req.files && req.files.documents) {
      for (const file of req.files.documents) {
        const parsed = await documentParser.parseFile(file.path, file.originalname);
        documentTexts.push(parsed);
        targetDocsMeta.push({
          filename: parsed.filename,
          fileType: parsed.fileType,
          extractedChars: parsed.extractedChars
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
      }
    }

    // 4. Compile Policy into Structured Rules: r = (t, e, c, tau, q, x, a, gamma, s)
    const compilerResult = await policyCompiler.compile(finalRulebookText || objective);
    const compiledRules = compilerResult.rules || [];

    // 5. Extract Facts and Evidence from parsed documents
    const extractionResult = await documentParser.extractFactsAndEvidence({
      documentTexts,
      urlTexts,
      objective
    });

    const { facts, evidence, claims } = extractionResult;

    // 6. Execute Deterministic 3-Valued Kleene Rule Engine
    const ruleEngineResult = ruleEngine.evaluate({
      rules: compiledRules,
      facts,
      evidence,
      evaluationDate: new Date()
    });

    // 7. Construct W3C PROV-O Evidence Graph & Conflict Detection
    const graphResult = evidenceGraph.buildGraph({
      documents: targetDocsMeta,
      facts,
      evidence,
      claims,
      rules: compiledRules,
      ruleEvaluations: ruleEngineResult.ruleEvaluations
    });

    const latencyMs = Date.now() - startTime;

    // 8. Persist Investigation Record
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
        conflictsDetected: graphResult.conflictsCount
      }
    });

    return res.json({
      success: true,
      investigation: investigationRecord
    });
  } catch (err) {
    console.error('[Compliance Router] Investigation error:', err);
    return res.status(500).json({ error: 'Internal investigation failed: ' + err.message });
  }
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
    const result = await policyCompiler.compile(policyText);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Direct rule engine execution endpoint
router.post('/evaluate-rules', (req, res) => {
  try {
    const { rules, facts, evidence, evaluationDate } = req.body;
    const result = ruleEngine.evaluate({
      rules: rules || [],
      facts: facts || {},
      evidence: evidence || [],
      evaluationDate: evaluationDate || new Date()
    });
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;

