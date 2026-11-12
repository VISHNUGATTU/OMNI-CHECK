"""
OMNI-CHECK AI Engine
FastAPI Service exposing the Research-Grade Policy Compiler,
Deterministic 3-Valued Kleene Rule Engine, and Omni-Bench Evaluation Kernel.
"""
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv

load_dotenv()

from app.compliance.policy_compiler import compile_policy, CompilationError
from app.compliance.rule_engine import evaluate_rules
from app.compliance.policy_schema import CompileResult, CompiledRule

app = FastAPI(
    title="OMNI-CHECK AI Engine",
    description="Deterministic 3-Valued Logic & Policy Compilation Microservice",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CompileRequest(BaseModel):
    policy_text: str

class EvaluateRequest(BaseModel):
    rules: List[Dict[str, Any]]
    facts: Dict[str, Any]
    evidence: Optional[List[Dict[str, Any]]] = None

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "OMNI-CHECK Python AI Engine",
        "version": "2.0.0"
    }

@app.post("/compile")
def compile_endpoint(req: CompileRequest):
    try:
        result = compile_policy(req.policy_text)
        return result.model_dump()
    except CompilationError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/evaluate")
def evaluate_endpoint(req: EvaluateRequest):
    try:
        # Reconstruct CompiledRule objects
        compiled_rules = [CompiledRule.model_validate(r) for r in req.rules]
        decision = evaluate_rules(compiled_rules, req.facts, req.evidence)
        return decision
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
