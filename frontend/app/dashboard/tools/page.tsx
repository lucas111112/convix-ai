"use client";
import { useState } from "react";
import { Plus, Globe, Webhook, Database, Code, CheckCircle, AlertCircle, Clock, X, Loader2, Link2 } from "lucide-react";
import { mockTools, mockAgents, type Tool, type ToolType } from "@/lib/mock/data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// TODO: REPLACE WITH API — GET /workspaces/:id/tools

const toolTypeConfig: Record<ToolType, { icon: any; label: string; color: string; placeholder: string }> = {
  http: { icon: Globe, label: "HTTP Endpoint", color: "text-blue-500 bg-blue-50", placeholder: "https://api.example.com/endpoint" },
  webhook: { icon: Webhook, label: "Webhook", color: "text-purple-500 bg-purple-50", placeholder: "https://hooks.example.com/..." },
  database: { icon: Database, label: "Database Query", color: "text-green-500 bg-green-50", placeholder: "postgresql://..." },
  function: { icon: Code, label: "Custom Function", color: "text-orange-500 bg-orange-50", placeholder: "function handler(input) { ... }" },
};

const statusIcon = {
  connected: CheckCircle,
  error: AlertCircle,
  untested: Clock,
};
const statusColor = {
  connected: "text-green-600",
  error: "text-red-500",
  untested: "text-muted-foreground",
};

interface CreateForm {
  name: string;
  type: ToolType;
  url: string;
}

export default function ToolsPage() {
  const [tools, setTools] = useState<Tool[]>(mockTools);
  const [showModal, setShowModal] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [form, setForm] = useState<CreateForm>({ name: "", type: "http", url: "" });

  const createTool = () => {
    if (!form.name.trim()) { toast.error("Tool name is required"); return; }
    if (!form.url.trim()) { toast.error("URL / config is required"); return; }

    const newTool: Tool = {
      id: `tool_${Date.now()}`,
      name: form.name,
      type: form.type,
      url: form.url,
      status: "untested",
      assignedAgents: [],
      createdAt: new Date().toISOString().split("T")[0],
    };
    setTools(prev => [...prev, newTool]);
    setShowModal(false);
    setForm({ name: "", type: "http", url: "" });
    toast.success(`Tool "${newTool.name}" added!`);
  };

  const testTool = async (id: string) => {
    setTesting(id);
    await new Promise(r => setTimeout(r, 1500));
    setTools(prev => prev.map(t => t.id === id ? { ...t, status: Math.random() > 0.3 ? "connected" : "error" } : t));
    const result = tools.find(t => t.id === id);
    setTesting(null);
    toast.success(`Test complete for "${result?.name}"`);
  };

  const assignToAgent = (toolId: string, agentId: string) => {
    setTools(prev => prev.map(t => {
      if (t.id !== toolId) return t;
      const has = t.assignedAgents.includes(agentId);
      return { ...t, assignedAgents: has ? t.assignedAgents.filter(a => a !== agentId) : [...t.assignedAgents, agentId] };
    }));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Tools</h1>
          <p className="text-sm text-muted-foreground">Connect external data sources and actions your agents can use.</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-convix-600 text-white text-sm font-medium rounded-lg hover:bg-convix-700 transition-colors">
          <Plus className="w-4 h-4" /> Add Tool
        </button>
      </div>

      {/* Tool type overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(Object.entries(toolTypeConfig) as [ToolType, typeof toolTypeConfig[ToolType]][]).map(([type, cfg]) => (
          <div key={type} className="bg-white rounded-xl border border-border p-4 flex items-center gap-3">
            <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", cfg.color)}>
              <cfg.icon className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-medium text-foreground">{cfg.label}</div>
              <div className="text-[10px] text-muted-foreground">{tools.filter(t => t.type === type).length} connected</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tool list */}
      <div className="space-y-3">
        {tools.map(tool => {
          const cfg = toolTypeConfig[tool.type];
          const StatusIcon = statusIcon[tool.status];
          const assignedAgentNames = mockAgents
            .filter(a => tool.assignedAgents.includes(a.id))
            .map(a => a.name);
          const isTestingThis = testing === tool.id;

          return (
            <div key={tool.id} className="bg-white rounded-xl border border-border p-5">
              <div className="flex items-start gap-4">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", cfg.color)}>
                  <cfg.icon className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium text-foreground text-sm">{tool.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{cfg.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                    <Link2 className="w-3 h-3" />
                    <span className="font-mono truncate max-w-xs">{tool.url}</span>
                  </div>

                  {/* Agents assignment */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">Assigned to:</span>
                    {mockAgents.map(agent => (
                      <button key={agent.id}
                        onClick={() => assignToAgent(tool.id, agent.id)}
                        className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors",
                          tool.assignedAgents.includes(agent.id)
                            ? "bg-convix-50 border-convix-300 text-convix-700"
                            : "border-border text-muted-foreground hover:border-convix-200 hover:text-foreground"
                        )}>
                        <span>{agent.avatar}</span> {agent.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className={cn("flex items-center gap-1 text-xs font-medium", statusColor[tool.status])}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    <span className="capitalize">{tool.status}</span>
                  </div>
                  <button onClick={() => testTool(tool.id)} disabled={isTestingThis}
                    className={cn("flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors",
                      isTestingThis
                        ? "border-border text-muted-foreground cursor-not-allowed"
                        : "border-convix-300 text-convix-600 hover:bg-convix-50"
                    )}>
                    {isTestingThis ? <><Loader2 className="w-3 h-3 animate-spin" /> Testing…</> : "Test"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {tools.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border border-dashed border-border rounded-xl">
            <Globe className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">No tools yet</p>
            <p className="text-xs mt-1">Add an HTTP endpoint, webhook, or database to give your agents live data.</p>
          </div>
        )}
      </div>

      {/* Create Tool Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-border shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Add Tool</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Tool Name</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Customer DB Lookup, Slack Notifier"
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-convix-500" />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Tool Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(toolTypeConfig) as [ToolType, typeof toolTypeConfig[ToolType]][]).map(([type, cfg]) => (
                    <button key={type} onClick={() => setForm(p => ({ ...p, type }))}
                      className={cn("flex items-center gap-2 px-3 py-2.5 text-xs rounded-lg border transition-colors",
                        form.type === type ? "bg-convix-600 text-white border-convix-600" : "border-border text-muted-foreground hover:text-foreground hover:border-convix-200"
                      )}>
                      <cfg.icon className="w-3.5 h-3.5" /> {cfg.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  {form.type === "function" ? "Function Code" : "URL / Connection String"}
                </label>
                <input value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))}
                  placeholder={toolTypeConfig[form.type].placeholder}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-convix-500 font-mono" />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border">
              <button onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                Cancel
              </button>
              <button onClick={createTool}
                className="flex items-center gap-2 px-4 py-2 bg-convix-600 text-white text-sm font-medium rounded-lg hover:bg-convix-700 transition-colors">
                <Plus className="w-4 h-4" /> Add Tool
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
