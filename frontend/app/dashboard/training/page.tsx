"use client";
import { useState } from "react";
import { mockTrainingDocs, mockAgents } from "@/lib/mock/data";
import { Upload, Globe, Plus, Trash2, RefreshCw, FileText, HelpCircle, Check, ChevronDown, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// TODO: REPLACE WITH API — GET/POST /agents/:id/training

type DocEntry = typeof mockTrainingDocs[number];

const typeIcon: Record<string, React.ElementType> = { FAQ: HelpCircle, POLICY: FileText, URL: Globe, MANUAL: FileText };
const typeColor: Record<string, string> = {
  FAQ: "bg-blue-50 text-blue-700", POLICY: "bg-orange-50 text-orange-700",
  URL: "bg-green-50 text-green-700", MANUAL: "bg-muted text-muted-foreground",
};

// Per-agent doc lists — first agent gets the mock data, others start empty
const initialAgentDocs = Object.fromEntries(
  mockAgents.map((a, i) => [a.id, i === 0 ? [...mockTrainingDocs] : []])
) as Record<string, DocEntry[]>;

export default function TrainingPage() {
  const [selectedAgentId, setSelectedAgentId] = useState(mockAgents[0]?.id ?? "");
  const [agentDocs, setAgentDocs] = useState<Record<string, DocEntry[]>>(initialAgentDocs);
  const [url, setUrl] = useState("");
  const [retraining, setRetraining] = useState(false);
  const [retrainStep, setRetrainStep] = useState(0);
  const [showAgentPicker, setShowAgentPicker] = useState(false);

  const selectedAgent = mockAgents.find(a => a.id === selectedAgentId);
  const docs = agentDocs[selectedAgentId] ?? [];

  const setDocs = (updater: (prev: DocEntry[]) => DocEntry[]) => {
    setAgentDocs(prev => ({ ...prev, [selectedAgentId]: updater(prev[selectedAgentId] ?? []) }));
  };

  const retrain = () => {
    setRetraining(true);
    setRetrainStep(1);
    const steps = ["Parsing documents...", "Generating embeddings...", "Indexing vectors...", "Validating...", "Done!"];
    steps.forEach((_, i) => {
      setTimeout(() => {
        setRetrainStep(i + 1);
        if (i === steps.length - 1) {
          setTimeout(() => { setRetraining(false); setRetrainStep(0); toast.success(`${selectedAgent?.name} retrained!`); }, 600);
        }
      }, i * 800);
    });
  };

  const scrapeUrl = () => {
    if (!url.trim()) return;
    toast.success(`Scraping ${url}...`);
    setTimeout(() => {
      setDocs(p => [...p, {
        id: `doc_${Date.now()}`, title: url, type: "URL",
        wordCount: Math.floor(Math.random() * 500 + 200),
        status: "indexed", isActive: true,
        createdAt: new Date().toISOString().split("T")[0],
      }]);
      setUrl("");
      toast.success("URL scraped and indexed!");
    }, 1500);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">AI Training</h1>
          <p className="text-sm text-muted-foreground">Upload docs, FAQs, or scrape URLs to give your agent knowledge.</p>
        </div>
        <button onClick={retrain} disabled={retraining}
          className="flex items-center gap-2 px-4 py-2 bg-convix-600 text-white text-sm font-medium rounded-lg hover:bg-convix-700 disabled:opacity-60 transition-colors">
          <RefreshCw className={cn("w-3.5 h-3.5", retraining && "animate-spin")} />
          {retraining ? `Step ${retrainStep}/5...` : "Retrain AI"}
        </button>
      </div>

      {/* Agent selector */}
      <div className="relative">
        <button
          onClick={() => setShowAgentPicker(p => !p)}
          className="flex items-center gap-3 px-4 py-3 bg-white border border-border rounded-xl hover:border-convix-300 transition-colors w-full sm:w-auto min-w-[260px]">
          <div className={cn("w-2 h-2 rounded-full", selectedAgent?.status === "active" ? "bg-green-500" : "bg-muted-foreground/40")} />
          <Bot className="w-4 h-4 text-muted-foreground" />
          <div className="text-left flex-1">
            <div className="text-sm font-medium text-foreground">{selectedAgent?.name ?? "Select agent"}</div>
            <div className="text-xs text-muted-foreground">{docs.length} training doc{docs.length !== 1 ? "s" : ""}</div>
          </div>
          <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", showAgentPicker && "rotate-180")} />
        </button>

        {showAgentPicker && (
          <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-border rounded-xl shadow-lg z-10 overflow-hidden">
            {mockAgents.map(agent => (
              <button key={agent.id} onClick={() => { setSelectedAgentId(agent.id); setShowAgentPicker(false); }}
                className={cn("flex items-center gap-3 w-full px-4 py-2.5 text-left text-sm hover:bg-muted/50 transition-colors",
                  agent.id === selectedAgentId && "bg-convix-50 text-convix-700"
                )}>
                <div className={cn("w-2 h-2 rounded-full shrink-0", agent.status === "active" ? "bg-green-500" : "bg-muted-foreground/30")} />
                <span className="font-medium">{agent.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">{(agentDocs[agent.id] ?? []).length} docs</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Upload */}
        <div className="bg-white rounded-xl border border-dashed border-border p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-convix-400 hover:bg-convix-50/30 transition-colors"
          onClick={() => toast.info("File upload coming in Phase 3")}>
          <Upload className="w-8 h-8 text-muted-foreground mb-3" />
          <div className="font-medium text-foreground text-sm mb-1">Upload Documents</div>
          <p className="text-xs text-muted-foreground">PDF, DOCX, TXT, CSV — drag & drop or click</p>
        </div>

        {/* URL scraper */}
        <div className="bg-white rounded-xl border border-border p-6">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium text-foreground text-sm">Scrape a URL</span>
          </div>
          <div className="flex gap-2">
            <input value={url} onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === "Enter" && scrapeUrl()}
              placeholder="https://yourcompany.com/docs"
              className="flex-1 px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-convix-500" />
            <button onClick={scrapeUrl} className="px-4 py-2 bg-convix-600 text-white text-sm font-medium rounded-lg hover:bg-convix-700 transition-colors">
              Scrape
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">We'll extract and index the text content automatically.</p>
        </div>
      </div>

      {/* Doc list */}
      <div className="bg-white rounded-xl border border-border">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-sm text-foreground">
            Training Documents for <span className="text-convix-600">{selectedAgent?.name}</span>
            <span className="ml-2 text-muted-foreground font-normal">({docs.length})</span>
          </h3>
          <button className="flex items-center gap-1.5 text-xs text-convix-600 hover:text-convix-700 font-medium"
            onClick={() => toast.info("Manual FAQ editor coming in Phase 3")}>
            <Plus className="w-3.5 h-3.5" /> Add Manual FAQ
          </button>
        </div>

        {docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
            <FileText className="w-8 h-8 opacity-30" />
            <p className="text-sm">No training documents for {selectedAgent?.name} yet.</p>
            <p className="text-xs">Upload a document or scrape a URL above to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {docs.map(doc => {
              const Icon = typeIcon[doc.type] ?? FileText;
              return (
                <div key={doc.id} className="flex items-center gap-4 px-5 py-3">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", typeColor[doc.type] ?? "bg-muted text-muted-foreground")}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{doc.title}</div>
                    <div className="text-xs text-muted-foreground">{doc.wordCount.toLocaleString()} words · {doc.createdAt}</div>
                  </div>
                  <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", typeColor[doc.type] ?? "bg-muted text-muted-foreground")}>{doc.type}</span>
                  <span className={cn("flex items-center gap-1 text-xs", doc.status === "indexed" ? "text-green-600" : "text-orange-500")}>
                    {doc.status === "indexed" ? <Check className="w-3 h-3" /> : <RefreshCw className="w-3 h-3 animate-spin" />}
                    {doc.status}
                  </span>
                  <button onClick={() => { setDocs(p => p.filter(d => d.id !== doc.id)); toast.success("Document removed"); }}
                    className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
