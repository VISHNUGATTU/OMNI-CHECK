const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { MODES, DEFAULT_MODE, getModeConfig } = require('../data/modesConfig');

const REPORTS_DIR = path.join(__dirname, '..', 'reports');
const META_FILE = path.join(REPORTS_DIR, 'reports_meta.json');

// Ensure reports directory exists
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

// Load metadata cache
function loadReportsMeta() {
  try {
    if (fs.existsSync(META_FILE)) {
      return JSON.parse(fs.readFileSync(META_FILE, 'utf8'));
    }
  } catch (err) {
    console.warn('Could not read reports_meta.json:', err.message);
  }
  return {};
}

// Save metadata cache
function saveReportMeta(filename, meta) {
  try {
    const current = loadReportsMeta();
    current[filename] = {
      ...meta,
      updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(META_FILE, JSON.stringify(current, null, 2), 'utf8');
  } catch (err) {
    console.warn('Could not save reports_meta.json:', err.message);
  }
}

/**
 * Format filename as name_empid_mode_time.pdf
 */
function formatReportFilename(name, employeeId, modeKey = DEFAULT_MODE) {
  const cleanName = (name || 'Candidate').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanId = (employeeId || 'ID').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanMode = (modeKey || DEFAULT_MODE).toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const timeStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `${cleanName}_${cleanId}_${cleanMode}_${timeStr}.pdf`;
}

/**
 * Generates an executive PDF report tailored to the chosen mode:
 * - Hiring
 * - Assessment
 * - Retention
 * - Layoff
 */
function generateAssessmentPDF({ employee = {}, assessment = {}, metrics = {}, filename, mode }) {
  return new Promise((resolve, reject) => {
    try {
      const modeConfig = getModeConfig(mode || metrics.mode);
      const modeKey = modeConfig.id;

      if (!filename) {
        filename = formatReportFilename(employee.name, employee.id || assessment.employee_id, modeKey);
      }

      const filePath = path.join(REPORTS_DIR, filename);
      const doc = new PDFDocument({ margin: 40, size: 'A4', bufferPages: true });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Determine Primary Theme Colors
      const primaryHex = modeConfig.themeColor || '#1e3a8a';
      const secondaryHex = modeKey === 'hiring' ? '#047857' : 
                           modeKey === 'assessment' ? '#1d4ed8' : 
                           modeKey === 'layoff' ? '#991b1b' : '#6d28d9';

      // 1. Header Banner
      doc.rect(40, 40, 515, 62).fill(primaryHex);
      doc.fillColor('#ffffff').fontSize(14).font('Helvetica-Bold').text(modeConfig.headerTitle, 55, 52);
      doc.fontSize(8.5).font('Helvetica').fillColor('#e2e8f0').text(modeConfig.headerSubtitle, 55, 74);

      // Mode Badge inside Header Banner (top right)
      const modeBadgeText = modeConfig.badge;
      const modeBadgeWidth = doc.widthOfString(modeBadgeText, { size: 9 }) + 16;
      doc.rect(535 - modeBadgeWidth, 50, modeBadgeWidth, 22).fill('#ffffff');
      doc.fillColor(primaryHex).fontSize(8.5).font('Helvetica-Bold').text(modeBadgeText, 535 - modeBadgeWidth + 8, 56);

      // 2. Meta Info Box
      const metaY = 112;
      doc.rect(40, metaY, 515, 54).fillAndStroke('#f8fafc', '#cbd5e1');
      doc.fillColor('#0f172a').fontSize(8.5);

      // Row 1
      doc.font('Helvetica-Bold').text(modeKey === 'hiring' ? 'CANDIDATE NAME:' : 'EMPLOYEE NAME:', 55, metaY + 10);
      doc.font('Helvetica').text(employee.name || 'Not specified', 170, metaY + 10);

      doc.font('Helvetica-Bold').text(modeKey === 'hiring' ? 'CANDIDATE / REF ID:' : 'EMPLOYEE ID:', 330, metaY + 10);
      doc.font('Helvetica').text(employee.id || assessment.employee_id || 'N/A', 440, metaY + 10);

      // Row 2
      doc.font('Helvetica-Bold').text('TARGET POSITION:', 55, metaY + 28);
      doc.font('Helvetica').text(employee.role || 'General Role Competency', 170, metaY + 28);

      doc.font('Helvetica-Bold').text('EVALUATION DATE:', 330, metaY + 28);
      doc.font('Helvetica').text(new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 440, metaY + 28);

      let currentY = 178;

      // Section Heading Helper
      function addSectionHeader(title, badgeText, badgeColor = secondaryHex) {
        if (currentY > 700) {
          doc.addPage();
          currentY = 45;
        }

        doc.rect(40, currentY, 515, 24).fill('#1e293b');
        doc.fillColor('#ffffff').fontSize(9.5).font('Helvetica-Bold').text(title, 52, currentY + 7);

        if (badgeText) {
          const badgeWidth = Math.min(235, doc.widthOfString(badgeText, { size: 7.5 }) + 18);
          doc.rect(545 - badgeWidth, currentY + 3.5, badgeWidth, 17).fill(badgeColor);
          doc.fillColor('#ffffff').fontSize(7.5).font('Helvetica-Bold').text(badgeText, 545 - badgeWidth + 9, currentY + 7.5);
        }

        currentY += 32;
      }

      // Helper to color-code multi-tier Executive Decisions across all 4 modes
      function getDecisionBadgeColor(decisionText = '') {
        const lower = String(decisionText).toLowerCase();
        if (
          lower.includes('do not') ||
          lower.includes('separation') ||
          lower.includes('pip') ||
          lower.includes('redundant') ||
          lower.includes('flag for review')
        ) {
          return '#dc2626'; // Red - Reject / Do Not Hire / Do Not Retain
        }
        if (
          lower.includes('hold') ||
          lower.includes('conditional') ||
          lower.includes('revisit') ||
          lower.includes('reassign') ||
          lower.includes('redeploy') ||
          lower.includes('intervention') ||
          lower.includes('needs development')
        ) {
          return '#d97706'; // Amber - Keep on Hold / Conditional / Reassign / Intervention
        }
        if (
          lower.includes('strong') ||
          lower.includes('promote') ||
          lower.includes('fast-track') ||
          lower.includes('must retain') ||
          lower.includes('priority retain') ||
          lower.includes('exceed')
        ) {
          return '#059669'; // Emerald - Top Tier Verdict
        }
        return '#2563eb'; // Blue - Standard Positive (Hire / Retain / Meets Expectations)
      }

      // Paragraph Helper
      function addParagraph(label, content, indent = 0) {
        if (currentY > 720) {
          doc.addPage();
          currentY = 45;
        }

        if (label) {
          doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(8.5).text(label, 45 + indent, currentY);
          currentY += 12;
        }

        if (content !== undefined && content !== null && content !== '') {
          const safeText = Array.isArray(content)
            ? content.map((item) => `• ${String(item)}`).join('\n')
            : typeof content === 'object'
            ? JSON.stringify(content)
            : String(content);
          doc.fillColor('#334155').font('Helvetica').fontSize(8.5).text(safeText, 45 + indent, currentY, {
            width: 505 - indent,
            lineGap: 3
          });
          currentY = doc.y + 10;
        }
      }

      // Helper for Badge Tags
      function addPillTags(items, defaultText = 'None specified', pillBg = '#eff6ff', pillBorder = '#bfdbfe', pillText = '#1d4ed8') {
        if (currentY > 720) {
          doc.addPage();
          currentY = 45;
        }

        const tagList = Array.isArray(items) && items.length > 0 ? items : [defaultText];
        let startX = 45;

        for (const item of tagList) {
          const textStr = String(item);
          const width = doc.widthOfString(textStr, { size: 7.5 }) + 14;
          if (startX + width > 540) {
            startX = 45;
            currentY += 19;
          }
          doc.rect(startX, currentY, width, 15).fillAndStroke(pillBg, pillBorder);
          doc.fillColor(pillText).fontSize(7.5).font('Helvetica-Bold').text(textStr, startX + 7, currentY + 3.5);
          startX += width + 6;
        }
        currentY += 22;
      }

      // Helper to render Coding MCQ Score + Per-Question Correct/Incorrect Breakdown
      function addCodingMcqBreakdown(accentColor = '#065f46') {
        if (!metrics.codingMcqScore) return;
        if (currentY > 700) {
          doc.addPage();
          currentY = 45;
        }

        doc.fillColor(accentColor).font('Helvetica-Bold').fontSize(8.5).text(`Coding MCQs Output Accuracy: ${metrics.codingMcqScore}`, 45, currentY);
        currentY += 14;

        const details = Array.isArray(metrics.codingMcqDetails) ? metrics.codingMcqDetails : [];
        for (const item of details) {
          if (currentY > 730) {
            doc.addPage();
            currentY = 45;
          }
          const isOk = Boolean(item.isCorrect);
          const badgeBg = isOk ? '#dcfce7' : '#fee2e2';
          const badgeBorder = isOk ? '#86efac' : '#fca5a5';
          const badgeFg = isOk ? '#166534' : '#991b1b';
          const statusLabel = isOk ? 'CORRECT' : 'INCORRECT';

          doc.rect(45, currentY, 54, 14).fillAndStroke(badgeBg, badgeBorder);
          doc.fillColor(badgeFg).font('Helvetica-Bold').fontSize(7).text(statusLabel, 50, currentY + 3.5);

          const userAnsStr = String(item.userAnswer || 'No response').replace(/\s+/g, ' ').slice(0, 75);
          const expectedSuffix = !isOk && item.correctOption
            ? `  (Correct: Option ${item.correctOption}${item.correctAnswerText ? ` — ${String(item.correctAnswerText).slice(0, 35)}` : ''})`
            : '';
          doc.fillColor('#334155').font('Helvetica').fontSize(8).text(
            `MCQ #${item.number}: ${userAnsStr}${expectedSuffix}`,
            106,
            currentY + 2.5,
            { width: 440 }
          );
          currentY = Math.max(currentY + 17, doc.y + 4);
        }
      }

      // ==========================================
      // MODE 1: HIRING EVALUATION REPORT
      // ==========================================
      if (modeKey === 'hiring') {
        const hireRec = metrics.hiringRecommendation || {};
        const decision = hireRec.decision || metrics.executiveDecision || 'Hire';
        const decisionBadgeColor = getDecisionBadgeColor(decision);

        addSectionHeader('1. EXECUTIVE CANDIDATE SUMMARY & HIRING RECOMMENDATION', `DECISION: ${decision.toUpperCase()}`, decisionBadgeColor);
        addParagraph('Candidate Overview & Evaluation:', metrics.summary || 'Candidate demonstrated verified competencies through targeted technical and collaboration probing.');
        if (hireRec.rationale) {
          addParagraph('Hiring Decision Rationale:', hireRec.rationale);
        }
        currentY += 4;

        addSectionHeader('2. TECHNICAL SKILLS & ROLE BENCHMARK MATCH');
        const demonstrated = metrics.technicalSkills?.demonstratedSkills || metrics.skillsSummary || [];
        const growth = metrics.technicalSkills?.growthOpportunities || [];
        
        doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(8.5).text('Verified Candidate Competencies:', 45, currentY);
        currentY += 13;
        addPillTags(demonstrated, 'Technical proficiency demonstrated', '#ecfdf5', '#a7f3d0', '#047857');

        if (growth.length > 0) {
          doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(8.5).text('Target Competencies Needing Onboarding Focus:', 45, currentY);
          currentY += 13;
          addPillTags(growth, 'None flagged', '#fffbeb', '#fde68a', '#b45309');
        }

        if (metrics.technicalSkills?.analysis) {
          addParagraph('Technical Depth & Competency Analysis:', metrics.technicalSkills.analysis);
        }
        addCodingMcqBreakdown('#065f46');
        currentY += 4;

        addSectionHeader('3. RESUME VERIFICATION & REAL-WORLD PROBLEM SOLVING');
        const resumeVer = metrics.resumeVerification || {};
        const credScore = resumeVer.credibilityScore ?? 9;
        doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(8.5).text(`Resume Credibility & Evidence Verification (Score: ${credScore}/10):`, 45, currentY);
        currentY += 13;
        if (resumeVer.verifiedClaims && resumeVer.verifiedClaims.length > 0) {
          addPillTags(resumeVer.verifiedClaims, 'Claims verified against responses', '#eff6ff', '#bfdbfe', '#1d4ed8');
        }
        if (resumeVer.analysis) {
          addParagraph('Problem Solving Under Constraints:', resumeVer.analysis);
        }
        currentY += 4;

        addSectionHeader('4. TEAM COLLABORATION & CULTURAL SYNERGY', `Score: ${metrics.collaboration?.score ?? 8}/10 (${metrics.collaboration?.level || 'Strong'})`, '#059669');
        addParagraph('Collaboration Style & Teamwork Fit:', metrics.collaboration?.analysis || 'Demonstrates communicative habits and accountability within project teams.');
        currentY += 4;

        if (Array.isArray(metrics.strengths) && metrics.strengths.length > 0) {
          addSectionHeader('5. KEY CANDIDATE STRENGTHS & VALUE MULTIPLIERS');
          addPillTags(metrics.strengths, 'Strong foundational experience', '#ecfdf5', '#a7f3d0', '#047857');
          if (Array.isArray(metrics.growthAreas) && metrics.growthAreas.length > 0) {
            doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(8.5).text('Growth Areas for 90-Day Ramp:', 45, currentY);
            currentY += 13;
            addPillTags(metrics.growthAreas, 'Standard onboarding pace', '#f1f5f9', '#cbd5e1', '#475569');
          }
        }
      }

      // ==========================================
      // MODE 2: ASSESSMENT (WORK SKILLS & PERFORMANCE)
      // ==========================================
      else if (modeKey === 'assessment') {
        const perf = metrics.performanceRating || {};
        const rating = perf.decision || perf.rating || metrics.executiveDecision || 'Meets Expectations (Retain)';
        const ratingColor = getDecisionBadgeColor(rating);

        addSectionHeader('1. WORK PERFORMANCE SUMMARY & VERDICT', `VERDICT: ${rating.toUpperCase()}`, ratingColor);
        addParagraph('Work Skills Executive Summary:', metrics.summary || 'Employee completed structured work skills evaluation covering technical depth, deliverable quality, and execution speed.');
        if (perf.analysis) {
          addParagraph('Performance Appraisal & Decision Rationale:', perf.analysis);
        }
        currentY += 4;

        addSectionHeader('2. CORE WORK COMPETENCIES & TECHNICAL MASTERY');
        const demonstrated = metrics.technicalSkills?.demonstratedSkills || metrics.workSkills?.demonstratedCompetencies || [];
        const gaps = metrics.technicalSkills?.growthOpportunities || metrics.workSkills?.skillGaps || [];

        doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(8.5).text('Demonstrated Work Competencies:', 45, currentY);
        currentY += 13;
        addPillTags(demonstrated, 'Core deliverables mastered', '#eff6ff', '#bfdbfe', '#1d4ed8');

        if (gaps.length > 0) {
          doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(8.5).text('Target Upskilling Competencies:', 45, currentY);
          currentY += 13;
          addPillTags(gaps, 'On-track for current role', '#fffbeb', '#fde68a', '#b45309');
        }

        if (metrics.technicalSkills?.analysis || metrics.workSkills?.technicalMasteryAnalysis) {
          addParagraph('Technical Execution Analysis:', metrics.technicalSkills?.analysis || metrics.workSkills?.technicalMasteryAnalysis);
        }
        addCodingMcqBreakdown('#1e40af');
        currentY += 4;

        const exec = metrics.executionEfficiency || {};
        const execScore = exec.score ?? 8;
        addSectionHeader('3. EXECUTION QUALITY & OPERATIONAL EFFICIENCY', `Score: ${execScore}/10 (${exec.level || 'High'})`, '#2563eb');
        addParagraph('Delivery Velocity & Code/Work Quality:', exec.analysis || 'Consistently maintains execution quality and adheres to project deadlines.');
        currentY += 4;

        const impact = metrics.projectImpact || {};
        addSectionHeader('4. PROJECT DELIVERY, OWNERSHIP & BUSINESS IMPACT', `Ownership: ${impact.ownershipScore ?? 8}/10`, '#059669');
        addParagraph('Value Delivered to Team:', impact.deliveredValue || 'Active contributor to key milestones with high ownership.');
        currentY += 4;

        if (Array.isArray(metrics.upskillingRoadmap) && metrics.upskillingRoadmap.length > 0) {
          addSectionHeader('5. PROFESSIONAL UPSKILLING & DEVELOPMENT ROADMAP');
          addPillTags(metrics.upskillingRoadmap, 'Continuous role progression', '#f5f3ff', '#ddd6fe', '#6d28d9');
        }
      }

      // ==========================================
      // MODE 3: RETENTION (ORIGINAL TALENT RETENTION)
      // ==========================================
      else if (modeKey === 'retention') {
        const retDecObj = metrics.retentionDecision || {};
        const retDecision =
          retDecObj.decision ||
          metrics.executiveDecision ||
          (metrics.attritionRisk?.level === 'High' ? 'Immediate HR Intervention' : 'Retain & Engage');
        const retDecisionColor = getDecisionBadgeColor(retDecision);

        addSectionHeader('1. EXECUTIVE TALENT & RETENTION SUMMARY', `DECISION: ${retDecision.toUpperCase()}`, retDecisionColor);
        addParagraph('Performance & Assessment Overview:', metrics.summary || 'Talent retention assessment reviewing technical depth, motivation, burnout risk, and flight indicators.');
        if (retDecObj.rationale) {
          addParagraph('Retention Decision Rationale:', retDecObj.rationale);
        }
        if (employee.hr_work_history) {
          addParagraph('Verified HR Background & History:', employee.hr_work_history);
        }
        currentY += 4;

        addSectionHeader('2. TECHNICAL SKILLS & COMPETENCIES');
        const demonstratedSkills = metrics.technicalSkills?.demonstratedSkills || metrics.skillsSummary || [];
        const growthOpportunities = metrics.technicalSkills?.growthOpportunities || [];

        doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(8.5).text('Demonstrated Core Competencies:', 45, currentY);
        currentY += 13;
        addPillTags(demonstratedSkills, 'Standard competency demonstrated', '#eff6ff', '#bfdbfe', '#1d4ed8');

        if (growthOpportunities.length > 0) {
          doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(8.5).text('Target Growth Opportunities & Upskilling Areas:', 45, currentY);
          currentY += 13;
          addPillTags(growthOpportunities, 'No immediate gaps identified', '#fffbeb', '#fde68a', '#b45309');
        }

        if (metrics.technicalSkills?.analysis) {
          addParagraph('Technical Competency Evaluation:', metrics.technicalSkills.analysis);
        }
        addCodingMcqBreakdown('#6b21a8');
        currentY += 4;

        const engScore = metrics.engagement?.score ?? metrics.engagementScore ?? 8;
        const engLevel = metrics.engagement?.level || (engScore >= 7 ? 'High' : engScore >= 4 ? 'Moderate' : 'Low');
        const engBadgeColor = engScore >= 7 ? '#059669' : engScore >= 4 ? '#d97706' : '#dc2626';
        addSectionHeader('3. EMPLOYEE ENGAGEMENT & MOTIVATION', `Score: ${engScore}/10 (${engLevel})`, engBadgeColor);
        addParagraph('Engagement Assessment & Drive:', metrics.engagement?.analysis || `Candidate displays ${engLevel.toLowerCase()} motivation for deliverables.`);
        currentY += 4;

        const attrLevel = metrics.attritionRisk?.level || metrics.attritionRisk || 'Low';
        const attrBadgeColor = attrLevel === 'High' ? '#dc2626' : attrLevel === 'Medium' ? '#d97706' : '#059669';
        addSectionHeader('4. ATTRITION RISK & RETENTION STRATEGY', `Risk Level: ${attrLevel}`, attrBadgeColor);
        if (Array.isArray(metrics.attritionRisk?.riskFactors) && metrics.attritionRisk.riskFactors.length > 0) {
          addParagraph('Observed Risk Factors:', metrics.attritionRisk.riskFactors.map(f => `• ${f}`).join('\n'));
        }
        addParagraph('HR Retention Guidance & Recommendations:', metrics.attritionRisk?.retentionRecommendation || metrics.retentionRecommendation || 'Align personal development goals with high-impact milestones.');
        currentY += 4;

        const collabScore = metrics.collaboration?.score ?? 8;
        const collabLevel = metrics.collaboration?.level || (collabScore >= 7 ? 'Strong' : 'Moderate');
        addSectionHeader('5. COLLABORATION & TEAM DYNAMICS', `Score: ${collabScore}/10 (${collabLevel})`, '#2563eb');
        addParagraph('Collaboration Style & Synergy:', metrics.collaboration?.analysis || 'Demonstrates constructive communication habits and cross-functional synergy.');
        currentY += 4;

        const burnoutScore = metrics.burnout?.score ?? metrics.burnoutScore ?? 3;
        const burnoutLevel = metrics.burnout?.riskLevel || (burnoutScore >= 7 ? 'High Strain' : burnoutScore >= 4 ? 'Moderate' : 'Healthy');
        const burnoutBadgeColor = burnoutScore >= 7 ? '#dc2626' : burnoutScore >= 4 ? '#d97706' : '#059669';
        addSectionHeader('6. WELL-BEING & WORKLOAD BURNOUT INDEX', `Burnout Index: ${burnoutScore}/10 (${burnoutLevel})`, burnoutBadgeColor);
        addParagraph('Workload Observations:', metrics.burnout?.analysis || `Workload pacing is rated as ${burnoutLevel.toLowerCase()}. Current stress resistance appears stable.`);
      }

      // ==========================================
      // MODE 4: LAYOFF / WORKFORCE IMPACT REVIEW
      // ==========================================
      else if (modeKey === 'layoff') {
        const retPriority = metrics.retentionPriority || {};
        const priorityText = retPriority.priority || metrics.executiveDecision || 'Retain in Current Role';
        const priorityColor = getDecisionBadgeColor(priorityText);

        addSectionHeader('1. WORKFORCE ASSESSMENT SUMMARY & RETENTION PRIORITY', `DECISION: ${priorityText.toUpperCase()}`, priorityColor);
        addParagraph('Restructuring Assessment Overview:', metrics.summary || 'Objective workforce restructuring assessment examining project indispensability, multi-stack versatility, and core operational value.');
        if (retPriority.recommendation) {
          addParagraph('Strategic Talent Action Recommendation:', retPriority.recommendation);
        }
        currentY += 4;

        const crit = metrics.criticalityAssessment || {};
        const critRating = crit.rating || 'Core Essential';
        const critScore = crit.score ?? 8;
        const critColor = critRating.toLowerCase().includes('core') || critRating.toLowerCase().includes('high') ? '#059669' :
                          critRating.toLowerCase().includes('moderate') ? '#d97706' : '#dc2626';
        addSectionHeader('2. ROLE & PROJECT CRITICALITY EVALUATION', `Criticality: ${critScore}/10 (${critRating})`, critColor);
        if (crit.justification) {
          addParagraph('Operational Dependency Justification:', crit.justification);
        }
        addCodingMcqBreakdown('#991b1b');
        currentY += 4;

        const impact = metrics.businessImpact || {};
        addSectionHeader('3. BUSINESS VALUE DELIVERED & UNIQUE CONTRIBUTIONS', `Impact Score: ${impact.directImpactScore ?? 8}/10`, '#2563eb');
        if (Array.isArray(impact.uniqueContributions) && impact.uniqueContributions.length > 0) {
          doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(8.5).text('Unique Organizational Contributions:', 45, currentY);
          currentY += 13;
          addPillTags(impact.uniqueContributions, 'Key system maintainer', '#eff6ff', '#bfdbfe', '#1d4ed8');
        }
        addParagraph('Business Impact Analysis:', impact.analysis || 'High contribution to revenue-generating or mission-critical initiatives.');
        currentY += 4;

        const vers = metrics.versatility || {};
        addSectionHeader('4. VERSATILITY, MULTI-SKILLING & ADAPTABILITY', `Versatility: ${vers.score ?? 8}/10 (${vers.adaptabilityRating || 'High'})`, '#059669');
        if (Array.isArray(vers.crossFunctionalSkills) && vers.crossFunctionalSkills.length > 0) {
          doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(8.5).text('Cross-Functional Capabilities & Secondary Skills:', 45, currentY);
          currentY += 13;
          addPillTags(vers.crossFunctionalSkills, 'Able to absorb multiple functional duties', '#f0fdf4', '#bbf7d0', '#15803d');
        }
        addParagraph('Flexibility Under Resource Constraints:', vers.analysis || 'High ability to pivot across tech stacks and support adjacent responsibilities.');
        currentY += 4;

        const redun = metrics.redundancyRisk || {};
        const redunLevel = redun.level || 'Low';
        const redunColor = redunLevel === 'Low' ? '#059669' : redunLevel === 'Medium' ? '#d97706' : '#dc2626';
        addSectionHeader('5. REDUNDANCY RISK ANALYSIS', `Redundancy Risk: ${redunLevel}`, redunColor);
        addParagraph('Operational Sensitivity & Impact if Separated:', redun.operationalSensitivity || 'Low redundancy; separating this employee creates significant knowledge and project coverage risk.');
      }

      // ==========================================
      // FOOTER ON ALL PAGES
      // ==========================================
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(i);
        doc.rect(40, 785, 515, 1).fill('#e2e8f0');
        doc.fillColor('#94a3b8').fontSize(7.5).font('Helvetica');
        doc.text(`NEX AI Workforce Intelligence Platform — Confidential HR Document [${modeConfig.name}]`, 45, 792);
        doc.text(`Page ${i + 1} of ${range.count}`, 490, 792, { align: 'right' });
      }

      const resolvedDecision =
        metrics.executiveDecision ||
        (modeKey === 'hiring'
          ? metrics.hiringRecommendation?.decision || 'Hire'
          : modeKey === 'assessment'
          ? metrics.performanceRating?.decision || metrics.performanceRating?.rating || 'Meets Expectations (Retain)'
          : modeKey === 'layoff'
          ? metrics.retentionPriority?.priority || 'Retain in Current Role'
          : metrics.retentionDecision?.decision || 'Retain & Engage');

      doc.end();
      stream.on('finish', () => {
        // Save metadata cache
        saveReportMeta(filename, {
          name: employee.name || 'Candidate',
          employeeId: employee.id || assessment.employee_id || 'N/A',
          role: employee.role || '',
          mode: modeKey,
          decision: resolvedDecision,
          codingMcqScore: metrics.codingMcqScore || null,
          summary: metrics.summary || '',
          createdAt: new Date().toISOString()
        });
        resolve({ filePath, filename, mode: modeKey, decision: resolvedDecision });
      });
      stream.on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Infers a default executive decision label for legacy reports without an explicit decision field
 */
function inferDecisionFromMeta(meta = {}, modeKey = 'retention') {
  if (meta.decision) return meta.decision;
  const summaryLower = String(meta.summary || '').toLowerCase();
  const isReject =
    summaryLower.includes('cannot be recommended') ||
    summaryLower.includes('rubbish') ||
    summaryLower.includes('non-substantive') ||
    summaryLower.includes('failed to provide valid');
  const isHold = summaryLower.includes('note: on') || summaryLower.includes('concise');

  if (modeKey === 'hiring') {
    return isReject ? 'Do Not Hire' : isHold ? 'Keep on Hold' : 'Hire';
  }
  if (modeKey === 'assessment') {
    return isReject ? 'Do Not Retain / PIP' : isHold ? 'Keep on Hold (Coaching Plan)' : 'Meets Expectations (Retain)';
  }
  if (modeKey === 'layoff') {
    return isReject
      ? 'Do Not Retain (Separation Candidate)'
      : isHold
      ? 'Keep on Hold (Evaluate Reassignment)'
      : 'Retain in Current Role';
  }
  return isReject ? 'Do Not Retain / Flag for Review' : isHold ? 'Keep on Hold (Monitor Flight Risk)' : 'Retain & Engage';
}

/**
 * Returns a list of generated reports with file details & mode classification
 */
function getReportsList() {
  try {
    if (!fs.existsSync(REPORTS_DIR)) return [];
    const files = fs.readdirSync(REPORTS_DIR);
    const metaCache = loadReportsMeta();

    return files
      .filter(f => f.endsWith('.pdf'))
      .map(filename => {
        const fullPath = path.join(REPORTS_DIR, filename);
        const stats = fs.statSync(fullPath);
        
        // Parse: <name>_<employeeId>_<mode>_<time>.pdf OR <name>_<employeeId>_<time>.pdf
        const withoutExt = filename.replace(/\.pdf$/i, '');
        const parts = withoutExt.split('_');

        let name = parts[0] || 'Unknown';
        let employeeId = parts[1] || 'N/A';
        let detectedMode = DEFAULT_MODE;

        // Check if mode is explicitly recorded in meta cache
        if (metaCache[filename] && metaCache[filename].mode) {
          detectedMode = metaCache[filename].mode;
          if (metaCache[filename].name) name = metaCache[filename].name;
          if (metaCache[filename].employeeId) employeeId = metaCache[filename].employeeId;
        } else {
          // Check if any segment of filename matches one of the known modes
          const lowerName = filename.toLowerCase();
          if (lowerName.includes('_hiring_') || lowerName.includes('hiring')) {
            detectedMode = 'hiring';
          } else if (lowerName.includes('_assessment_') || lowerName.includes('assessment')) {
            detectedMode = 'assessment';
          } else if (lowerName.includes('_layoff_') || lowerName.includes('layoff')) {
            detectedMode = 'layoff';
          } else if (lowerName.includes('_retention_') || lowerName.includes('retention')) {
            detectedMode = 'retention';
          } else {
            // Default backward compatible fallback
            detectedMode = 'retention';
          }
        }

        const modeConfig = getModeConfig(detectedMode);
        const metaEntry = metaCache[filename] || {};
        const decision = inferDecisionFromMeta(metaEntry, detectedMode);

        return {
          filename,
          name,
          employeeId,
          role: metaEntry.role || '',
          mode: detectedMode,
          decision,
          codingMcqScore: metaEntry.codingMcqScore || null,
          summary: metaEntry.summary || '',
          modeConfig: {
            id: modeConfig.id,
            name: modeConfig.name,
            shortTitle: modeConfig.shortTitle,
            icon: modeConfig.icon,
            badge: modeConfig.badge,
            sections: modeConfig.sections,
            themeColor: modeConfig.themeColor
          },
          sections: modeConfig.sections,
          size: stats.size,
          createdAt: stats.mtime.toISOString(),
          createdAtFormatted: stats.mtime.toLocaleString(),
          downloadUrl: `/api/reports/${encodeURIComponent(filename)}`
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch (err) {
    console.error('Error reading reports dir:', err);
    return [];
  }
}

module.exports = {
  formatReportFilename,
  generateAssessmentPDF,
  getReportsList,
  REPORTS_DIR
};
