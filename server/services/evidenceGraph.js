class EvidenceGraphService {
  buildGraph({ documents = [], facts = {}, evidence = [], claims = [], rules = [], ruleEvaluations = [] }) {
    const nodes = [];
    const edges = [];
    let edgeCounter = 1;

    // 1. Document Nodes
    documents.forEach((doc, idx) => {
      const docId = `doc_${idx + 1}`;
      nodes.push({
        id: docId,
        label: doc.filename || `Document ${idx + 1}`,
        type: 'Document',
        properties: {
          fileType: doc.fileType,
          chars: doc.extractedChars
        }
      });
    });

    // 2. Policy Rule Nodes
    rules.forEach((rule, idx) => {
      const ruleId = `rule_${rule.id || idx + 1}`;
      nodes.push({
        id: ruleId,
        label: `${rule.rule_type}: ${rule.entity}`,
        type: 'Policy',
        properties: {
          severity: rule.severity,
          sourceText: rule.source_text,
          status: rule.validationStatus
        }
      });
    });

    // 3. Entity & Claim Nodes
    claims.forEach((claim, idx) => {
      const claimId = `claim_${idx + 1}`;
      nodes.push({
        id: claimId,
        label: claim.claim ? claim.claim.slice(0, 45) + '...' : `Claim ${idx + 1}`,
        type: 'Claim',
        properties: {
          subject: claim.subject,
          provenance: claim.provenance
        }
      });

      // Edge from Document -> Claim (DERIVED_FROM)
      const matchingDoc = documents.find(d => d.filename === claim.provenance) || documents[0];
      if (matchingDoc) {
        const docIndex = documents.indexOf(matchingDoc);
        edges.push({
          id: `edge_${edgeCounter++}`,
          source: `doc_${docIndex + 1}`,
          target: claimId,
          relation: 'DERIVED_FROM',
          properties: { timestamp: new Date().toISOString() }
        });
      }
    });

    // 4. Evidence Nodes
    evidence.forEach((ev, idx) => {
      const evId = `ev_${idx + 1}`;
      nodes.push({
        id: evId,
        label: `Evidence: ${ev.type || 'Verification'}`,
        type: 'Entity',
        properties: {
          source: ev.source_document,
          statement: ev.statement
        }
      });

      // Link to document
      const matchingDoc = documents.find(d => d.filename === ev.source_document) || documents[0];
      if (matchingDoc) {
        const docIndex = documents.indexOf(matchingDoc);
        edges.push({
          id: `edge_${edgeCounter++}`,
          source: `doc_${docIndex + 1}`,
          target: evId,
          relation: 'DERIVED_FROM',
          properties: {}
        });
      }
    });

    // 5. Connect Rules to Evidence / Claims (SUPPORTS or CONTRADICTS)
    ruleEvaluations.forEach(evalResult => {
      const ruleNodeId = `rule_${evalResult.ruleId}`;
      if (evalResult.verdict === 'compliant') {
        // Link to first available evidence as SUPPORTS
        if (evidence.length > 0) {
          edges.push({
            id: `edge_${edgeCounter++}`,
            source: 'ev_1',
            target: ruleNodeId,
            relation: 'SUPPORTS',
            properties: { rationale: evalResult.rationale }
          });
        }
      } else if (evalResult.verdict === 'violation') {
        // CONTRADICTS edge
        const sourceNode = claims.length > 0 ? 'claim_1' : (documents.length > 0 ? 'doc_1' : null);
        if (sourceNode) {
          edges.push({
            id: `edge_${edgeCounter++}`,
            source: sourceNode,
            target: ruleNodeId,
            relation: 'CONTRADICTS',
            properties: { rationale: evalResult.rationale }
          });
        }
      }
    });

    // 6. Cross-document conflict detection
    const conflicts = this.detectCrossDocumentConflicts(facts, claims, documents);
    conflicts.forEach(conf => {
      edges.push({
        id: `edge_${edgeCounter++}`,
        source: conf.sourceNode,
        target: conf.targetNode,
        relation: 'CONTRADICTS',
        properties: { conflictType: conf.type, details: conf.details }
      });
    });

    return {
      nodes,
      edges,
      conflictsCount: conflicts.length
    };
  }

  detectCrossDocumentConflicts(facts, claims, documents) {
    const conflicts = [];
    
    // Check if numeric discrepancies exist (e.g. billed amount vs paid amount in different entities)
    if (facts && typeof facts === 'object') {
      const invoiceAmt = facts.invoice?.amount || facts.invoice?.total_amount;
      const paymentAmt = facts.payment?.amount || facts.receipt?.amount;
      if (invoiceAmt !== undefined && paymentAmt !== undefined && invoiceAmt !== paymentAmt) {
        conflicts.push({
          sourceNode: documents[0] ? 'doc_1' : 'fact_invoice',
          targetNode: documents[1] ? 'doc_2' : 'fact_payment',
          type: 'AMOUNT_MISMATCH',
          details: `Invoice amount (${invoiceAmt}) contradicts payment record (${paymentAmt})`
        });
      }
    }

    return conflicts;
  }
}

module.exports = new EvidenceGraphService();

