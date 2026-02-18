"use client";
import { useState, useMemo, useRef, useEffect } from "react";
import { mockAnalyticsData, type AnalyticsDataPoint } from "@/lib/mock/data";
import { cn } from "@/lib/utils";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  MessageSquare, Clock, PhoneCall, Timer, UserCheck, CheckCircle,
  Download, Image as ImageIcon, FileText, Printer, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

// TODO: REPLACE WITH API — GET /analytics?from=&to=

type Range = "day" | "week" | "month" | "custom";

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function triggerDownload(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function toCsv(data: AnalyticsDataPoint[]): string {
  if (!data.length) return "";
  const headers = Object.keys(data[0]).join(",");
  const rows = data.map(d => Object.values(d).join(",")).join("\n");
  return `${headers}\n${rows}`;
}

export default function AnalyticsPage() {
  const [range, setRange] = useState<Range>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [activePrintChart, setActivePrintChart] = useState<string | null>(null);

  const chart1Ref = useRef<HTMLDivElement>(null);
  const chart2Ref = useRef<HTMLDivElement>(null);
  const chart3Ref = useRef<HTMLDivElement>(null);
  const chart4Ref = useRef<HTMLDivElement>(null);

  const chartRefs: Record<string, React.RefObject<HTMLDivElement>> = {
    messages: chart1Ref,
    redirects: chart2Ref,
    latency: chart3Ref,
    calls: chart4Ref,
  };

  useEffect(() => {
    if (activePrintChart) {
      const timer = setTimeout(() => {
        window.print();
        const cleanup = () => setActivePrintChart(null);
        window.addEventListener("afterprint", cleanup, { once: true });
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [activePrintChart]);

  const filtered = useMemo<AnalyticsDataPoint[]>(() => {
    const now = new Date("2026-02-18");
    let from: Date;
    if (range === "day") {
      from = new Date(now); from.setDate(now.getDate() - 1);
    } else if (range === "week") {
      from = new Date(now); from.setDate(now.getDate() - 7);
    } else if (range === "month") {
      from = new Date(now); from.setDate(now.getDate() - 30);
    } else {
      const f = customFrom ? new Date(customFrom) : new Date(now);
      if (!customFrom) f.setDate(now.getDate() - 30);
      const t = customTo ? new Date(customTo) : now;
      return mockAnalyticsData.filter(d => new Date(d.date) >= f && new Date(d.date) <= t);
    }
    return mockAnalyticsData.filter(d => new Date(d.date) >= from && new Date(d.date) <= now);
  }, [range, customFrom, customTo]);

  const totalMessages = filtered.reduce((s, d) => s + d.messages, 0);
  const avgLatency = filtered.length ? Math.round(filtered.reduce((s, d) => s + d.avgLatency, 0) / filtered.length) : 0;
  const totalCalls = filtered.reduce((s, d) => s + d.calls, 0);
  const avgCallDur = filtered.length ? Math.round(filtered.reduce((s, d) => s + d.avgCallDuration, 0) / filtered.length * 10) / 10 : 0;
  const totalRedirects = filtered.reduce((s, d) => s + d.redirects, 0);
  const avgResolution = filtered.length ? Math.round(filtered.reduce((s, d) => s + d.resolutionRate, 0) / filtered.length) : 0;

  const latencyBuckets = [
    { name: "<500ms", value: filtered.filter(d => d.avgLatency < 500).length },
    { name: "500–1s", value: filtered.filter(d => d.avgLatency >= 500 && d.avgLatency < 1000).length },
    { name: "1–2s", value: filtered.filter(d => d.avgLatency >= 1000 && d.avgLatency < 2000).length },
    { name: ">2s", value: filtered.filter(d => d.avgLatency >= 2000).length },
  ];

  const callDurationBuckets = [
    { name: "<1 min", value: filtered.filter(d => d.avgCallDuration < 1).length },
    { name: "1–3 min", value: filtered.filter(d => d.avgCallDuration >= 1 && d.avgCallDuration < 3).length },
    { name: "3–5 min", value: filtered.filter(d => d.avgCallDuration >= 3 && d.avgCallDuration < 5).length },
    { name: ">5 min", value: filtered.filter(d => d.avgCallDuration >= 5).length },
  ];

  const chartData = filtered.map(d => ({ ...d, date: formatDate(d.date) }));

  const stats = [
    { id: "messages", label: "Total Messages", value: totalMessages.toLocaleString(), rawValue: totalMessages.toString(), icon: MessageSquare, color: "text-convix-600", bg: "bg-convix-50" },
    { id: "latency", label: "Avg Latency", value: `${avgLatency} ms`, rawValue: `${avgLatency} ms`, icon: Clock, color: "text-purple-600", bg: "bg-purple-50" },
    { id: "calls", label: "Total Calls", value: totalCalls.toLocaleString(), rawValue: totalCalls.toString(), icon: PhoneCall, color: "text-blue-600", bg: "bg-blue-50" },
    { id: "call_dur", label: "Avg Call Duration", value: `${avgCallDur} min`, rawValue: `${avgCallDur} min`, icon: Timer, color: "text-teal-600", bg: "bg-teal-50" },
    { id: "redirects", label: "Redirects to Human", value: totalRedirects.toLocaleString(), rawValue: totalRedirects.toString(), icon: UserCheck, color: "text-orange-600", bg: "bg-orange-50" },
    { id: "resolution", label: "Avg Resolution Rate", value: `${avgResolution}%`, rawValue: `${avgResolution}%`, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
  ];

  const ranges: { label: string; value: Range }[] = [
    { label: "Day", value: "day" },
    { label: "Week", value: "week" },
    { label: "Month", value: "month" },
    { label: "Custom", value: "custom" },
  ];

  // ── Export helpers ──────────────────────────────────────────────────────────

  const exportJson = () => {
    triggerDownload(JSON.stringify(filtered, null, 2), `analytics-${range}.json`, "application/json");
    setShowExportMenu(false);
  };

  const exportCsv = () => {
    triggerDownload(toCsv(filtered), `analytics-${range}.csv`, "text/csv");
    setShowExportMenu(false);
  };

  const exportXlsx = () => {
    toast.info("XLSX export: run `npm i xlsx` to enable — using CSV for now");
    triggerDownload(toCsv(filtered), `analytics-${range}.csv`, "text/csv");
    setShowExportMenu(false);
  };

  const downloadStat = (label: string, value: string) => {
    const data = { label, value, period: range, exportedAt: new Date().toISOString() };
    triggerDownload(JSON.stringify(data, null, 2), `stat-${label.replace(/\s+/g, "-").toLowerCase()}.json`, "application/json");
  };

  const exportChartPng = (ref: React.RefObject<HTMLDivElement>, filename: string) => {
    const container = ref.current;
    if (!container) return;
    const svg = container.querySelector("svg");
    if (!svg) { toast.error("No chart found"); return; }
    const svgStr = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgStr], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = svg.clientWidth || 800;
      canvas.height = svg.clientHeight || 300;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      const link = document.createElement("a");
      link.download = filename;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = url;
  };

  const exportChartCsv = (data: object[], filename: string) => {
    if (!data.length) return;
    const headers = Object.keys(data[0]).join(",");
    const rows = data.map(d => Object.values(d as Record<string, unknown>).join(",")).join("\n");
    triggerDownload(`${headers}\n${rows}`, filename, "text/csv");
  };

  const ChartToolbar = ({ chartId, chartRef: cRef, csvData, csvFile, pngFile }: {
    chartId: string;
    chartRef: React.RefObject<HTMLDivElement>;
    csvData: object[];
    csvFile: string;
    pngFile: string;
  }) => (
    <div className="flex items-center gap-1">
      <button onClick={() => exportChartPng(cRef, pngFile)}
        title="Download PNG"
        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
        <ImageIcon className="w-3.5 h-3.5" />
      </button>
      <button onClick={() => exportChartCsv(csvData, csvFile)}
        title="Download CSV"
        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
        <FileText className="w-3.5 h-3.5" />
      </button>
      <button onClick={() => setActivePrintChart(chartId)}
        title="Print / PDF"
        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
        <Printer className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in" onClick={() => showExportMenu && setShowExportMenu(false)}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} day{filtered.length !== 1 ? "s" : ""} of data</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Range filter */}
          <div className="flex items-center bg-white border border-border rounded-lg overflow-hidden">
            {ranges.map(r => (
              <button key={r.value} onClick={() => setRange(r.value)}
                className={cn("px-3 py-1.5 text-xs font-medium transition-colors",
                  range === r.value ? "bg-convix-600 text-white" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}>
                {r.label}
              </button>
            ))}
          </div>
          {range === "custom" && (
            <div className="flex items-center gap-2">
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                className="px-2.5 py-1.5 text-xs border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-convix-500 bg-white" />
              <span className="text-xs text-muted-foreground">to</span>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                className="px-2.5 py-1.5 text-xs border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-convix-500 bg-white" />
            </div>
          )}

          {/* Export dropdown */}
          <div className="relative">
            <button onClick={e => { e.stopPropagation(); setShowExportMenu(p => !p); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-border rounded-lg hover:bg-muted transition-colors">
              <Download className="w-3.5 h-3.5" /> Export
              <ChevronDown className={cn("w-3 h-3 transition-transform", showExportMenu && "rotate-180")} />
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-border rounded-xl shadow-lg z-20 overflow-hidden w-44">
                <button onClick={exportJson} className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted transition-colors text-left">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground" /> Export as JSON
                </button>
                <button onClick={exportCsv} className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted transition-colors text-left">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground" /> Export as CSV
                </button>
                <button onClick={exportXlsx} className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted transition-colors text-left">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground" /> Export as XLSX
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-border p-5 relative group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", s.bg)}>
                <s.icon className={cn("w-4 h-4", s.color)} />
              </div>
            </div>
            <div className="text-2xl font-bold text-foreground">{s.value}</div>
            {/* Per-stat download icon */}
            <button onClick={() => downloadStat(s.label, s.rawValue)}
              title="Download stat"
              className="absolute bottom-3 right-3 p-1 rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground hover:bg-muted transition-all">
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div ref={chart1Ref}
          data-printable={activePrintChart === "messages" ? "true" : undefined}
          className="bg-white rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Messages Over Time</h3>
            <ChartToolbar chartId="messages" chartRef={chart1Ref} csvData={chartData} csvFile="messages-over-time.csv" pngFile="messages-over-time.png" />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="msgGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6d28d9" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#6d28d9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={Math.floor(chartData.length / 5)} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }} />
              <Area type="monotone" dataKey="messages" stroke="#6d28d9" strokeWidth={2} fill="url(#msgGrad)" name="Messages" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div ref={chart2Ref}
          data-printable={activePrintChart === "redirects" ? "true" : undefined}
          className="bg-white rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Redirects to Human Over Time</h3>
            <ChartToolbar chartId="redirects" chartRef={chart2Ref} csvData={chartData} csvFile="redirects-over-time.csv" pngFile="redirects-over-time.png" />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={Math.floor(chartData.length / 5)} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }} />
              <Line type="monotone" dataKey="redirects" stroke="#ea580c" strokeWidth={2} dot={false} name="Redirects" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div ref={chart3Ref}
          data-printable={activePrintChart === "latency" ? "true" : undefined}
          className="bg-white rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Latency Distribution</h3>
            <ChartToolbar chartId="latency" chartRef={chart3Ref} csvData={latencyBuckets} csvFile="latency-distribution.csv" pngFile="latency-distribution.png" />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={latencyBuckets} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }} />
              <Bar dataKey="value" fill="#6d28d9" radius={[4, 4, 0, 0]} name="Days" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div ref={chart4Ref}
          data-printable={activePrintChart === "calls" ? "true" : undefined}
          className="bg-white rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Call Duration Breakdown</h3>
            <ChartToolbar chartId="calls" chartRef={chart4Ref} csvData={callDurationBuckets} csvFile="call-duration.csv" pngFile="call-duration.png" />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={callDurationBuckets} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }} />
              <Bar dataKey="value" fill="#0d9488" radius={[4, 4, 0, 0]} name="Days" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
