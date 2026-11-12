const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const xlsx = require('xlsx');
const mammoth = require('mammoth');
const fetch = require('node-fetch');
const llmService = require('./llmService');

class DocumentParser {
  async parseFile(filePath, originalFilename) {
    const ext = path.extname(originalFilename || filePath).toLowerCase();
    let text = '';

    try {
      if (ext === '.pdf') {
        const buffer = fs.readFileSync(filePath);
        const data = await pdfParse(buffer);
        text = data.text || '';
      } else if (ext === '.docx' || ext === '.doc') {
        const result = await mammoth.extractRawText({ path: filePath });
        text = result.value || '';
      } else if (ext === '.xlsx' || ext === '.xls' || ext === '.csv') {
        const workbook = xlsx.readFile(filePath);
        const sheetNames = workbook.SheetNames;
        text = sheetNames.map(name => {
          const sheet = workbook.Sheets[name];
          return `--- Sheet: ${name} ---\n` + xlsx.utils.sheet_to_csv(sheet);
        }).join('\n\n');
      } else if (ext === '.json') {
        const raw = fs.readFileSync(filePath, 'utf8');
        text = raw;
      } else {
        // Plain text, markdown, etc.
        text = fs.readFileSync(filePath, 'utf8');
      }
    } catch (err) {
      console.warn(`[DocumentParser] Error parsing ${originalFilename}:`, err.message);
      text = `[Error parsing document: ${err.message}]`;
    }

    return {
      filename: originalFilename || path.basename(filePath),
      fileType: ext.replace('.', '').toUpperCase(),
      extractedChars: text.length,
      text
    };
  }

  async fetchUrlContent(url) {
    try {
      const resp = await fetch(url, { timeout: 8000 });
      if (!resp.ok) return `[Failed to fetch ${url}: HTTP ${resp.status}]`;
      const html = await resp.text();
      // Simple HTML stripping
      const cleaned = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      return cleaned.slice(0, 15000);
    } catch (e) {
      return `[Error fetching URL ${url}: ${e.message}]`;
    }
  }

  // Extract structured facts & evidence from all document texts and URLs
  async extractFactsAndEvidence({ documentTexts = [], urlTexts = [], objective = '' }) {
    const combinedCorpus = [
      ...documentTexts.map(d => `--- DOCUMENT: ${d.filename} ---\n${d.text}`),
      ...urlTexts.map(u => `--- SOURCE URL: ${u.url} ---\n${u.text}`)
    ].join('\n\n').slice(0, 25000);

    // Heuristic regex extractions for high confidence
    const extractedDates = combinedCorpus.match(/\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/g) || [];
    const extractedAmounts = combinedCorpus.match(/(?:[$€₹£]|USD|INR|EUR|GBP)\s*[\d,]+(?:\.\d{2})?/gi) || [];

    // Prompt LLM for structured domain entity facts and evidence records
    const systemPrompt = `You are a FACT & EVIDENCE EXTRACTION KERNEL.
Read the submitted document corpus and extract all verifiable entities, claims, numerical values, and evidence records relevant to the investigation objective.

Return strictly valid JSON only:
{
  "facts": {
    "entity_name": {
      "field_name": "value or number or boolean",
      "amount": 10000,
      "currency": "USD"
    }
  },
  "evidence": [
    {
      "id": "ev_1",
      "type": "official_receipt | security_signoff | manager_approval | legal_review | etc",
      "source_document": "document filename",
      "statement": "exact factual quote confirming evidence",
      "attributes": {}
    }
  ],
  "detected_claims": [
    {
      "subject": "entity",
      "claim": "text of claim",
      "provenance": "document name"
    }
  ]
}`;

    const prompt = `Investigation Objective: ${objective || 'General Compliance Investigation'}\n\nDocument Corpus:\n${combinedCorpus}`;

    const extracted = await llmService.generateJSON({
      prompt,
      systemPrompt,
      temperature: 0.1
    });

    const defaultFacts = {
      dates: extractedDates.slice(0, 5),
      amounts: extractedAmounts.slice(0, 5)
    };

    const facts = (extracted && typeof extracted.facts === 'object') ? { ...defaultFacts, ...extracted.facts } : defaultFacts;
    const evidence = (extracted && Array.isArray(extracted.evidence)) ? extracted.evidence : [];
    const claims = (extracted && Array.isArray(extracted.detected_claims)) ? extracted.detected_claims : [];

    return {
      facts,
      evidence,
      claims
    };
  }
}

module.exports = new DocumentParser();

