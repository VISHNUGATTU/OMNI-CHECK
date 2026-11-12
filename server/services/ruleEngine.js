// Deterministic 3-Valued Kleene Rule Engine
// Implements Kleene 3-valued logic: True (1), False (0), Unknown/Indeterminate (null)

const FX_RATES = {
  'USD->INR': 83.5,
  'INR->USD': 1 / 83.5,
  'EUR->USD': 1.08,
  'USD->EUR': 1 / 1.08,
  'GBP->USD': 1.28,
  'USD->GBP': 1 / 1.28
};

const TIME_FACTORS_SECONDS = {
  seconds: 1,
  minutes: 60,
  hours: 3600,
  days: 86400,
  weeks: 604800,
  months: 2592000,
  years: 31536000
};

class RuleEngine {
  // Main evaluation entry point
  evaluate({ rules = [], facts = {}, evidence = [], evaluationDate = new Date() }) {
    const ruleEvaluations = [];
    let hasViolation = false;
    let hasIndeterminate = false;
    let hasNeedsReview = false;
    const indeterminateReasons = [];

    const evalDate = new Date(evaluationDate);

    for (const rule of rules) {
      if (rule.validationStatus === 'REJECTED') {
        ruleEvaluations.push({
          ruleId: rule.id,
          ruleType: rule.rule_type,
          verdict: 'rejected',
          reason: 'Rule rejected by policy compiler due to schema inconsistency.'
        });
        continue;
      }

      if (rule.validationStatus === 'NEEDS_REVIEW') {
        hasNeedsReview = true;
      }

      // Check exceptions first
      let exceptionTriggered = false;
      if (Array.isArray(rule.exception) && rule.exception.length > 0) {
        for (const exc of rule.exception) {
          if (exc.condition) {
            const excResult = this.evaluateCondition(exc.condition, facts);
            if (excResult === true) {
              exceptionTriggered = true;
              ruleEvaluations.push({
                ruleId: rule.id,
                ruleType: rule.rule_type,
                verdict: 'compliant',
                reason: `Exempted under condition: ${exc.description || 'Exception condition met'}`,
                truthValue: true,
                isExempt: true
              });
              break;
            }
          }
        }
      }

      if (exceptionTriggered) continue;

      // Evaluate main condition using 3-valued Kleene logic
      let conditionTruth = true;
      let conditionReason = 'No condition specified';
      if (rule.condition) {
        conditionTruth = this.evaluateCondition(rule.condition, facts);
        conditionReason = this.explainCondition(rule.condition, facts, conditionTruth);
      }

      // Evaluate temporal constraint
      let temporalTruth = true;
      if (rule.temporal) {
        temporalTruth = this.evaluateTemporal(rule.temporal, facts, evalDate);
      }

      // Evaluate required evidence
      let evidenceTruth = true;
      let missingEvidenceDetails = [];
      if (Array.isArray(rule.required_evidence) && rule.required_evidence.length > 0) {
        for (const req of rule.required_evidence) {
          const matching = evidence.filter(e => {
            if (!e.type) return false;
            return e.type.toLowerCase().includes(req.type.toLowerCase()) ||
                   req.type.toLowerCase().includes(e.type.toLowerCase());
          });
          const minCount = req.min_count || 1;
          if (matching.length < minCount) {
            evidenceTruth = null; // Incomplete evidence propagates to Unknown
            missingEvidenceDetails.push(`Missing mandatory evidence: ${req.type}`);
          }
        }
      }

      // Kleene Conjunction of Condition and Temporal: Predicate = Condition AND Temporal
      const predicateTruth = this.kleeneAnd(conditionTruth, temporalTruth);

      let ruleVerdict = 'compliant';
      let rationale = '';

      if (rule.rule_type === 'REQUIRE') {
        // REQUIRE: The predicate must hold. If False -> Violation. If Null -> Indeterminate.
        if (predicateTruth === false) {
          ruleVerdict = 'violation';
          hasViolation = true;
          rationale = `Requirement violated: ${conditionReason}`;
        } else if (predicateTruth === null || evidenceTruth === null) {
          ruleVerdict = 'indeterminate';
          hasIndeterminate = true;
          const reasons = [];
          if (predicateTruth === null) reasons.push('Missing fact or unparseable value for condition');
          if (evidenceTruth === null) reasons.push(...missingEvidenceDetails);
          rationale = `Indeterminate: ${reasons.join('; ')}`;
          indeterminateReasons.push(`[${rule.id}] ${rationale}`);
        } else {
          ruleVerdict = 'compliant';
          rationale = `Requirement fully satisfied: ${conditionReason}`;
        }
      } else if (rule.rule_type === 'PROHIBIT') {
        // PROHIBIT: The predicate must NOT hold. If True -> Violation. If Null -> Indeterminate.
        if (predicateTruth === true) {
          ruleVerdict = 'violation';
          hasViolation = true;
          rationale = `Prohibition violated: Prohibited condition detected (${conditionReason})`;
        } else if (predicateTruth === null) {
          ruleVerdict = 'indeterminate';
          hasIndeterminate = true;
          rationale = 'Indeterminate: Insufficient information to confirm or rule out prohibition';
          indeterminateReasons.push(`[${rule.id}] ${rationale}`);
        } else {
          ruleVerdict = 'compliant';
          rationale = 'Prohibition satisfied: Prohibited state does not occur';
        }
      } else if (rule.rule_type === 'TRIGGER') {
        // TRIGGER: When condition is True, evidence and action required
        if (predicateTruth === true) {
          if (evidenceTruth === null) {
            ruleVerdict = 'indeterminate';
            hasIndeterminate = true;
            rationale = `Trigger activated, but mandatory evidence missing: ${missingEvidenceDetails.join(', ')}`;
            indeterminateReasons.push(`[${rule.id}] ${rationale}`);
          } else {
            ruleVerdict = 'compliant';
            rationale = `Trigger condition met, required action triggered (${rule.action || 'Action logged'})`;
          }
        } else if (predicateTruth === null) {
          ruleVerdict = 'indeterminate';
          hasIndeterminate = true;
          rationale = 'Trigger applicability indeterminate due to missing facts';
        } else {
          ruleVerdict = 'compliant';
          rationale = 'Trigger condition inactive';
        }
      }

      ruleEvaluations.push({
        ruleId: rule.id,
        ruleType: rule.rule_type,
        entity: rule.entity,
        severity: rule.severity,
        action: rule.action,
        sourceText: rule.source_text,
        verdict: ruleVerdict,
        truthValue: predicateTruth,
        rationale
      });
    }

    // Overall Status Resolution according to 3-valued semantics
    let overallStatus = 'compliant';
    if (hasViolation) {
      overallStatus = 'violation';
    } else if (hasIndeterminate) {
      overallStatus = 'indeterminate';
    } else if (hasNeedsReview) {
      overallStatus = 'needs_review';
    }

    const totalRules = ruleEvaluations.length;
    const compliantCount = ruleEvaluations.filter(r => r.verdict === 'compliant').length;
    const complianceScore = totalRules > 0 ? Math.round((compliantCount / totalRules) * 100) : 100;

    let summary = '';
    if (overallStatus === 'compliant') {
      summary = `All ${totalRules} policy rules fully satisfied with conclusive evidence.`;
    } else if (overallStatus === 'violation') {
      summary = 'Explicit compliance violation detected against verified policy constraints.';
    } else if (overallStatus === 'indeterminate') {
      summary = 'Indeterminate status: Crucial evidence or required data points are missing. In accordance with 3-valued logic, lack of evidence is not judged as a violation.';
    } else {
      summary = 'Policy clauses contain ambiguities that require human audit review.';
    }

    return {
      status: overallStatus,
      summary,
      complianceScore,
      ruleEvaluations,
      indeterminateReasons
    };
  }

  // Kleene 3-Valued Operations: True (true), False (false), Unknown (null)
  kleeneAnd(a, b) {
    if (a === false || b === false) return false;
    if (a === true && b === true) return true;
    return null;
  }

  kleeneOr(a, b) {
    if (a === true || b === true) return true;
    if (a === false && b === false) return false;
    return null;
  }

  kleeneNot(a) {
    if (a === true) return false;
    if (a === false) return true;
    return null;
  }

  kleeneImplies(a, b) {
    // A => B is NOT A OR B
    return this.kleeneOr(this.kleeneNot(a), b);
  }

  // Evaluates condition node (Leaf or Group)
  evaluateCondition(node, facts) {
    if (!node || typeof node !== 'object') return null;

    // Group evaluation
    if (node.logic) {
      const children = Array.isArray(node.children) ? node.children : [];
      if (children.length === 0) return null;

      if (node.logic === 'AND') {
        let res = true;
        for (const child of children) {
          res = this.kleeneAnd(res, this.evaluateCondition(child, facts));
          if (res === false) return false; // Short-circuit
        }
        return res;
      }

      if (node.logic === 'OR') {
        let res = false;
        for (const child of children) {
          res = this.kleeneOr(res, this.evaluateCondition(child, facts));
          if (res === true) return true; // Short-circuit
        }
        return res;
      }

      if (node.logic === 'NOT') {
        return this.kleeneNot(this.evaluateCondition(children[0], facts));
      }

      if (node.logic === 'IMPLIES') {
        if (children.length < 2) return null;
        const ifVal = this.evaluateCondition(children[0], facts);
        const thenVal = this.evaluateCondition(children[1], facts);
        return this.kleeneImplies(ifVal, thenVal);
      }
    }

    // Leaf evaluation
    return this.evaluateLeaf(node, facts);
  }

  evaluateLeaf(leaf, facts) {
    const { entity, field, operator, value, unit } = leaf;
    if (!entity || !field || !operator) return null;

    // Resolve fact value
    const rawFact = this.resolveFactValue(facts, entity, field);
    if (rawFact === undefined || rawFact === null) {
      if (operator === 'not_exists') return true;
      if (operator === 'exists') return false;
      return null; // Unknown/Indeterminate
    }

    if (operator === 'exists') return true;
    if (operator === 'not_exists') return false;

    // Normalize units if provided
    let factVal = rawFact;
    let targetVal = value;

    if (unit && typeof rawFact === 'object' && rawFact.value !== undefined) {
      factVal = this.normalizeUnit(rawFact.value, rawFact.unit || rawFact.currency, unit);
      if (factVal === null) return null;
    } else if (typeof rawFact === 'number' && typeof targetVal === 'number' && unit) {
      // Direct numeric comparison with unit
      factVal = rawFact;
    }

    // Comparison operators
    switch (operator) {
      case '==':
        return String(factVal).toLowerCase() === String(targetVal).toLowerCase();
      case '!=':
        return String(factVal).toLowerCase() !== String(targetVal).toLowerCase();
      case '>':
        return Number(factVal) > Number(targetVal);
      case '>=':
        return Number(factVal) >= Number(targetVal);
      case '<':
        return Number(factVal) < Number(targetVal);
      case '<=':
        return Number(factVal) <= Number(targetVal);
      case 'in':
        if (!Array.isArray(targetVal)) return null;
        return targetVal.map(v => String(v).toLowerCase()).includes(String(factVal).toLowerCase());
      case 'not_in':
        if (!Array.isArray(targetVal)) return null;
        return !targetVal.map(v => String(v).toLowerCase()).includes(String(factVal).toLowerCase());
      case 'contains':
        return String(factVal).toLowerCase().includes(String(targetVal).toLowerCase());
      case 'not_contains':
        return !String(factVal).toLowerCase().includes(String(targetVal).toLowerCase());
      case 'between':
        if (!Array.isArray(targetVal) || targetVal.length < 2) return null;
        return Number(factVal) >= Number(targetVal[0]) && Number(factVal) <= Number(targetVal[1]);
      case 'not_between':
        if (!Array.isArray(targetVal) || targetVal.length < 2) return null;
        return Number(factVal) < Number(targetVal[0]) || Number(factVal) > Number(targetVal[1]);
      default:
        return null;
    }
  }

  resolveFactValue(facts, entity, field) {
    if (!facts || typeof facts !== 'object') return null;

    // Check direct facts[entity][field]
    if (facts[entity] && facts[entity][field] !== undefined) {
      return facts[entity][field];
    }

    // Check lowercase
    const entityKey = Object.keys(facts).find(k => k.toLowerCase() === entity.toLowerCase());
    if (entityKey && facts[entityKey]) {
      const fieldKey = Object.keys(facts[entityKey]).find(k => k.toLowerCase() === field.toLowerCase());
      if (fieldKey) return facts[entityKey][fieldKey];
    }

    // Check list of entity objects
    if (Array.isArray(facts[entity])) {
      return facts[entity][0]?.[field];
    }

    // Check top level facts[field]
    if (facts[field] !== undefined) return facts[field];

    return null;
  }

  normalizeUnit(val, srcUnit, dstUnit) {
    if (!srcUnit || !dstUnit || srcUnit.toUpperCase() === dstUnit.toUpperCase()) {
      return val;
    }

    const src = srcUnit.toUpperCase();
    const dst = dstUnit.toUpperCase();

    // FX Currency Conversion
    const pair = `${src}->${dst}`;
    if (FX_RATES[pair]) {
      return val * FX_RATES[pair];
    }
    const invPair = `${dst}->${src}`;
    if (FX_RATES[invPair]) {
      return val / FX_RATES[invPair];
    }

    // Time conversions
    const srcT = src.toLowerCase();
    const dstT = dst.toLowerCase();
    if (TIME_FACTORS_SECONDS[srcT] && TIME_FACTORS_SECONDS[dstT]) {
      return (val * TIME_FACTORS_SECONDS[srcT]) / TIME_FACTORS_SECONDS[dstT];
    }

    return null; // Conversion unavailable
  }

  evaluateTemporal(temporal, facts, evalDate) {
    if (!temporal || !temporal.field) return true;
    const dateVal = this.resolveFactValue(facts, temporal.entity, temporal.field);
    if (!dateVal) return null;

    const parsedDate = new Date(dateVal);
    if (isNaN(parsedDate.getTime())) return null;

    const diffMs = Math.abs(evalDate.getTime() - parsedDate.getTime());
    const unit = (temporal.unit || 'days').toLowerCase();
    const factor = (TIME_FACTORS_SECONDS[unit] || 86400) * 1000;
    const diffUnits = diffMs / factor;

    if (temporal.kind === 'within') {
      return diffUnits <= (temporal.amount || 0);
    }
    if (temporal.kind === 'older_than') {
      return diffUnits > (temporal.amount || 0);
    }
    return true;
  }

  explainCondition(node, facts, truth) {
    if (node.logic) {
      return `Compound [${node.logic}] condition evaluated to ${truth === null ? 'INDETERMINATE' : (truth ? 'TRUE' : 'FALSE')}`;
    }
    return `${node.entity}.${node.field} ${node.operator} ${JSON.stringify(node.value)} -> ${truth === null ? 'UNKNOWN' : (truth ? 'PASS' : 'FAIL')}`;
  }
}

module.exports = new RuleEngine();

