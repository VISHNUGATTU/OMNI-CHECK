const llmService = require('./llmService');

const VALID_OPERATORS = [
  '>', '>=', '<', '<=', '==', '!=', 
  'in', 'not_in', 'between', 'not_between', 
  'contains', 'not_contains', 'exists', 'not_exists'
];

const VALID_LOGIC = ['AND', 'OR', 'NOT', 'IMPLIES'];
const VALID_RULE_TYPES = ['REQUIRE', 'PROHIBIT', 'TRIGGER'];
const VALID_TIME_UNITS = ['seconds', 'minutes', 'hours', 'days', 'weeks', 'months', 'years'];

const SYSTEM_PROMPT = `You are a POLICY-TO-RULE COMPILER. Translate natural-language policy text from ANY domain (finance, HR, IT security, procurement, safety, data governance) into structured JSON rules.
You only TRANSLATE. You never decide whether anything complies.

STRICT RULES:
1. Output ONLY one JSON object, no prose, no markdown fences.
2. Use ONLY facts stated in the policy. Never invent thresholds, units, entities, exceptions or evidence.
3. If a clause is vague (no measurable threshold, unclear subject, advisory wording such as "should"/"may", words like "large", "reasonable", "promptly"), DO NOT guess a number. Put it in "unparsed_statements" with a reason.
4. Entity = singular snake_case noun the policy talks about (e.g. "invoice", "employee", "server", "expense", "candidate"). Field = snake_case attribute of that entity.
5. Numbers: write plain numbers. Convert "10,000" -> 10000. Copy unit as written (currency code/symbol, days, %, GB). Use null when no unit.
6. Keep the policy's own wording in "source_text".
7. One rule per independent obligation.

OUTPUT SCHEMA:
{
  "rules": [{
    "rule_type": "REQUIRE" | "PROHIBIT" | "TRIGGER",
    "entity": "snake_case primary entity",
    "condition": {
      "entity": "entity_name",
      "field": "field_name",
      "operator": "> | >= | < | <= | == | != | in | not_in | between | not_between | contains | not_contains | exists | not_exists",
      "value": number | string | boolean | array | null,
      "unit": string | null
    } OR {
      "logic": "AND | OR | NOT | IMPLIES",
      "children": [...]
    },
    "temporal": null | {
      "kind": "within" | "older_than" | "before" | "after" | "between",
      "field": "date_field_name",
      "amount": number,
      "unit": "days" | "weeks" | "months" | "years" | "hours" | "minutes",
      "direction": "after" | "before" | "either"
    },
    "required_evidence": [
      { "type": "snake_case_evidence_type", "mandatory": true, "min_count": 1 }
    ],
    "exception": [
      { "description": "text", "condition": {...} }
    ],
    "severity": "low" | "medium" | "high" | "critical",
    "action": "snake_case_action",
    "confidence": 0.0 - 1.0,
    "source_text": "exact clause quote",
    "ambiguities": []
  }],
  "unparsed_statements": [
    { "text": "clause", "reason": "reason why it could not be compiled" }
  ]
}`;

class PolicyCompiler {
  async compile(policyText) {
    if (!policyText || typeof policyText !== 'string' || !policyText.trim()) {
      return {
        rules: [],
        unparsed_statements: [{ text: '', reason: 'Empty policy text provided.' }],
        summary: { total: 0, valid: 0, needsReview: 0, rejected: 0 }
      };
    }

    const prompt = `Policy to compile:\n"""\n${policyText.slice(0, 20000)}\n"""`;
    const parsed = await llmService.generateJSON({
      prompt,
      systemPrompt: SYSTEM_PROMPT,
      temperature: 0.1
    });

    const rawRules = (parsed && Array.isArray(parsed.rules)) ? parsed.rules : [];
    const unparsed = (parsed && Array.isArray(parsed.unparsed_statements)) ? parsed.unparsed_statements : [];

    const validatedRules = rawRules.map((rule, idx) => this.validateRule(rule, idx));

    const summary = {
      total: validatedRules.length,
      valid: validatedRules.filter(r => r.validationStatus === 'VALID').length,
      needsReview: validatedRules.filter(r => r.validationStatus === 'NEEDS_REVIEW').length,
      rejected: validatedRules.filter(r => r.validationStatus === 'REJECTED').length
    };

    return {
      rules: validatedRules,
      unparsed_statements: unparsed,
      summary
    };
  }

  validateRule(rule, index) {
    const issues = [];
    const ambiguities = Array.isArray(rule.ambiguities) ? [...rule.ambiguities] : [];

    // 1. Rule Type
    if (!rule.rule_type || !VALID_RULE_TYPES.includes(rule.rule_type)) {
      issues.push(`Invalid rule_type '${rule.rule_type}'. Expected one of: ${VALID_RULE_TYPES.join(', ')}`);
    }

    // 2. Entity
    if (!rule.entity || typeof rule.entity !== 'string') {
      issues.push('Missing or invalid entity');
    }

    // 3. Condition validation
    if (rule.condition) {
      const condError = this.validateCondition(rule.condition);
      if (condError) issues.push(condError);
    }

    // 4. Temporal validation
    if (rule.temporal) {
      if (rule.temporal.unit && !VALID_TIME_UNITS.includes(rule.temporal.unit.toLowerCase())) {
        ambiguities.push(`Unrecognized temporal unit '${rule.temporal.unit}'`);
      }
    }

    // 5. Confidence and Ambiguity rating
    const confidence = typeof rule.confidence === 'number' ? Math.max(0, Math.min(1, rule.confidence)) : 0.8;
    
    let validationStatus = 'VALID';
    if (issues.length > 0) {
      validationStatus = 'REJECTED';
    } else if (confidence < 0.7 || ambiguities.length > 0) {
      validationStatus = 'NEEDS_REVIEW';
    }

    return {
      id: rule.id || `rule_${index + 1}`,
      rule_type: rule.rule_type || 'REQUIRE',
      entity: rule.entity || 'unknown_entity',
      condition: rule.condition || null,
      temporal: rule.temporal || null,
      required_evidence: Array.isArray(rule.required_evidence) ? rule.required_evidence : [],
      exception: Array.isArray(rule.exception) ? rule.exception : [],
      severity: rule.severity || 'medium',
      action: rule.action || 'flag_for_review',
      confidence,
      source_text: rule.source_text || '',
      ambiguities,
      validationStatus,
      validationIssues: issues
    };
  }

  validateCondition(cond) {
    if (!cond || typeof cond !== 'object') return 'Malformed condition object';

    // Group check
    if (cond.logic) {
      if (!VALID_LOGIC.includes(cond.logic)) {
        return `Invalid logic operator '${cond.logic}'`;
      }
      if (!Array.isArray(cond.children) || cond.children.length === 0) {
        return `Logic group '${cond.logic}' must contain a non-empty children array`;
      }
      for (const child of cond.children) {
        const err = this.validateCondition(child);
        if (err) return err;
      }
      return null;
    }

    // Leaf check
    if (cond.operator && !VALID_OPERATORS.includes(cond.operator)) {
      return `Invalid leaf condition operator '${cond.operator}'`;
    }
    return null;
  }
}

module.exports = new PolicyCompiler();

