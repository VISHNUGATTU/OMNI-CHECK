import React, { useState } from 'react';
import { FileText, Shield, AlertTriangle, CheckCircle2, HelpCircle } from 'lucide-react';

export default function EvidenceGraphVisualizer({ graphData }) {
  const [selectedNode, setSelectedNode] = useState(null);

  if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 border border-dashed border-white/10 rounded-2xl">
        No evidence graph generated for this investigation.
      </div>
    );
  }

  const { nodes = [], edges = [] } = graphData;

  const getNodeColor = (type) => {
    switch (type) {
      case 'Document': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40';
      case 'Policy': return 'bg-purple-500/20 text-purple-400 border-purple-500/40';
      case 'Entity': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
      case 'Claim': return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      default: return 'bg-slate-500/20 text-slate-300 border-slate-500/40';
    }
  };

  const getEdgeBadge = (relation) => {
    switch (relation) {
      case 'SUPPORTS':
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">SUPPORTS</span>;
      case 'CONTRADICTS':
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 font-semibold animate-pulse">CONTRADICTS</span>;
      case 'DERIVED_FROM':
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">DERIVED_FROM</span>;
      default:
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-400">{relation}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Node Type Legend */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="text-slate-400 font-medium">W3C PROV-O Graph Entities:</span>
        <span className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5" /> Document Node
        </span>
        <span className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5" /> Policy Rule Node
        </span>
        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" /> Extracted Fact Node
        </span>
        <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5" /> Claim / Evidence
        </span>
      </div>

      {/* Nodes Interactive Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {nodes.map(node => (
          <div
            key={node.id}
            onClick={() => setSelectedNode(node)}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              selectedNode?.id === node.id 
                ? 'ring-2 ring-cyan-400/80 bg-cyan-950/30 border-cyan-400' 
                : `${getNodeColor(node.type)} hover:brightness-125`
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-mono uppercase tracking-wider opacity-75">{node.type}</span>
              <span className="text-[10px] font-mono text-slate-400">ID: {node.id}</span>
            </div>
            <div className="font-medium text-sm text-slate-100 line-clamp-2">
              {node.label}
            </div>
            {node.properties?.severity && (
              <div className="mt-2 text-[10px] text-amber-300">
                Severity: {node.properties.severity}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Relations & Edge Matrix */}
      <div className="rounded-xl border border-white/10 bg-black/40 overflow-hidden">
        <div className="px-4 py-3 bg-white/5 border-b border-white/10 font-medium text-xs text-slate-300 flex items-center justify-between">
          <span>Provenance Edges & Semantic Relationships ({edges.length})</span>
          <span className="text-[11px] text-slate-500">Connecting facts, evidence, and conclusions</span>
        </div>
        <div className="divide-y divide-white/5 max-h-60 overflow-y-auto">
          {edges.map(edge => {
            const sourceNode = nodes.find(n => n.id === edge.source);
            const targetNode = nodes.find(n => n.id === edge.target);

            return (
              <div key={edge.id} className="p-3 flex items-center justify-between text-xs hover:bg-white/[0.02]">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-slate-300 bg-white/5 px-2 py-0.5 rounded truncate max-w-[150px]">
                    {sourceNode?.label || edge.source}
                  </span>
                  <span className="text-slate-500 font-mono">──▶</span>
                  <span className="font-mono text-slate-300 bg-white/5 px-2 py-0.5 rounded truncate max-w-[150px]">
                    {targetNode?.label || edge.target}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {getEdgeBadge(edge.relation)}
                  {edge.properties?.details && (
                    <span className="text-[11px] text-rose-300 font-sans">{edge.properties.details}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Node Inspector Drawer */}
      {selectedNode && (
        <div className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-950/20 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-cyan-300 uppercase tracking-wide">Node Inspector: {selectedNode.label}</span>
            <button 
              onClick={() => setSelectedNode(null)}
              className="text-slate-400 hover:text-white"
            >
              ✕ Close
            </button>
          </div>
          <pre className="p-3 bg-black/60 rounded-lg text-slate-300 font-mono text-[11px] overflow-x-auto">
            {JSON.stringify(selectedNode.properties, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

