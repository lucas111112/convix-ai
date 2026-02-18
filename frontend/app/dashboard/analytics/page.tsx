"use client";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, PieChart, Pie } from "recharts";
import { mockAnalyticsOverview, mockVolumeData, mockChannelData, mockTopQuestions } from "@/lib/mock/data";
import { formatCurrency, formatNumber, cn } from "@/lib/utils";
import { Download } from "lucide-react";

// TODO: REPLACE WITH API — GET /stores/:id/analytics/*

const handoffTrend = [
  { date: "Feb 11", rate: 8.1 }, { date: "Feb 12", rate: 7.4 }, { date: "Feb 13", rate: 7.9 },
  { date: "Feb 14", rate: 6.9 }, { date: "Feb 15", rate: 7.2 }, { date: "Feb 16", rate: 6.4 }, { date: "Feb 17", rate: 6.8 },
];

const handoffTriggers = [
  { trigger: "Low Confidence", count: 89 }, { trigger: "Anger Detected", count: 42 },
  { trigger: "Explicit Request", count: 38 }, { trigger: "Unresolved (3x)", count: 24 }, { trigger: "High Value Cart", count: 11 },
];

export default function AnalyticsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground">Last 7 days overview</p>
        </div>
        <div className="flex items-center gap-2">
          {["7d", "30d", "90d"].map(r => (
            <button key={r} className={cn("px-3 py-1.5 text-xs font-medium rounded-lg transition-colors", r === "7d" ? "bg-convix-600 text-white" : "bg-white border border-border text-muted-foreground hover:text-foreground")}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { label: "Conversations", value: formatNumber(mockAnalyticsOverview.totalConversations), sub: `+${mockAnalyticsOverview.conversationsChange}%` },
          { label: "Revenue", value: formatCurrency(mockAnalyticsOverview.revenueAttributed), sub: `+${mockAnalyticsOverview.revenueChange}%` },
          { label: "Handoff Rate", value: `${mockAnalyticsOverview.handoffRate}%`, sub: `${mockAnalyticsOverview.handoffChange}%` },
          { label: "Resolution Rate", value: `${mockAnalyticsOverview.resolutionRate}%`, sub: `+${mockAnalyticsOverview.resolutionChange}%` },
          { label: "Avg Response", value: `${mockAnalyticsOverview.avgResponseTime}s`, sub: `${mockAnalyticsOverview.responseTimeChange}s` },
          { label: "Active Now", value: `${mockAnalyticsOverview.activeNow}`, sub: "live" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-border p-4">
            <div className="text-xs text-muted-foreground mb-1">{s.label}</div>
            <div className="text-xl font-bold text-foreground">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-border p-5">
          <h3 className="font-semibold text-sm text-foreground mb-4">Conversation Volume</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={mockVolumeData}>
              <defs>
                <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} /><stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Area type="monotone" dataKey="conversations" stroke="#6366f1" fill="url(#ag)" strokeWidth={2} name="Conversations" />
              <Area type="monotone" dataKey="resolved" stroke="#22c55e" fill="none" strokeWidth={2} strokeDasharray="4 2" name="Resolved" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-border p-5">
          <h3 className="font-semibold text-sm text-foreground mb-4">Handoff Rate Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={handoffTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} unit="%" />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Line type="monotone" dataKey="rate" stroke="#f97316" strokeWidth={2} dot={{ fill: "#f97316", r: 3 }} name="Handoff Rate %" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-border p-5">
          <h3 className="font-semibold text-sm text-foreground mb-4">Revenue by Channel</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={mockChannelData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="channel" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                {mockChannelData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-border p-5">
          <h3 className="font-semibold text-sm text-foreground mb-4">Handoff Triggers</h3>
          <div className="space-y-3">
            {handoffTriggers.map(t => (
              <div key={t.trigger}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-foreground">{t.trigger}</span>
                  <span className="text-muted-foreground">{t.count}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-convix-500 rounded-full" style={{ width: `${(t.count / 89) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Questions */}
      <div className="bg-white rounded-xl border border-border">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-sm text-foreground">Top Questions This Week</h3>
          <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
        <div className="divide-y divide-border">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr] px-5 py-2 text-xs font-medium text-muted-foreground bg-muted/20">
            <span>Question</span><span>Count</span><span>Category</span><span>Handoff Rate</span>
          </div>
          {mockTopQuestions.map(q => (
            <div key={q.question} className="grid grid-cols-[2fr_1fr_1fr_1fr] px-5 py-3 text-sm items-center">
              <span className="text-foreground">{q.question}</span>
              <span className="font-semibold text-foreground">{q.count}</span>
              <span className="text-xs bg-muted px-2 py-0.5 rounded-full w-fit">{q.category}</span>
              <span className={cn("text-xs font-medium", q.handoffRate > 10 ? "text-red-500" : q.handoffRate > 5 ? "text-orange-500" : "text-green-600")}>
                {q.handoffRate}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
