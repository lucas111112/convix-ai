"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Plus, Trash2, Save, ZoomIn, ZoomOut, RotateCcw,
  EyeOff, X, Database, BarChart2, Type, Filter, Bell, Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────

export type NodeType = "datasource" | "metric" | "chart" | "text" | "filter" | "trigger";

export interface CanvasNode {
  id: string;
  type: NodeType;
  title: string;
  x: number;
  y: number;
  config: Record<string, any>;
  showInAnalytics: boolean;
}

export interface Connection {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
}

interface NodeCanvasProps {
  storageKey: string;
  defaultNodes?: CanvasNode[];
  defaultConnections?: Connection[];
}

// ── Node type definitions ──────────────────────────────────────────────────────

const NODE_TYPES: Record<NodeType, {
  label: string; headerColor: string; iconColor: string;
  borderColor: string; icon: any;
  inputs: boolean; outputs: boolean;
  configFields: { key: string; label: string; type: string; placeholder?: string; options?: string[] }[];
}> = {
  datasource: {
    label: "Data Source", headerColor: "bg-blue-50", iconColor: "text-blue-600",
    borderColor: "border-blue-200", icon: Database, inputs: false, outputs: true,
    configFields: [
      { key: "url", label: "Endpoint URL", type: "text", placeholder: "https://api.example.com/data" },
      { key: "method", label: "HTTP Method", type: "select", options: ["GET", "POST", "PUT"] },
      { key: "refreshInterval", label: "Auto-refresh (seconds)", type: "number", placeholder: "30" },
      { key: "headers", label: "Headers (JSON)", type: "textarea", placeholder: '{"Authorization": "Bearer ..."}' },
    ],
  },
  metric: {
    label: "Metric", headerColor: "bg-purple-50", iconColor: "text-purple-600",
    borderColor: "border-purple-200", icon: Hash, inputs: true, outputs: false,
    configFields: [
      { key: "label", label: "Label", type: "text", placeholder: "Total Users" },
      { key: "field", label: "Data Field Path", type: "text", placeholder: "data.count" },
      { key: "format", label: "Format", type: "select", options: ["number", "currency", "percentage", "text"] },
      { key: "color", label: "Accent Color", type: "select", options: ["blue", "green", "purple", "orange", "red", "gray"] },
    ],
  },
  chart: {
    label: "Chart", headerColor: "bg-green-50", iconColor: "text-green-600",
    borderColor: "border-green-200", icon: BarChart2, inputs: true, outputs: false,
    configFields: [
      { key: "title", label: "Chart Title", type: "text", placeholder: "Activity Over Time" },
      { key: "chartType", label: "Chart Type", type: "select", options: ["line", "bar", "area"] },
      { key: "xField", label: "X-Axis Field", type: "text", placeholder: "date" },
      { key: "yField", label: "Y-Axis Field", type: "text", placeholder: "value" },
    ],
  },
  text: {
    label: "Text Display", headerColor: "bg-gray-50", iconColor: "text-gray-600",
    borderColor: "border-gray-200", icon: Type, inputs: true, outputs: false,
    configFields: [
      { key: "label", label: "Label", type: "text", placeholder: "Status" },
      { key: "field", label: "Data Field Path", type: "text", placeholder: "data.status" },
    ],
  },
  filter: {
    label: "Filter", headerColor: "bg-orange-50", iconColor: "text-orange-600",
    borderColor: "border-orange-200", icon: Filter, inputs: true, outputs: true,
    configFields: [
      { key: "field", label: "Field", type: "text", placeholder: "status" },
      { key: "operator", label: "Operator", type: "select", options: ["equals", "not equals", "contains", "greater than", "less than"] },
      { key: "value", label: "Value", type: "text", placeholder: "active" },
    ],
  },
  trigger: {
    label: "Alert / Trigger", headerColor: "bg-red-50", iconColor: "text-red-600",
    borderColor: "border-red-200", icon: Bell, inputs: true, outputs: false,
    configFields: [
      { key: "label", label: "Alert Name", type: "text", placeholder: "High Error Rate" },
      { key: "condition", label: "Condition", type: "select", options: ["greater than", "less than", "equals", "contains"] },
      { key: "threshold", label: "Threshold", type: "text", placeholder: "100" },
      { key: "notify", label: "Notify via", type: "select", options: ["dashboard", "email", "webhook"] },
    ],
  },
};

const NODE_W = 220;
const NODE_H = 90;

// ── Default canvas (pre-wired example) ────────────────────────────────────────

export const DEFAULT_NODES: CanvasNode[] = [
  { id: "n1", type: "datasource", title: "My API", x: 60, y: 140,
    config: { url: "https://api.example.com/stats", method: "GET", refreshInterval: "30" }, showInAnalytics: true },
  { id: "n2", type: "metric", title: "Active Users", x: 360, y: 60,
    config: { label: "Active Users", field: "data.users", format: "number", color: "blue" }, showInAnalytics: true },
  { id: "n3", type: "chart", title: "Activity Over Time", x: 360, y: 220,
    config: { title: "Activity Over Time", chartType: "line", xField: "date", yField: "value" }, showInAnalytics: true },
];

export const DEFAULT_CONNECTIONS: Connection[] = [
  { id: "c1", sourceNodeId: "n1", targetNodeId: "n2" },
  { id: "c2", sourceNodeId: "n1", targetNodeId: "n3" },
];

// ── Component ──────────────────────────────────────────────────────────────────

export function NodeCanvas({ storageKey, defaultNodes = DEFAULT_NODES, defaultConnections = DEFAULT_CONNECTIONS }: NodeCanvasProps) {
  // Load persisted state
  const loadSaved = () => {
    if (typeof window === "undefined") return { nodes: defaultNodes, connections: defaultConnections };
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const p = JSON.parse(raw);
        return { nodes: p.nodes ?? defaultNodes, connections: p.connections ?? defaultConnections };
      }
    } catch {}
    return { nodes: defaultNodes, connections: defaultConnections };
  };

  const init = loadSaved();
  const [nodes, setNodes] = useState<CanvasNode[]>(init.nodes);
  const [connections, setConnections] = useState<Connection[]>(init.connections);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 60, y: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{ id: string; mx0: number; my0: number; nx0: number; ny0: number } | null>(null);
  const [panning, setPanning] = useState<{ mx0: number; my0: number; ox0: number; oy0: number } | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const selectedNode = nodes.find(n => n.id === selectedId) ?? null;

  // Global mouse handlers for drag/pan
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (dragging) {
        const dx = (e.clientX - dragging.mx0) / scale;
        const dy = (e.clientY - dragging.my0) / scale;
        setNodes(prev => prev.map(n => n.id === dragging.id ? { ...n, x: dragging.nx0 + dx, y: dragging.ny0 + dy } : n));
      } else if (panning) {
        setOffset({ x: panning.ox0 + (e.clientX - panning.mx0), y: panning.oy0 + (e.clientY - panning.my0) });
      }
    };
    const onUp = () => { setDragging(null); setPanning(null); };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
  }, [dragging, panning, scale]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setScale(s => Math.min(Math.max(s * (e.deltaY > 0 ? 0.92 : 1.08), 0.2), 2.5));
  };

  const handleCanvasMD = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-node]")) return;
    setPanning({ mx0: e.clientX, my0: e.clientY, ox0: offset.x, oy0: offset.y });
    setSelectedId(null);
    setShowAddMenu(false);
    setConnectingFrom(null);
  };

  const handleNodeMD = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    const n = nodes.find(x => x.id === nodeId)!;
    setDragging({ id: nodeId, mx0: e.clientX, my0: e.clientY, nx0: n.x, ny0: n.y });
    setSelectedId(nodeId);
  };

  const handleOutputClick = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setConnectingFrom(nodeId);
  };

  const handleInputClick = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (connectingFrom && connectingFrom !== nodeId) {
      if (!connections.some(c => c.sourceNodeId === connectingFrom && c.targetNodeId === nodeId)) {
        setConnections(prev => [...prev, { id: `c${Date.now()}`, sourceNodeId: connectingFrom, targetNodeId: nodeId }]);
      }
    }
    setConnectingFrom(null);
  };

  const addNode = (type: NodeType) => {
    const def = NODE_TYPES[type];
    const n: CanvasNode = {
      id: `n${Date.now()}`, type, title: def.label,
      x: -offset.x / scale + 150, y: -offset.y / scale + 150,
      config: {}, showInAnalytics: true,
    };
    setNodes(prev => [...prev, n]);
    setSelectedId(n.id);
    setShowAddMenu(false);
  };

  const deleteNode = (id: string) => {
    setNodes(prev => prev.filter(n => n.id !== id));
    setConnections(prev => prev.filter(c => c.sourceNodeId !== id && c.targetNodeId !== id));
    setSelectedId(null);
  };

  const updateNode = (id: string, patch: Partial<CanvasNode>) =>
    setNodes(prev => prev.map(n => n.id === id ? { ...n, ...patch } : n));

  const updateConfig = (id: string, key: string, val: string) =>
    setNodes(prev => prev.map(n => n.id === id ? { ...n, config: { ...n.config, [key]: val } } : n));

  const save = useCallback(() => {
    localStorage.setItem(storageKey, JSON.stringify({ nodes, connections }));
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  }, [nodes, connections, storageKey]);

  const getPath = (srcId: string, tgtId: string) => {
    const s = nodes.find(n => n.id === srcId);
    const t = nodes.find(n => n.id === tgtId);
    if (!s || !t) return "";
    const sx = s.x + NODE_W, sy = s.y + NODE_H / 2;
    const tx = t.x, ty = t.y + NODE_H / 2;
    const cp = Math.max(Math.abs(tx - sx) * 0.5, 60);
    return `M ${sx} ${sy} C ${sx + cp} ${sy} ${tx - cp} ${ty} ${tx} ${ty}`;
  };

  return (
    <div className="flex h-full">
      {/* ── Canvas area ──────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-border shrink-0 z-10">
          <div className="relative">
            <button onClick={() => setShowAddMenu(p => !p)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add Node
            </button>
            {showAddMenu && (
              <div className="absolute top-full mt-1 left-0 bg-white border border-border rounded-xl shadow-xl z-50 py-1.5 w-44">
                {(Object.entries(NODE_TYPES) as [NodeType, any][]).map(([type, def]) => (
                  <button key={type} onClick={() => addNode(type)}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-left hover:bg-muted transition-colors">
                    <def.icon className={cn("w-3.5 h-3.5", def.iconColor)} />
                    {def.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="w-px h-5 bg-border" />
          <button onClick={() => setScale(s => Math.min(s * 1.2, 2.5))} title="Zoom in" className="p-1.5 hover:bg-muted rounded-lg transition-colors"><ZoomIn className="w-4 h-4 text-muted-foreground" /></button>
          <button onClick={() => setScale(s => Math.max(s * 0.8, 0.2))} title="Zoom out" className="p-1.5 hover:bg-muted rounded-lg transition-colors"><ZoomOut className="w-4 h-4 text-muted-foreground" /></button>
          <button onClick={() => { setScale(1); setOffset({ x: 60, y: 0 }); }} title="Reset view" className="p-1.5 hover:bg-muted rounded-lg transition-colors"><RotateCcw className="w-4 h-4 text-muted-foreground" /></button>
          <span className="text-xs text-muted-foreground tabular-nums">{Math.round(scale * 100)}%</span>
          <div className="flex-1" />
          {connectingFrom && (
            <span className="text-xs px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200 animate-pulse2">
              Click an input port to connect
            </span>
          )}
          <button onClick={() => { setNodes(defaultNodes); setConnections(defaultConnections); setSelectedId(null); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors">
            <Trash2 className="w-3.5 h-3.5" /> Reset
          </button>
          <button onClick={save}
            className={cn("flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all",
              savedFlash ? "bg-green-50 text-green-700 border-green-200" : "border-border text-foreground hover:bg-muted")}>
            <Save className="w-3.5 h-3.5" /> {savedFlash ? "Saved!" : "Save"}
          </button>
        </div>

        {/* Canvas */}
        <div
          ref={canvasRef}
          className="flex-1 overflow-hidden relative select-none cursor-grab active:cursor-grabbing"
          style={{
            background: "radial-gradient(circle, #cbd5e1 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            backgroundColor: "#f8fafc",
          }}
          onMouseDown={handleCanvasMD}
          onWheel={handleWheel}
        >
          <div
            className="absolute"
            style={{ transform: `translate(${offset.x}px,${offset.y}px) scale(${scale})`, transformOrigin: "0 0", width: "4000px", height: "3000px" }}
          >
            {/* SVG connection lines */}
            <svg className="absolute inset-0 overflow-visible pointer-events-none" width="4000" height="3000">
              <defs>
                <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L6,3 z" fill="#6366f1" opacity="0.7" />
                </marker>
              </defs>
              {connections.map(conn => {
                const path = getPath(conn.sourceNodeId, conn.targetNodeId);
                const isHighlighted = selectedId === conn.sourceNodeId || selectedId === conn.targetNodeId;
                return path ? (
                  <g key={conn.id}>
                    <path d={path} stroke={isHighlighted ? "#6366f1" : "#94a3b8"} strokeWidth={isHighlighted ? 2.5 : 2}
                      fill="none" opacity={isHighlighted ? 1 : 0.6} markerEnd="url(#arrow)" strokeDasharray={isHighlighted ? "0" : "5,3"} />
                    <path d={path} stroke="transparent" strokeWidth={14} fill="none"
                      className="pointer-events-auto cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); setConnections(prev => prev.filter(c => c.id !== conn.id)); }}
                    />
                  </g>
                ) : null;
              })}
            </svg>

            {/* Nodes */}
            {nodes.map(node => {
              const def = NODE_TYPES[node.type];
              const Icon = def.icon;
              const isSelected = selectedId === node.id;
              return (
                <div
                  key={node.id}
                  data-node="true"
                  className={cn(
                    "absolute bg-white rounded-xl border-2 shadow-sm transition-shadow cursor-pointer",
                    isSelected ? "border-indigo-500 shadow-lg shadow-indigo-100/60" : `${def.borderColor} hover:shadow-md`,
                  )}
                  style={{ left: node.x, top: node.y, width: NODE_W, minHeight: NODE_H, zIndex: isSelected ? 10 : 1 }}
                  onMouseDown={e => handleNodeMD(e, node.id)}
                >
                  {/* Input port */}
                  {def.inputs && (
                    <div
                      className={cn("absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white border-2 border-indigo-400 flex items-center justify-center z-20 pointer-events-auto",
                        connectingFrom ? "cursor-crosshair hover:border-indigo-600 hover:bg-indigo-50" : "cursor-default")}
                      onClick={e => handleInputClick(e, node.id)}
                    >
                      <div className={cn("w-2 h-2 rounded-full", connectingFrom ? "bg-indigo-500 animate-pulse" : "bg-indigo-200")} />
                    </div>
                  )}

                  {/* Output port */}
                  {def.outputs && (
                    <div
                      className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white border-2 border-indigo-500 flex items-center justify-center z-20 cursor-crosshair hover:bg-indigo-50 pointer-events-auto"
                      onClick={e => handleOutputClick(e, node.id)}
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                    </div>
                  )}

                  {/* Header */}
                  <div className={cn("flex items-center gap-2 px-3 py-2.5 rounded-t-xl border-b border-border/50", def.headerColor)}>
                    <div className="w-6 h-6 rounded-md bg-white/70 flex items-center justify-center shrink-0">
                      <Icon className={cn("w-3.5 h-3.5", def.iconColor)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-foreground truncate">{node.title}</div>
                      <div className={cn("text-[9px] font-medium uppercase tracking-wide", def.iconColor)}>{def.label}</div>
                    </div>
                    {!node.showInAnalytics && <EyeOff className="w-3 h-3 text-muted-foreground shrink-0" />}
                  </div>

                  {/* Body */}
                  <div className="px-3 py-2">
                    <div className="text-[10px] text-muted-foreground leading-relaxed truncate">
                      {node.type === "datasource" && (node.config.url || "No endpoint set")}
                      {node.type === "metric" && `${node.config.label || "Metric"} · ${node.config.format || "number"}`}
                      {node.type === "chart" && `${node.config.chartType || "line"} · ${node.config.title || "Untitled"}`}
                      {node.type === "text" && (node.config.label || "Text display")}
                      {node.type === "filter" && `${node.config.field || "field"} ${node.config.operator || "="} "${node.config.value || "..."}"`}
                      {node.type === "trigger" && `${node.config.label || "Alert"} → ${node.config.notify || "dashboard"}`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Empty hint */}
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground pointer-events-none">
              <Database className="w-10 h-10 mb-3 opacity-20" />
              <p className="text-sm font-medium">Canvas is empty</p>
              <p className="text-xs mt-1">Click "Add Node" to start building</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Config sidebar ────────────────────────────────────────────────────── */}
      {selectedNode && (
        <div className="w-72 bg-white border-l border-border flex flex-col overflow-hidden shrink-0 animate-slide-in">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div>
              <div className="text-sm font-semibold text-foreground">{selectedNode.title}</div>
              <div className={cn("text-xs", NODE_TYPES[selectedNode.type].iconColor)}>{NODE_TYPES[selectedNode.type].label}</div>
            </div>
            <button onClick={() => setSelectedId(null)} className="p-1 hover:bg-muted rounded-lg transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Node Name</label>
              <input value={selectedNode.title}
                onChange={e => updateNode(selectedNode.id, { title: e.target.value })}
                className="w-full px-2.5 py-1.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            {NODE_TYPES[selectedNode.type].configFields.map(f => (
              <div key={f.key}>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{f.label}</label>
                {f.type === "select" ? (
                  <select value={selectedNode.config[f.key] ?? ""}
                    onChange={e => updateConfig(selectedNode.id, f.key, e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                    <option value="">Choose...</option>
                    {f.options!.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : f.type === "textarea" ? (
                  <textarea value={selectedNode.config[f.key] ?? ""}
                    onChange={e => updateConfig(selectedNode.id, f.key, e.target.value)}
                    placeholder={f.placeholder} rows={3}
                    className="w-full px-2.5 py-1.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-mono text-xs" />
                ) : (
                  <input type={f.type} value={selectedNode.config[f.key] ?? ""}
                    onChange={e => updateConfig(selectedNode.id, f.key, e.target.value)}
                    placeholder={f.placeholder}
                    className="w-full px-2.5 py-1.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                )}
              </div>
            ))}

            {/* Show in Analytics toggle */}
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <div>
                <div className="text-xs font-medium text-foreground">Show in Analytics</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Render output on analytics page</div>
              </div>
              <button
                onClick={() => updateNode(selectedNode.id, { showInAnalytics: !selectedNode.showInAnalytics })}
                className={cn("relative rounded-full transition-colors focus:outline-none",
                  selectedNode.showInAnalytics ? "bg-indigo-600" : "bg-muted border border-border")}
                style={{ width: 36, height: 20 }}>
                <div className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform",
                  selectedNode.showInAnalytics ? "translate-x-4" : "translate-x-0.5")} />
              </button>
            </div>
          </div>

          <div className="p-4 border-t border-border">
            <button onClick={() => deleteNode(selectedNode.id)}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs text-red-500 font-medium border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
              <Trash2 className="w-3.5 h-3.5" /> Delete Node
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
