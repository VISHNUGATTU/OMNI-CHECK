const fetch = require('node-fetch');

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://localhost:8000';

class AIEngineClient {
  constructor() {
    this.baseUrl = AI_ENGINE_URL;
    this.isAvailable = null;
    this.lastCheck = 0;
  }

  // Health probe with 10-second cache
  async checkHealth() {
    const now = Date.now();
    if (this.isAvailable !== null && (now - this.lastCheck < 10000)) {
      return this.isAvailable;
    }

    try {
      const resp = await fetch(`${this.baseUrl}/health`, { timeout: 1500 });
      this.isAvailable = resp.ok;
      this.lastCheck = now;
    } catch (e) {
      this.isAvailable = false;
      this.lastCheck = now;
    }
    return this.isAvailable;
  }

  // Delegate policy compilation to Python AI Engine
  async compilePolicy(policyText) {
    const alive = await this.checkHealth();
    if (!alive) return null; // Fallback to local JS compiler

    try {
      const resp = await fetch(`${this.baseUrl}/compile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policy_text: policyText }),
        timeout: 20000
      });

      if (resp.ok) {
        return await resp.json();
      }
    } catch (err) {
      console.warn('[AIEngineClient] Compile delegation error, falling back to local JS:', err.message);
    }
    return null;
  }

  // Delegate rule evaluation to Python 3-Valued Kleene Engine
  async evaluateRules(rules, facts, evidence) {
    const alive = await this.checkHealth();
    if (!alive) return null; // Fallback to local JS rule engine

    try {
      const resp = await fetch(`${this.baseUrl}/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules, facts, evidence }),
        timeout: 10000
      });

      if (resp.ok) {
        return await resp.json();
      }
    } catch (err) {
      console.warn('[AIEngineClient] Evaluation delegation error, falling back to local JS:', err.message);
    }
    return null;
  }
}

module.exports = new AIEngineClient();

