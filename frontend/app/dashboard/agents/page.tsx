"use client";
import { useState } from "react";
import Link from "next/link";
import { Plus, Bot, Radio, X, FlaskConical, Trash2, Link2, FileText, Pencil, Mic } from "lucide-react";
import { mockAgents, mockKnowledgeItems, type Agent, type ChannelType, type KnowledgeItem } from "@/lib/mock/data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// TODO: REPLACE WITH API — GET /workspaces/:id/agents

const channelEmoji: Record<ChannelType, string> = {
  web: "💬", whatsapp: "💚", instagram: "📸", sms: "📱",
  messenger: "💙", email: "📧", voice: "📞", slack: "🟨",
};

interface AgentForm {
  name: string;
  systemPrompt: string;
  voiceEnabled: boolean;
  knowledge: Omit<KnowledgeItem, "id" | "createdAt">[];
}

interface KbForm {
  type: "text" | "url";
  title: string;
  content: string;
  url: string;
}

const emptyForm = (): AgentForm => ({ name: "", systemPrompt: "", voiceEnabled: false, knowledge: [] });
const emptyKb = (): KbForm => ({ type: "text", title: "", content: "", url: "" });

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>(mockAgents);
  const [knowledge, setKnowledge] = useState<Record<string, KnowledgeItem[]>>(mockKnowledgeItems);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<AgentForm>(emptyForm());

  // Edit modal
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<AgentForm>(emptyForm());

  // Knowledge sub-modal (shared for both create & edit)
  const [showKb, setShowKb] = useState<"create" | "edit" | null>(null);
  const [kbForm, setKbForm] = useState<KbForm>(emptyKb());

  // ── helpers ────────────────────────────────────────────────────────────────
  const openEdit = (agent: Agent) => {
    const agentKb = knowledge[agent.id] ?? [];
    setEditId(agent.id);
    setEditForm({
      name: agent.name,
      systemPrompt: agent.systemPrompt,
      voiceEnabled: agent.mode === "voice" || agent.mode === "both",
      knowledge: agentKb.map(({ id: _id, createdAt: _c, ...rest }) => rest),
    });
  };

  const toggleStatus = (id: string) =>
    setAgents(prev => prev.map(a => a.id === id ? { ...a, status: a.status === "active" ? "inactive" : "active" } : a));

  // ── create ─────────────────────────────────────────────────────────────────
  const createAgent = () => {
    if (!createForm.name.trim()) { toast.error("Agent name is required"); return; }
    if (!createForm.systemPrompt.trim()) { toast.error("System prompt is required"); return; }
    const id = `agent_${Date.now()}`;
    const newAgent: Agent = {
      id, name: createForm.name, avatar: "🤖",
      systemPrompt: createForm.systemPrompt,
      status: "inactive", channels: [],
      mode: createForm.voiceEnabled ? "both" : "text",
      toolIds: [], createdAt: new Date().toISOString().split("T")[0],
    };
    setAgents(prev => [...prev, newAgent]);
    if (createForm.knowledge.length > 0) {
      setKnowledge(prev => ({
        ...prev,
        [id]: createForm.knowledge.map((k, i) => ({ ...k, id: `kb_${Date.now()}_${i}`, createdAt: new Date().toISOString().split("T")[0] })),
      }));
    }
    setShowCreate(false);
    setCreateForm(emptyForm());
    toast.success(`Agent "${newAgent.name}" created!`);
  };

  // ── save edit ──────────────────────────────────────────────────────────────
  const saveEdit = () => {
    if (!editId) return;
    if (!editForm.name.trim()) { toast.error("Agent name is required"); return; }
    if (!editForm.systemPrompt.trim()) { toast.error("System prompt is required"); return; }
    setAgents(prev => prev.map(a => a.id === editId ? {
      ...a, name: editForm.name, systemPrompt: editForm.systemPrompt,
      mode: editForm.voiceEnabled ? "both" : "text",
    } : a));
    setKnowledge(prev => ({
      ...prev,
      [editId]: editForm.knowledge.map((k, i) => ({ ...k, id: `kb_${Date.now()}_${i}`, createdAt: new Date().toISOString().split("T")[0] })),
    }));
    setEditId(null);
    toast.success("Agent updated!");
  };

  // ── knowledge helpers ──────────────────────────────────────────────────────
  const addKbItem = (target: "create" | "edit") => {
    if (!kbForm.title.trim()) { toast.error("Title is required"); return; }
    if (kbForm.type === "text" && !kbForm.content.trim()) { toast.error("Content is required"); return; }
    if (kbForm.type === "url" && !kbForm.url.trim()) { toast.error("URL is required"); return; }
    const item: Omit<KnowledgeItem, "id" | "createdAt"> = {
      type: kbForm.type, title: kbForm.title,
      ...(kbForm.type === "text" ? { content: kbForm.content } : { url: kbForm.url }),
    };
    if (target === "create") setCreateForm(p => ({ ...p, knowledge: [...p.knowledge, item] }));
    else setEditForm(p => ({ ...p, knowledge: [...p.knowledge, item] }));
    setKbForm(emptyKb());
    setShowKb(null);
  };

  const removeKbItem = (target: "create" | "edit", idx: number) => {
    if (target === "create") setCreateForm(p => ({ ...p, knowledge: p.knowledge.filter((_, i) => i !== idx) }));
    else setEditForm(p => ({ ...p, knowledge: p.knowledge.filter((_, i) => i !== idx) }));
  };

  // ── shared sub-components ──────────────────────────────────────────────────
  const AgentForm = ({ form, onChange, onAddKb, onRemoveKb, target }: {
    form: AgentForm;
    onChange: (patch: Partial<AgentForm>) => void;
    onAddKb: () => void;
    onRemoveKb: (i: number) => void;
    target: "create" | "edit";
  }) => (
    <div className="px-6 py-5 space-y-4 overflow-y-auto">
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Agent Name</label>
        <input value={form.name} onChange={e => onChange({ name: e.target.value })}
          placeholder="e.g. Aria, SupportBot, DataHelper"
          className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-convix-500" />
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">System Prompt</label>
        <textarea value={form.systemPrompt} onChange={e => onChange({ systemPrompt: e.target.value })}
          rows={5} placeholder="You are [name], a helpful assistant for [purpose]. Be concise, friendly, and professional..."
          className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-convix-500 resize-none font-mono" />
      </div>

      {/* Voice toggle */}
      <div className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-border bg-muted/20">
        <div className="flex items-center gap-2">
          <Mic className="w-3.5 h-3.5 text-muted-foreground" />
          <div>
            <div className="text-xs font-medium text-foreground">Voice / Call mode</div>
            <div className="text-[10px] text-muted-foreground">Enable for voice & call channel deployments</div>
          </div>
        </div>
        <button onClick={() => onChange({ voiceEnabled: !form.voiceEnabled })}
          className={cn("relative rounded-full transition-colors shrink-0", form.voiceEnabled ? "bg-convix-600" : "bg-muted border border-border")}
          style={{ height: "22px", width: "40px" }}>
          <div className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
            form.voiceEnabled ? "translate-x-5" : "translate-x-0.5"
          )} />
        </button>
      </div>

      {/* Knowledge */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-muted-foreground">Knowledge</label>
          <button onClick={onAddKb} className="flex items-center gap-1 text-xs text-convix-600 hover:text-convix-700 font-medium">
            <Plus className="w-3 h-3" /> Add knowledge
          </button>
        </div>
        {form.knowledge.length === 0 ? (
          <div className="text-xs text-muted-foreground py-3 text-center border border-dashed border-border rounded-lg">
            No knowledge added yet. Click "Add knowledge" to add text blocks or URLs.
          </div>
        ) : (
          <div className="space-y-2">
            {form.knowledge.map((k, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 bg-muted/40 rounded-lg border border-border">
                {k.type === "url" ? <Link2 className="w-3.5 h-3.5 text-convix-600 shrink-0" /> : <FileText className="w-3.5 h-3.5 text-convix-600 shrink-0" />}
                <span className="text-xs text-foreground font-medium flex-1 truncate">{k.title}</span>
                <span className="text-[10px] text-muted-foreground">{k.type}</span>
                <button onClick={() => onRemoveKb(i)} className="p-0.5 text-muted-foreground hover:text-red-500 transition-colors">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Agents</h1>
          <p className="text-sm text-muted-foreground">{agents.length} agent{agents.length !== 1 ? "s" : ""} in your workspace</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-convix-600 text-white text-sm font-medium rounded-lg hover:bg-convix-700 transition-colors">
          <Plus className="w-4 h-4" /> Create Agent
        </button>
      </div>

      {/* Agent cards */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {agents.map(agent => {
          const agentKb = knowledge[agent.id] ?? [];
          const hasVoice = agent.mode === "voice" || agent.mode === "both";
          return (
            <div key={agent.id} className={cn("bg-white rounded-xl border p-5 flex flex-col gap-4 transition-all hover:shadow-sm",
              agent.status === "active" ? "border-convix-200" : "border-border"
            )}>
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold text-foreground text-sm truncate">{agent.name}</div>
                  <div className={cn("flex items-center gap-1.5 text-xs mt-0.5", agent.status === "active" ? "text-green-600" : "text-muted-foreground")}>
                    <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", agent.status === "active" ? "bg-green-500 animate-pulse" : "bg-muted-foreground/50")} />
                    {agent.status === "active" ? "Active" : "Inactive"}
                    {hasVoice && <span className="ml-1 flex items-center gap-0.5 text-convix-500"><Mic className="w-2.5 h-2.5" />voice</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => openEdit(agent)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => toggleStatus(agent.id)}
                    className={cn("relative rounded-full transition-colors", agent.status === "active" ? "bg-convix-600" : "bg-muted border border-border")}
                    style={{ height: "22px", width: "40px" }}>
                    <div className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                      agent.status === "active" ? "translate-x-5" : "translate-x-0.5"
                    )} />
                  </button>
                </div>
              </div>

              {/* System prompt preview */}
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{agent.systemPrompt}</p>

              {/* Channels */}
              <div className="flex flex-wrap gap-1.5">
                {agent.channels.map(ch => (
                  <span key={ch} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {channelEmoji[ch]} {ch}
                  </span>
                ))}
                {agent.channels.length === 0 && <span className="text-xs text-muted-foreground italic">No channels connected</span>}
              </div>

              {/* Knowledge pills */}
              {agentKb.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {agentKb.map(kb => (
                    <span key={kb.id} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-convix-50 text-convix-700 border border-convix-100">
                      {kb.type === "url" ? <Link2 className="w-2.5 h-2.5" /> : <FileText className="w-2.5 h-2.5" />}
                      {kb.title}
                    </span>
                  ))}
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center gap-2 border-t border-border pt-3 mt-auto">
                <Link href={`/dashboard/agents/${agent.id}/test`}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-convix-600 text-white rounded-lg hover:bg-convix-700 transition-colors">
                  <FlaskConical className="w-3.5 h-3.5" /> Test Agent
                </Link>
                <div className="flex items-center gap-2 ml-auto text-xs text-muted-foreground">
                  <Radio className="w-3 h-3" />
                  <span>{agent.channels.length} ch.</span>
                  <span>·</span>
                  <span>{agent.createdAt}</span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Create placeholder card */}
        <button onClick={() => setShowCreate(true)}
          className="flex flex-col items-center justify-center gap-3 bg-muted/30 border border-dashed border-border rounded-xl p-8 hover:bg-muted/50 hover:border-convix-300 transition-all text-muted-foreground hover:text-convix-600 group">
          <div className="w-12 h-12 rounded-xl bg-muted group-hover:bg-convix-50 flex items-center justify-center transition-colors">
            <Plus className="w-6 h-6" />
          </div>
          <div className="text-sm font-medium">Create new agent</div>
          <div className="text-xs text-center">Any use case — customer support, internal tools, assistants, and more.</div>
        </button>
      </div>

      {/* ── Create Modal ──────────────────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-border shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <h2 className="font-semibold text-foreground">Create Agent</h2>
              <button onClick={() => { setShowCreate(false); setCreateForm(emptyForm()); }} className="p-1.5 rounded-lg hover:bg-muted">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <AgentForm
              form={createForm}
              onChange={patch => setCreateForm(p => ({ ...p, ...patch }))}
              onAddKb={() => { setKbForm(emptyKb()); setShowKb("create"); }}
              onRemoveKb={i => removeKbItem("create", i)}
              target="create"
            />
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border shrink-0">
              <button onClick={() => { setShowCreate(false); setCreateForm(emptyForm()); }} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
              <button onClick={createAgent} className="flex items-center gap-2 px-4 py-2 bg-convix-600 text-white text-sm font-medium rounded-lg hover:bg-convix-700">
                <Bot className="w-4 h-4" /> Create Agent
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ────────────────────────────────────────────────────────── */}
      {editId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-border shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <h2 className="font-semibold text-foreground">Edit Agent</h2>
              <button onClick={() => setEditId(null)} className="p-1.5 rounded-lg hover:bg-muted">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <AgentForm
              form={editForm}
              onChange={patch => setEditForm(p => ({ ...p, ...patch }))}
              onAddKb={() => { setKbForm(emptyKb()); setShowKb("edit"); }}
              onRemoveKb={i => removeKbItem("edit", i)}
              target="edit"
            />
            <div className="flex items-center justify-between px-6 py-4 border-t border-border shrink-0">
              <button
                onClick={() => { setAgents(prev => prev.filter(a => a.id !== editId)); setEditId(null); toast.success("Agent deleted"); }}
                className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> Delete agent
              </button>
              <div className="flex items-center gap-2">
                <button onClick={() => setEditId(null)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
                <button onClick={saveEdit} className="px-4 py-2 bg-convix-600 text-white text-sm font-medium rounded-lg hover:bg-convix-700">Save changes</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Knowledge sub-modal (shared) ──────────────────────────────────────── */}
      {showKb && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-border shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
              <h3 className="font-semibold text-sm text-foreground">Add Knowledge</h3>
              <button onClick={() => setShowKb(null)} className="p-1 rounded-md hover:bg-muted">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="flex gap-2">
                {(["text", "url"] as const).map(t => (
                  <button key={t} onClick={() => setKbForm(p => ({ ...p, type: t }))}
                    className={cn("flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors",
                      kbForm.type === t ? "bg-convix-600 text-white border-convix-600" : "border-border text-muted-foreground hover:text-foreground"
                    )}>
                    {t === "text" ? "Text Block" : "URL"}
                  </button>
                ))}
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Title</label>
                <input value={kbForm.title} onChange={e => setKbForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Company Overview"
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-convix-500" />
              </div>
              {kbForm.type === "text" ? (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Content</label>
                  <textarea value={kbForm.content} onChange={e => setKbForm(p => ({ ...p, content: e.target.value }))}
                    rows={4} placeholder="Paste your knowledge content here..."
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-convix-500 resize-none" />
                </div>
              ) : (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">URL</label>
                  <input value={kbForm.url} onChange={e => setKbForm(p => ({ ...p, url: e.target.value }))}
                    placeholder="https://docs.example.com/..."
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-convix-500" />
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-border">
              <button onClick={() => setShowKb(null)} className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
              <button onClick={() => addKbItem(showKb)}
                className="px-3 py-1.5 text-sm bg-convix-600 text-white font-medium rounded-lg hover:bg-convix-700 transition-colors">
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
