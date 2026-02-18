"use client";
import { useState } from "react";
import { Bot, Send, X, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// TODO: REPLACE WITH API — GET/PATCH /agents/:id/widget

const colors = ["#6366f1", "#2563eb", "#16a34a", "#dc2626", "#d97706", "#0891b2", "#7c3aed", "#db2777"];

type ProfileTab = "web" | "app";

export default function WidgetPage() {
  const [activeTab, setActiveTab] = useState<ProfileTab>("web");
  const [copied, setCopied] = useState(false);

  const [webConfig, setWebConfig] = useState({
    agentName: "Axon AI",
    greeting: "Hi there! 👋 How can I help you today?",
    primaryColor: "#6366f1",
    position: "bottom-right" as "bottom-right" | "bottom-left",
    placeholder: "Ask me anything...",
    hideBranding: false,
  });

  const [appConfig, setAppConfig] = useState({
    agentName: "Axon AI",
    greeting: "Hello! What can I help you with?",
    primaryColor: "#2563eb",
    placeholder: "Type a message...",
    hideBranding: false,
  });

  const config = activeTab === "web" ? webConfig : appConfig;
  const setConfig = activeTab === "web"
    ? (fn: (p: typeof webConfig) => typeof webConfig) => setWebConfig(fn)
    : (fn: (p: typeof appConfig) => typeof appConfig) => setAppConfig(fn as any);

  const embedCode = `<script src="https://cdn.axon.ai/widget.js" data-agent-id="YOUR_AGENT_ID" async></script>`;

  const copy = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    toast.success("Embed code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const demoMessages = [
    { role: "ai", text: config.greeting },
    { role: "user", text: "Can I deploy multiple agents under one account?" },
    { role: "ai", text: "Yes! You can create as many agents as your plan allows — each with its own system prompt, channels, and tool connections." },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-foreground">Chat Widget</h1>
        <p className="text-sm text-muted-foreground">Customize your agent profile for each deployment surface.</p>
      </div>

      <div className="grid grid-cols-5 gap-6">
        {/* Config panel */}
        <div className="col-span-2 space-y-4">
          {/* Profile tabs */}
          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <div className="flex border-b border-border">
              {(["web", "app"] as ProfileTab[]).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={cn("flex-1 px-4 py-2.5 text-xs font-medium transition-colors",
                    activeTab === tab ? "bg-convix-50 text-convix-700 border-b-2 border-convix-600" : "text-muted-foreground hover:text-foreground"
                  )}>
                  {tab === "web" ? "In-Web Profile" : "In-App Profile"}
                </button>
              ))}
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Agent Name</label>
                <input value={config.agentName} onChange={e => setConfig(p => ({ ...p, agentName: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-convix-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Greeting Message</label>
                <textarea value={config.greeting} onChange={e => setConfig(p => ({ ...p, greeting: e.target.value }))} rows={2}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-convix-500 resize-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Brand Color</label>
                <div className="flex gap-2 flex-wrap">
                  {colors.map(c => (
                    <button key={c} onClick={() => setConfig(p => ({ ...p, primaryColor: c }))}
                      className={cn("w-7 h-7 rounded-full border-2 transition-all", config.primaryColor === c ? "border-foreground scale-110" : "border-transparent hover:scale-105")}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              {activeTab === "web" && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Position</label>
                  <div className="flex gap-2">
                    {["bottom-right", "bottom-left"].map(p => (
                      <button key={p} onClick={() => setWebConfig(prev => ({ ...prev, position: p as any }))}
                        className={cn("px-3 py-1.5 text-xs rounded-lg border transition-colors", webConfig.position === p ? "bg-convix-600 text-white border-convix-600" : "border-border text-muted-foreground hover:text-foreground")}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-foreground">Hide "Powered by Axon"</div>
                  <div className="text-xs text-muted-foreground">Scale plan required</div>
                </div>
                <button onClick={() => toast.info("Upgrade to Scale plan to remove branding")}
                  className={cn("relative rounded-full transition-colors", "bg-muted border border-border")} style={{ height: "22px", width: "40px" }}>
                  <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow" />
                </button>
              </div>
            </div>
          </div>

          {/* Embed code (web only) */}
          {activeTab === "web" && (
            <div className="bg-white rounded-xl border border-border p-5">
              <h3 className="font-semibold text-sm text-foreground mb-3">Embed Code</h3>
              <div className="bg-muted rounded-lg p-3 text-xs font-mono text-muted-foreground break-all leading-relaxed">
                {embedCode}
              </div>
              <button onClick={copy}
                className="mt-3 w-full flex items-center justify-center gap-2 py-2 text-xs font-medium bg-convix-600 text-white rounded-lg hover:bg-convix-700 transition-colors">
                {copied ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy Code</>}
              </button>
              <p className="text-xs text-muted-foreground mt-2 text-center">Paste before the closing &lt;/body&gt; tag</p>
            </div>
          )}
          {activeTab === "app" && (
            <div className="bg-white rounded-xl border border-border p-5">
              <h3 className="font-semibold text-sm text-foreground mb-2">SDK Integration</h3>
              <p className="text-xs text-muted-foreground mb-3">Use the Axon SDK to embed the agent in your mobile or desktop app.</p>
              <div className="bg-muted rounded-lg p-3 text-xs font-mono text-muted-foreground">
                npm install @axon-ai/sdk
              </div>
            </div>
          )}
        </div>

        {/* Live preview */}
        <div className="col-span-3 flex flex-col items-end justify-end bg-gradient-to-br from-muted/20 to-muted/40 rounded-2xl border border-border p-6 min-h-[550px] relative">
          <div className="absolute top-4 left-4 text-xs text-muted-foreground font-medium bg-white px-2 py-1 rounded-full border border-border">
            Live Preview · {activeTab === "web" ? "Web Widget" : "In-App"}
          </div>
          {/* Widget window */}
          <div className="w-80 bg-white rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden mb-4" style={{ height: "460px" }}>
            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between" style={{ backgroundColor: config.primaryColor }}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{config.agentName || "Axon AI"}</div>
                  <div className="text-xs text-white/70 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-300" /> Online
                  </div>
                </div>
              </div>
              <X className="w-4 h-4 text-white/70" />
            </div>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {demoMessages.map((m, i) => (
                <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-[80%] px-3 py-2 rounded-2xl text-xs leading-relaxed",
                    m.role === "user" ? "text-white" : "bg-muted text-foreground"
                  )} style={m.role === "user" ? { backgroundColor: config.primaryColor } : {}}>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
            {/* Input */}
            <div className="border-t border-border px-3 py-2 flex items-center gap-2">
              <input placeholder={config.placeholder} className="flex-1 text-xs focus:outline-none bg-transparent text-muted-foreground" />
              <button className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: config.primaryColor }}>
                <Send className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
            {!config.hideBranding && (
              <div className="text-center py-1 text-[9px] text-muted-foreground border-t border-border">
                Powered by <span className="font-semibold">Axon AI</span>
              </div>
            )}
          </div>
          {/* Bubble (web only) */}
          {activeTab === "web" && (
            <div className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center" style={{ backgroundColor: config.primaryColor }}>
              <Bot className="w-6 h-6 text-white" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
