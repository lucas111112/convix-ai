"use client";
import { useState } from "react";
import { Bot, Send, Copy, Check, Monitor, Smartphone, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// TODO: REPLACE WITH API — GET/PATCH /agents/:id/widget

type Template = "bubble" | "sidepanel" | "inline" | "fullpage";
type CodeTab = "html" | "react" | "vue";
type Device = "desktop" | "mobile";

interface WidgetConfig {
  primaryColor: string;
  theme: "light" | "dark";
  greeting: string;
  position: "bottom-right" | "bottom-left" | "top-right";
  cornerRadius: number;
  shadow: "none" | "soft" | "strong";
  headerTitle: string;
  inputPlaceholder: string;
}

const TEMPLATES: { id: Template; label: string; desc: string; ascii: string }[] = [
  {
    id: "bubble",
    label: "Bubble",
    desc: "Floating button, opens chat on click",
    ascii: `┌───────────┐\n│  [page]   │\n│           │\n│        ●  │\n└───────────┘`,
  },
  {
    id: "sidepanel",
    label: "Side Panel",
    desc: "Slides in from right edge",
    ascii: `┌─────┬─────┐\n│     │chat │\n│page │ ─── │\n│     │[inp]│\n└─────┴─────┘`,
  },
  {
    id: "inline",
    label: "Inline",
    desc: "Embedded in a <div> container",
    ascii: `┌───────────┐\n│ ┌───────┐ │\n│ │ chat  │ │\n│ │ msgs  │ │\n│ │[input]│ │\n│ └───────┘ │\n└───────────┘`,
  },
  {
    id: "fullpage",
    label: "Full Page",
    desc: "Chat takes the entire viewport",
    ascii: `┌───────────┐\n│ Agent  ●  │\n│───────────│\n│  hi there │\n│  how can  │\n│ [input──] │\n└───────────┘`,
  },
];

const defaultConfig: WidgetConfig = {
  primaryColor: "#6d28d9",
  theme: "light",
  greeting: "Hi! How can I help?",
  position: "bottom-right",
  cornerRadius: 16,
  shadow: "soft",
  headerTitle: "Axon AI",
  inputPlaceholder: "Type a message…",
};

const shadowStyles: Record<"none" | "soft" | "strong", string> = {
  none: "none",
  soft: "0 4px 24px rgba(0,0,0,0.12)",
  strong: "0 8px 40px rgba(0,0,0,0.28)",
};

export default function WidgetPage() {
  const [template, setTemplate] = useState<Template>("bubble");
  const [device, setDevice] = useState<Device>("desktop");
  const [config, setConfig] = useState<WidgetConfig>(defaultConfig);
  const [codeTab, setCodeTab] = useState<CodeTab>("html");
  const [copied, setCopied] = useState(false);

  const updateConfig = (patch: Partial<WidgetConfig>) => setConfig(p => ({ ...p, ...patch }));

  const htmlSnippet = `<script>
  window.AxonConfig = {
    agentId: "YOUR_AGENT_ID",  // get this from your agent's edit page
    theme: "${config.theme}",
    primaryColor: "${config.primaryColor}",
    position: "${config.position}",  // bubble only: bottom-right | bottom-left | top-right
    greeting: "${config.greeting}",
    headerTitle: "${config.headerTitle}",
    cornerRadius: ${config.cornerRadius},
    shadow: "${config.shadow}",
  };
</script>
<script src="https://cdn.axon.ai/widget.js" defer></script>`;

  const reactSnippet = `import AxonWidget from "@axon-ai/react";
// Store your agent ID in .env.local as NEXT_PUBLIC_AXON_AGENT_ID
<AxonWidget
  agentId={process.env.NEXT_PUBLIC_AXON_AGENT_ID}
  theme="${config.theme}"
  primaryColor="${config.primaryColor}"
  greeting="${config.greeting}"
  headerTitle="${config.headerTitle}"
  cornerRadius={${config.cornerRadius}}
  shadow="${config.shadow}"
/>`;

  const vueSnippet = `import { AxonWidget } from "@axon-ai/vue";
// Store your agent ID in .env as VITE_AXON_AGENT_ID
<AxonWidget
  :agentId="import.meta.env.VITE_AXON_AGENT_ID"
  theme="${config.theme}"
  headerTitle="${config.headerTitle}"
  :cornerRadius="${config.cornerRadius}"
/>`;

  const snippets: Record<CodeTab, string> = { html: htmlSnippet, react: reactSnippet, vue: vueSnippet };

  const copy = () => {
    navigator.clipboard.writeText(snippets[codeTab]);
    setCopied(true);
    toast.success("Code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const msgs = [
    { role: "ai", text: config.greeting },
    { role: "user", text: "What plans do you offer?" },
    { role: "ai", text: "We have Starter, Builder, and Scale — want me to walk you through them?" },
  ];

  const chatBg = config.theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-border";
  const msgBg = config.theme === "dark" ? "bg-gray-700 text-gray-100" : "bg-muted text-foreground";
  const pageBg = config.theme === "dark" ? "bg-gray-900" : "bg-gray-50";

  return (
    <div className="animate-fade-in h-full">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-foreground">Widget Builder</h1>
        <p className="text-sm text-muted-foreground">Choose a template, customise, and grab your embed code.</p>
      </div>

      <div className="flex gap-4" style={{ height: "calc(100vh - 190px)", minHeight: "600px" }}>

        {/* LEFT — Template picker (200px) */}
        <div className="w-[200px] shrink-0 space-y-2 overflow-y-auto pr-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Template</p>
          {TEMPLATES.map(t => (
            <button key={t.id} onClick={() => setTemplate(t.id)}
              className={cn("w-full text-left rounded-xl border p-3 transition-all",
                template === t.id ? "border-convix-400 bg-convix-50" : "border-border bg-white hover:border-convix-200"
              )}>
              <pre className={cn("text-[8px] leading-tight font-mono mb-2 select-none",
                template === t.id ? "text-convix-600" : "text-muted-foreground"
              )}>{t.ascii}</pre>
              <div className={cn("text-xs font-semibold", template === t.id ? "text-convix-700" : "text-foreground")}>{t.label}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{t.desc}</div>
            </button>
          ))}
        </div>

        {/* CENTER — Live preview (flex-1) */}
        <div className="flex-1 flex flex-col bg-muted/20 rounded-2xl border border-border overflow-hidden">
          {/* Device toggle */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-white/60 shrink-0">
            <span className="text-xs font-medium text-muted-foreground">
              Live Preview · {TEMPLATES.find(t => t.id === template)?.label}
            </span>
            <div className="flex items-center bg-muted rounded-lg overflow-hidden">
              {(["desktop", "mobile"] as Device[]).map(d => (
                <button key={d} onClick={() => setDevice(d)}
                  className={cn("flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
                    device === d ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}>
                  {d === "desktop" ? <Monitor className="w-3 h-3" /> : <Smartphone className="w-3 h-3" />}
                  {d === "desktop" ? "Desktop" : "Mobile"}
                </button>
              ))}
            </div>
          </div>

          {/* Preview area */}
          <div className={cn("flex-1 flex items-center justify-center p-6 overflow-hidden", pageBg)}>
            <div className={cn("transition-all duration-300 relative w-full", device === "mobile" ? "max-w-sm" : "max-w-2xl")}>
              {/* Fake browser chrome */}
              <div className="bg-gray-200 rounded-t-xl px-4 py-2 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 bg-white rounded-md px-3 py-1 text-[10px] text-muted-foreground">yoursite.com</div>
              </div>

              {/* Browser content */}
              <div className={cn("rounded-b-xl border border-gray-200 relative overflow-hidden", pageBg,
                template === "fullpage" ? "h-[400px]" : "h-[360px]"
              )}>
                {/* Fake page content (not full page) */}
                {template !== "fullpage" && (
                  <div className="p-4 space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-3/4" />
                    <div className="h-2 bg-gray-200 rounded w-1/2" />
                    <div className="h-2 bg-gray-200 rounded w-5/6" />
                    <div className="h-2 bg-gray-200 rounded w-2/3" />
                  </div>
                )}

                {/* Bubble template */}
                {template === "bubble" && (
                  <>
                    <div className={cn("absolute w-[220px] border flex flex-col overflow-hidden", chatBg,
                      config.position === "bottom-left" ? "left-3 bottom-12" : "right-3 bottom-12",
                      config.position === "top-right" ? "right-3 top-3 bottom-auto" : ""
                    )} style={{ height: "200px", borderRadius: config.cornerRadius, boxShadow: shadowStyles[config.shadow] }}>
                      <div className="px-3 py-2 flex items-center gap-2 shrink-0" style={{ backgroundColor: config.primaryColor }}>
                        <Bot className="w-3.5 h-3.5 text-white" />
                        <span className="text-[10px] font-medium text-white">{config.headerTitle}</span>
                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-green-300" />
                      </div>
                      <div className="flex-1 p-2 space-y-1.5 overflow-hidden">
                        {msgs.map((m, i) => (
                          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                            <div className={cn("max-w-[80%] px-2 py-1 rounded-xl text-[9px] leading-relaxed",
                              m.role === "user" ? "text-white" : msgBg
                            )} style={m.role === "user" ? { backgroundColor: config.primaryColor } : {}}>
                              {m.text}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="border-t border-gray-200 px-2 py-1 flex items-center gap-1 shrink-0">
                        <input readOnly placeholder={config.inputPlaceholder} className="flex-1 text-[9px] focus:outline-none bg-transparent text-muted-foreground" />
                        <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: config.primaryColor }}>
                          <Send className="w-2 h-2 text-white" />
                        </div>
                      </div>
                    </div>
                    <div className={cn("absolute bottom-3 w-8 h-8 rounded-full shadow-lg flex items-center justify-center",
                      config.position === "bottom-left" ? "left-3" : "right-3"
                    )} style={{ backgroundColor: config.primaryColor }}>
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  </>
                )}

                {/* Side panel template */}
                {template === "sidepanel" && (
                  <div className="absolute inset-y-0 right-0 w-[180px] border-l border-gray-200 flex flex-col overflow-hidden"
                    style={{ backgroundColor: config.theme === "dark" ? "#1f2937" : "white", boxShadow: shadowStyles[config.shadow] }}>
                    <div className="px-3 py-2 flex items-center gap-2 shrink-0" style={{ backgroundColor: config.primaryColor }}>
                      <Bot className="w-3.5 h-3.5 text-white" />
                      <span className="text-[10px] font-medium text-white">{config.headerTitle}</span>
                    </div>
                    <div className="flex-1 p-2 space-y-1.5 overflow-hidden">
                      {msgs.map((m, i) => (
                        <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                          <div className={cn("max-w-[85%] px-2 py-1 rounded-xl text-[9px] leading-relaxed",
                            m.role === "user" ? "text-white" : msgBg
                          )} style={m.role === "user" ? { backgroundColor: config.primaryColor } : {}}>
                            {m.text}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-gray-200 px-2 py-1 flex items-center gap-1 shrink-0">
                      <input readOnly placeholder={config.inputPlaceholder} className="flex-1 text-[9px] focus:outline-none bg-transparent text-muted-foreground" />
                    </div>
                  </div>
                )}

                {/* Inline template */}
                {template === "inline" && (
                  <div className="px-4 pb-4">
                    <div className={cn("border overflow-hidden", chatBg)} style={{ height: "215px", borderRadius: config.cornerRadius, boxShadow: shadowStyles[config.shadow] }}>
                      <div className="px-3 py-2 flex items-center gap-2" style={{ backgroundColor: config.primaryColor }}>
                        <Bot className="w-3.5 h-3.5 text-white" />
                        <span className="text-[10px] font-medium text-white">{config.headerTitle}</span>
                      </div>
                      <div className="p-2 space-y-1.5 overflow-hidden" style={{ height: "145px" }}>
                        {msgs.map((m, i) => (
                          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                            <div className={cn("max-w-[80%] px-2 py-1 rounded-xl text-[9px] leading-relaxed",
                              m.role === "user" ? "text-white" : msgBg
                            )} style={m.role === "user" ? { backgroundColor: config.primaryColor } : {}}>
                              {m.text}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="border-t border-gray-200 px-2 py-1 flex items-center gap-1">
                        <input readOnly placeholder={config.inputPlaceholder} className="flex-1 text-[9px] focus:outline-none bg-transparent text-muted-foreground" />
                        <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: config.primaryColor }}>
                          <Send className="w-2 h-2 text-white" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Full page template */}
                {template === "fullpage" && (
                  <div className="absolute inset-0 flex flex-col"
                    style={{ backgroundColor: config.theme === "dark" ? "#111827" : "white" }}>
                    <div className="px-4 py-3 flex items-center gap-3 shrink-0" style={{ backgroundColor: config.primaryColor }}>
                      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                        <Bot className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white">{config.headerTitle}</div>
                        <div className="text-[10px] text-white/70">Online</div>
                      </div>
                    </div>
                    <div className="flex-1 p-3 space-y-2 overflow-hidden">
                      {msgs.map((m, i) => (
                        <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                          <div className={cn("max-w-[70%] px-3 py-2 rounded-2xl text-xs leading-relaxed",
                            m.role === "user" ? "text-white" : msgBg
                          )} style={m.role === "user" ? { backgroundColor: config.primaryColor } : {}}>
                            {m.text}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className={cn("border-t px-4 py-2 flex items-center gap-2 shrink-0",
                      config.theme === "dark" ? "border-gray-700" : "border-border"
                    )}>
                      <input readOnly placeholder={config.inputPlaceholder} className={cn("flex-1 text-xs focus:outline-none bg-transparent",
                        config.theme === "dark" ? "text-gray-300 placeholder:text-gray-500" : "text-muted-foreground"
                      )} />
                      <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: config.primaryColor }}>
                        <Send className="w-3.5 h-3.5 text-white" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — Code output + controls (300px) */}
        <div className="w-[300px] shrink-0 flex flex-col gap-3 overflow-y-auto">
          {/* Customisation controls */}
          <div className="bg-white rounded-xl border border-border p-4 space-y-4">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Customise</p>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Primary Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={config.primaryColor} onChange={e => updateConfig({ primaryColor: e.target.value })}
                  className="w-9 h-9 rounded-lg border border-border cursor-pointer p-0.5" />
                <input type="text" value={config.primaryColor} onChange={e => updateConfig({ primaryColor: e.target.value })}
                  className="flex-1 px-2.5 py-1.5 text-xs border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-convix-500 font-mono" />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Theme</label>
              <div className="flex gap-2">
                {(["light", "dark"] as const).map(t => (
                  <button key={t} onClick={() => updateConfig({ theme: t })}
                    className={cn("flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors capitalize",
                      config.theme === t ? "bg-convix-600 text-white border-convix-600" : "border-border text-muted-foreground hover:text-foreground"
                    )}>{t}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Greeting <span className="font-normal">({config.greeting.length}/80)</span>
              </label>
              <input value={config.greeting} maxLength={80} onChange={e => updateConfig({ greeting: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-convix-500" />
            </div>

            {template === "bubble" && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Position</label>
                <div className="space-y-1">
                  {(["bottom-right", "bottom-left", "top-right"] as const).map(p => (
                    <button key={p} onClick={() => updateConfig({ position: p })}
                      className={cn("w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg border transition-colors",
                        config.position === p ? "bg-convix-50 border-convix-300 text-convix-700" : "border-border text-muted-foreground hover:text-foreground"
                      )}>
                      <ChevronRight className={cn("w-3 h-3 shrink-0 transition-opacity", config.position === p ? "opacity-100" : "opacity-0")} />
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Header Title
              </label>
              <input value={config.headerTitle} onChange={e => updateConfig({ headerTitle: e.target.value })}
                placeholder="Axon AI"
                className="w-full px-2.5 py-1.5 text-xs border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-convix-500" />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Input Placeholder
              </label>
              <input value={config.inputPlaceholder} onChange={e => updateConfig({ inputPlaceholder: e.target.value })}
                placeholder="Type a message…"
                className="w-full px-2.5 py-1.5 text-xs border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-convix-500" />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Corner Radius: <span className="text-foreground font-semibold">{config.cornerRadius}px</span>
                <span className="font-normal ml-2 text-[10px]">
                  {config.cornerRadius <= 4 ? "Sharp" : config.cornerRadius <= 12 ? "Rounded" : "Pill"}
                </span>
              </label>
              <input type="range" min="0" max="24" step="2" value={config.cornerRadius}
                onChange={e => updateConfig({ cornerRadius: parseInt(e.target.value) })}
                className="w-full accent-convix-600" />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>Sharp</span><span>Rounded</span><span>Pill</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Shadow</label>
              <div className="flex gap-1.5">
                {(["none", "soft", "strong"] as const).map(s => (
                  <button key={s} onClick={() => updateConfig({ shadow: s })}
                    className={cn("flex-1 py-1.5 text-xs font-medium rounded-lg border capitalize transition-colors",
                      config.shadow === s ? "bg-convix-600 text-white border-convix-600" : "border-border text-muted-foreground hover:text-foreground"
                    )}>{s}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Code output */}
          <div className="bg-white rounded-xl border border-border p-4 flex flex-col gap-3">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Embed Code</p>

            <div className="flex bg-muted rounded-lg overflow-hidden">
              {(["html", "react", "vue"] as CodeTab[]).map(t => (
                <button key={t} onClick={() => setCodeTab(t)}
                  className={cn("flex-1 py-1.5 text-xs font-medium transition-colors uppercase",
                    codeTab === t ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}>{t}</button>
              ))}
            </div>

            <pre className="bg-gray-950 rounded-lg p-3 text-[10px] font-mono text-green-400 overflow-x-auto whitespace-pre-wrap leading-relaxed min-h-[160px]">
              {snippets[codeTab]}
            </pre>

            <button onClick={copy}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium bg-convix-600 text-white rounded-lg hover:bg-convix-700 transition-colors">
              {copied ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy code</>}
            </button>

            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
              <p className="text-[10px] text-amber-800 leading-relaxed">
                <strong>Security note:</strong> Your <code className="font-mono">agentId</code> is not a secret — it identifies which agent to load, like a public page ID. <strong>Never put your Axon API keys in frontend code.</strong> Keep API keys server-side only.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
