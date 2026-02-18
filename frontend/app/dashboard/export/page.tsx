"use client";
import { useState } from "react";
import { Download, FileJson, FileSpreadsheet, Check, Clock } from "lucide-react";
import { mockConversations, mockAgents, mockAnalyticsData } from "@/lib/mock/data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// TODO: REPLACE WITH API — POST /exports

type ExportFormat = "json" | "csv" | "xlsx";

interface ExportOption {
  id: string;
  label: string;
  description: string;
  count: number;
}

const exportOptions: ExportOption[] = [
  { id: "conversations", label: "Conversations", description: "All conversation threads and messages", count: mockConversations.length },
  { id: "analytics", label: "Analytics Data", description: "Daily analytics for the past 90 days", count: mockAnalyticsData.length },
  { id: "agents", label: "Agent Configurations", description: "Agent names, prompts, and settings", count: mockAgents.length },
  { id: "custom_fields", label: "Custom Fields", description: "Custom field definitions and configs", count: 0 },
];

const formats: { id: ExportFormat; label: string; icon: React.ElementType; ext: string }[] = [
  { id: "json", label: "JSON", icon: FileJson, ext: "json" },
  { id: "csv", label: "CSV", icon: FileSpreadsheet, ext: "csv" },
  { id: "xlsx", label: "XLSX", icon: FileSpreadsheet, ext: "xlsx" },
];

const scheduleOptions = ["Daily at midnight", "Weekly on Monday", "Monthly on the 1st"];

export default function ExportPage() {
  const [selected, setSelected] = useState<Set<string>>(new Set(["conversations"]));
  const [format, setFormat] = useState<ExportFormat>("json");
  const [exporting, setExporting] = useState(false);
  const [scheduledEnabled, setScheduledEnabled] = useState(false);
  const [scheduleFrequency, setScheduleFrequency] = useState(scheduleOptions[0]);
  const [scheduleEmail, setScheduleEmail] = useState("");

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleExport = async () => {
    if (selected.size === 0) { toast.error("Select at least one data type to export"); return; }
    setExporting(true);
    await new Promise(r => setTimeout(r, 1200));

    const payload: Record<string, unknown> = {};
    if (selected.has("conversations")) payload.conversations = mockConversations;
    if (selected.has("analytics")) payload.analytics = mockAnalyticsData;
    if (selected.has("agents")) payload.agents = mockAgents.map(a => ({ id: a.id, name: a.name, systemPrompt: a.systemPrompt, channels: a.channels }));
    if (selected.has("custom_fields")) payload.custom_fields = [];

    const content = format === "json"
      ? JSON.stringify(payload, null, 2)
      : Object.keys(payload).map(k => `# ${k}\n${JSON.stringify(payload[k])}`).join("\n\n");

    const mime = format === "json" ? "application/json" : "text/plain";
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `axon-export-${new Date().toISOString().split("T")[0]}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setExporting(false);
    toast.success("Export downloaded!");
  };

  const totalRecords = exportOptions.filter(o => selected.has(o.id)).reduce((s, o) => s + o.count, 0);

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-foreground">Export Data</h1>
        <p className="text-sm text-muted-foreground">Download your workspace data in various formats.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Export Data */}
        <div className="bg-white rounded-xl border border-border p-5 space-y-4">
          <h3 className="font-semibold text-sm text-foreground">Select Data</h3>
          <div className="space-y-2">
            {exportOptions.map(opt => (
              <label key={opt.id} className={cn("flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                selected.has(opt.id) ? "border-convix-200 bg-convix-50" : "border-border hover:border-convix-200 hover:bg-muted/30"
              )}>
                <div className={cn("w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                  selected.has(opt.id) ? "bg-convix-600 border-convix-600" : "border-border"
                )}>
                  {selected.has(opt.id) && <Check className="w-3 h-3 text-white" />}
                </div>
                <input type="checkbox" checked={selected.has(opt.id)} onChange={() => toggle(opt.id)} className="sr-only" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{opt.label}</span>
                    <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-mono">{opt.count}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                </div>
              </label>
            ))}
          </div>

          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-2">Format</h4>
            <div className="flex gap-2">
              {formats.map(f => (
                <button key={f.id} onClick={() => setFormat(f.id)}
                  className={cn("flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border flex-1 justify-center transition-colors",
                    format === f.id ? "bg-convix-600 text-white border-convix-600" : "border-border text-muted-foreground hover:text-foreground"
                  )}>
                  <f.icon className="w-3.5 h-3.5" />
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground">{totalRecords.toLocaleString()} records selected</span>
            </div>
            <button onClick={handleExport} disabled={exporting || selected.size === 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-convix-600 text-white text-sm font-medium rounded-lg hover:bg-convix-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {exporting ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Exporting...</>
              ) : (
                <><Download className="w-4 h-4" /> Export {format.toUpperCase()}</>
              )}
            </button>
          </div>
        </div>

        {/* Scheduled Exports */}
        <div className="bg-white rounded-xl border border-border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-foreground">Scheduled Exports</h3>
            <button onClick={() => setScheduledEnabled(!scheduledEnabled)}
              className={cn("relative rounded-full transition-colors", scheduledEnabled ? "bg-convix-600" : "bg-muted border border-border")}
              style={{ height: "22px", width: "40px" }}>
              <div className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                scheduledEnabled ? "translate-x-5" : "translate-x-0.5"
              )} />
            </button>
          </div>

          {!scheduledEnabled ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-3">
              <Clock className="w-8 h-8 opacity-30" />
              <p className="text-sm text-center">Enable scheduled exports to automatically receive data exports by email.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Frequency</label>
                <select value={scheduleFrequency} onChange={e => setScheduleFrequency(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-convix-500 bg-white">
                  {scheduleOptions.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Delivery Email</label>
                <input value={scheduleEmail} onChange={e => setScheduleEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-convix-500" />
              </div>
              <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2.5">
                Next export: {scheduleFrequency.toLowerCase()}. Includes all currently selected data types in {format.toUpperCase()} format.
              </div>
              <button onClick={() => toast.success("Schedule saved!")}
                className="w-full py-2 px-4 text-sm font-medium bg-convix-600 text-white rounded-lg hover:bg-convix-700 transition-colors">
                Save Schedule
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
