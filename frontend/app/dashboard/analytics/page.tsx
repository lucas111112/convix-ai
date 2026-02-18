"use client";
import { useState, useMemo } from "react";
import { mockAnalyticsData, type AnalyticsDataPoint } from "@/lib/mock/data";
import { cn } from "@/lib/utils";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { MessageSquare, Clock, PhoneCall, Timer, UserCheck, CheckCircle } from "lucide-react";

// TODO: REPLACE WITH API — GET /analytics?from=&to=

type Range = "day" | "week" | "month" | "custom";

function formatDate(d: string) {
  const date = new Date(d);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function AnalyticsPage() {
  const [range, setRange] = useState<Range>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

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
      const f = customFrom ? new Date(customFrom) : new Date(now); f.setDate(now.getDate() - 30);
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

  // Latency distribution buckets
  const latencyBuckets = [
    { name: "<500ms", value: filtered.filter(d => d.avgLatency < 500).length },
    { name: "500–1s", value: filtered.filter(d => d.avgLatency >= 500 && d.avgLatency < 1000).length },
    { name: "1–2s", value: filtered.filter(d => d.avgLatency >= 1000 && d.avgLatency < 2000).length },
    { name: ">2s", value: filtered.filter(d => d.avgLatency >= 2000).length },
  ];

  // Call duration buckets
  const callDurationBuckets = [
    { name: "<1 min", value: filtered.filter(d => d.avgCallDuration < 1).length },
    { name: "1–3 min", value: filtered.filter(d => d.avgCallDuration >= 1 && d.avgCallDuration < 3).length },
    { name: "3–5 min", value: filtered.filter(d => d.avgCallDuration >= 3 && d.avgCallDuration < 5).length },
    { name: ">5 min", value: filtered.filter(d => d.avgCallDuration >= 5).length },
  ];

  const chartData = filtered.map(d => ({ ...d, date: formatDate(d.date) }));

  const stats = [
    { label: "Total Messages", value: totalMessages.toLocaleString(), icon: MessageSquare, color: "text-convix-600", bg: "bg-convix-50" },
    { label: "Avg Latency", value: `${avgLatency} ms`, icon: Clock, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Total Calls", value: totalCalls.toLocaleString(), icon: PhoneCall, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Avg Call Duration", value: `${avgCallDur} min`, icon: Timer, color: "text-teal-600", bg: "bg-teal-50" },
    { label: "Redirects to Human", value: totalRedirects.toLocaleString(), icon: UserCheck, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Avg Resolution Rate", value: `${avgResolution}%`, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
  ];

  const ranges: { label: string; value: Range }[] = [
    { label: "Day", value: "day" },
    { label: "Week", value: "week" },
    { label: "Month", value: "month" },
    { label: "Custom", value: "custom" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} day{filtered.length !== 1 ? "s" : ""} of data</p>
        </div>

        {/* Range filter */}
        <div className="flex items-center gap-2 flex-wrap">
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
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", s.bg)}>
                <s.icon className={cn("w-4 h-4", s.color)} />
              </div>
            </div>
            <div className="text-2xl font-bold text-foreground">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Messages over time */}
        <div className="bg-white rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Messages Over Time</h3>
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

        {/* Redirects over time */}
        <div className="bg-white rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Redirects to Human Over Time</h3>
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
        {/* Latency distribution */}
        <div className="bg-white rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Latency Distribution (days in bucket)</h3>
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

        {/* Call duration breakdown */}
        <div className="bg-white rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Call Duration Breakdown (days in bucket)</h3>
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
