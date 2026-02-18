"use client";
import { useState } from "react";
import { mockTrainingDocs } from "@/lib/mock/data";
import { Upload, Link as LinkIcon, Plus, Trash2, RefreshCw, FileText, Globe, BookOpen, HelpCircle, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// TODO: REPLACE WITH API — GET/POST /agents/:id/training

const typeIcon: Record<string, any> = { FAQ: HelpCircle, POLICY: FileText, PRODUCT_CATALOG: BookOpen, URL: Globe, MANUAL: FileText };
const typeColor: Record<string, string> = {
  FAQ: "bg-blue-50 text-blue-700", POLICY: "bg-orange-50 text-orange-700",
  PRODUCT_CATALOG: "bg-purple-50 text-purple-700", URL: "bg-green-50 text-green-700", MANUAL: "bg-muted text-muted-foreground"
};

export default function TrainingPage() {
  const [docs, setDocs] = useState(mockTrainingDocs);
  const [url, setUrl] = useState("");
  const [retraining, setRetraining] = useState(false);
  const [retrainStep, setRetrainStep] = useState(0);

  const retrain = () => {
    setRetraining(true);
    setRetrainStep(1);
    const steps = ["Parsing documents...", "Generating embeddings...", "Indexing vectors...", "Validating...", "Done!"];
    steps.forEach((_, i) => {
      setTimeout(() => {
        setRetrainStep(i + 1);
        if (i === steps.length - 1) {
          setTimeout(() => { setRetraining(false); setRetrainStep(0); toast.success("AI retrained successfully!"); }, 600);
        }
      }, i * 800);
    });
  };

  const scrapeUrl = () => {
    if (!url) return;
    toast.success(`Scraping ${url}...`);
    setTimeout(() => {
      setDocs(p => [...p, { id: `doc_${Date.now()}`, title: url, type: "URL", wordCount: Math.floor(Math.random() * 500 + 200), status: "indexed", isActive: true, createdAt: new Date().toISOString().split("T")[0] }]);
      setUrl("");
      toast.success("URL scraped and indexed!");
    }, 1500);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">AI Training</h1>
          <p className="text-sm text-muted-foreground">Give your agent knowledge — upload documents, FAQs, policies, or scrape URLs.</p>
        </div>
        <button onClick={retrain} disabled={retraining}
          className="flex items-center gap-2 px-4 py-2 bg-convix-600 text-white text-sm font-medium rounded-lg hover:bg-convix-700 disabled:opacity-60 transition-colors">
          <RefreshCw className={cn("w-3.5 h-3.5", retraining && "animate-spin")} />
          {retraining ? `Step ${retrainStep}/5...` : "Retrain AI"}
        </button>
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
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://yourcompany.com/docs"
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
          <h3 className="font-semibold text-sm text-foreground">Training Documents ({docs.length})</h3>
          <button className="flex items-center gap-1.5 text-xs text-convix-600 hover:text-convix-700 font-medium">
            <Plus className="w-3.5 h-3.5" /> Add Manual FAQ
          </button>
        </div>
        <div className="divide-y divide-border">
          {docs.map(doc => {
            const Icon = typeIcon[doc.type] || FileText;
            return (
              <div key={doc.id} className="flex items-center gap-4 px-5 py-3">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", typeColor[doc.type])}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{doc.title}</div>
                  <div className="text-xs text-muted-foreground">{doc.wordCount.toLocaleString()} words · {doc.createdAt}</div>
                </div>
                <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", typeColor[doc.type])}>{doc.type}</span>
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
      </div>
    </div>
  );
}
