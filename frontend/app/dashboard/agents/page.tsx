"use client";
import { useState } from "react";
import { Plus, Bot, Radio, Mic, Type, MoreHorizontal, Zap, X } from "lucide-react";
import { mockAgents, mockTools, type Agent, type AgentMode, type ChannelType } from "@/lib/mock/data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// TODO: REPLACE WITH API — GET /workspaces/:id/agents

const channelEmoji: Record<ChannelType, string> = {
  web: "💬", whatsapp: "💚", instagram: "📸", sms: "📱",
  messenger: "💙", email: "📧", voice: "📞", slack: "🟨",
};

const modeIcon = { text: Type, voice: Mic, both: Zap };
const modeLabel = { text: "Text", voice: "Voice", both: "Text + Voice" };

const avatarOptions = ["🤖", "🧠", "💬", "⚡", "🎯", "🦾", "🤝", "✨", "🔮", "🦊"];

interface CreateForm {
  name: string;
  avatar: string;
  systemPrompt: string;
  mode: AgentMode;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>(mockAgents);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<CreateForm>({
    name: "",
    avatar: "🤖",
    systemPrompt: "",
    mode: "text",
  });

  const createAgent = () => {
    if (!form.name.trim()) { toast.error("Agent name is required"); return; }
    if (!form.systemPrompt.trim()) { toast.error("System prompt is required"); return; }

    const newAgent: Agent = {
      id: `agent_${Date.now()}`,
      name: form.name,
      avatar: form.avatar,
      systemPrompt: form.systemPrompt,
      status: "inactive",
      channels: [],
      mode: form.mode,
      toolIds: [],
      createdAt: new Date().toISOString().split("T")[0],
    };
    setAgents(prev => [...prev, newAgent]);
    setShowModal(false);
    setForm({ name: "", avatar: "🤖", systemPrompt: "", mode: "text" });
    toast.success(`Agent "${newAgent.name}" created!`);
  };

  const toggleStatus = (id: string) => {
    setAgents(prev => prev.map(a => a.id === id ? { ...a, status: a.status === "active" ? "inactive" : "active" } : a));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Agents</h1>
          <p className="text-sm text-muted-foreground">{agents.length} agent{agents.length !== 1 ? "s" : ""} in your workspace</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-convix-600 text-white text-sm font-medium rounded-lg hover:bg-convix-700 transition-colors">
          <Plus className="w-4 h-4" /> Create Agent
        </button>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {agents.map(agent => {
          const ModeIcon = modeIcon[agent.mode];
          const agentTools = mockTools.filter(t => agent.toolIds.includes(t.id));
          return (
            <div key={agent.id} className={cn("bg-white rounded-xl border p-5 transition-all hover:shadow-sm",
              agent.status === "active" ? "border-convix-200" : "border-border"
            )}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{agent.avatar}</div>
                  <div>
                    <div className="font-semibold text-foreground">{agent.name}</div>
                    <div className={cn("flex items-center gap-1.5 text-xs mt-0.5", agent.status === "active" ? "text-green-600" : "text-muted-foreground")}>
                      <div className={cn("w-1.5 h-1.5 rounded-full", agent.status === "active" ? "bg-green-500 animate-pulse" : "bg-muted-foreground/50")} />
                      {agent.status === "active" ? "Active" : "Inactive"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleStatus(agent.id)}
                    className={cn("relative rounded-full transition-colors", agent.status === "active" ? "bg-convix-600" : "bg-muted border border-border")}
                    style={{ height: "22px", width: "40px" }}>
                    <div className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                      agent.status === "active" ? "translate-x-5" : "translate-x-0.5"
                    )} />
                  </button>
                  <button className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-4">
                {agent.systemPrompt}
              </p>

              <div className="flex flex-wrap gap-2 mb-4">
                {agent.channels.map(ch => (
                  <span key={ch} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {channelEmoji[ch]} {ch}
                  </span>
                ))}
                {agent.channels.length === 0 && (
                  <span className="text-xs text-muted-foreground italic">No channels connected</span>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3">
                <div className="flex items-center gap-1.5">
                  <ModeIcon className="w-3 h-3" />
                  <span>{modeLabel[agent.mode]}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Bot className="w-3 h-3" />
                  <span>{agentTools.length} tool{agentTools.length !== 1 ? "s" : ""}</span>
                </div>
                <span>Created {agent.createdAt}</span>
              </div>
            </div>
          );
        })}

        {/* Create card */}
        <button onClick={() => setShowModal(true)}
          className="flex flex-col items-center justify-center gap-3 bg-muted/30 border border-dashed border-border rounded-xl p-8 hover:bg-muted/50 hover:border-convix-300 transition-all text-muted-foreground hover:text-convix-600 group">
          <div className="w-12 h-12 rounded-xl bg-muted group-hover:bg-convix-50 flex items-center justify-center transition-colors">
            <Plus className="w-6 h-6" />
          </div>
          <div className="text-sm font-medium">Create new agent</div>
          <div className="text-xs text-center">Any use case — customer support, internal tools, personal assistants, and more.</div>
        </button>
      </div>

      {/* Create Agent Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-border shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Create Agent</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Avatar */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Avatar</label>
                <div className="flex gap-2 flex-wrap">
                  {avatarOptions.map(a => (
                    <button key={a} onClick={() => setForm(p => ({ ...p, avatar: a }))}
                      className={cn("w-9 h-9 rounded-xl text-lg flex items-center justify-center border-2 transition-all",
                        form.avatar === a ? "border-convix-600 bg-convix-50" : "border-transparent hover:border-border"
                      )}>
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Agent Name</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Aria, SupportBot, DataHelper"
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-convix-500" />
              </div>

              {/* Mode */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Mode</label>
                <div className="flex gap-2">
                  {(["text", "voice", "both"] as AgentMode[]).map(m => {
                    const Icon = modeIcon[m];
                    return (
                      <button key={m} onClick={() => setForm(p => ({ ...p, mode: m }))}
                        className={cn("flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors flex-1 justify-center",
                          form.mode === m ? "bg-convix-600 text-white border-convix-600" : "border-border text-muted-foreground hover:text-foreground"
                        )}>
                        <Icon className="w-3 h-3" /> {modeLabel[m]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* System prompt */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">System Prompt</label>
                <textarea value={form.systemPrompt} onChange={e => setForm(p => ({ ...p, systemPrompt: e.target.value }))}
                  rows={5} placeholder="You are [name], a helpful assistant for [purpose]. Be concise, friendly, and professional..."
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-convix-500 resize-none font-mono" />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border">
              <button onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                Cancel
              </button>
              <button onClick={createAgent}
                className="flex items-center gap-2 px-4 py-2 bg-convix-600 text-white text-sm font-medium rounded-lg hover:bg-convix-700 transition-colors">
                <Bot className="w-4 h-4" /> Create Agent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
