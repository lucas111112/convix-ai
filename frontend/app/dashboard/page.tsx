"use client";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { ArrowUp, ArrowDown, MessageSquare, DollarSign, AlertTriangle, Zap, TrendingUp, Activity } from "lucide-react";
import { mockAnalyticsOverview, mockVolumeData, mockChannelData, mockConversations } from "@/lib/mock/data";
import { formatCurrency, formatNumber, formatRelativeTime, cn } from "@/lib/utils";
import Link from "next/link";

function StatCard({ label, value, change, icon: Icon, prefix = "" }: {
  label: string; value: string | number; change: number; icon: any; prefix?: string;
}) {
  const up = change > 0;
  return (
    <div className="bg-white rounded-xl border border-border p-5">
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className="w-8 h-8 rounded-lg bg-convix-50 flex items-center justify-center">
          <Icon className="w-4 h-4 text-convix-600" />
        </div>
      </div>
      <div className="text-2xl font-bold text-foreground mb-1">{prefix}{typeof value === "number" ? formatNumber(value) : value}</div>
      <div className={cn("flex items-center gap-1 text-xs font-medium", up ? "text-green-600" : "text-red-500")}>
        {up ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
        {Math.abs(change)}% vs last week
      </div>
    </div>
  );
}

const statusColors: Record<string, string> = {
  active: "bg-blue-50 text-blue-700",
  resolved: "bg-green-50 text-green-700",
  handed_off: "bg-orange-50 text-orange-700",
  abandoned: "bg-muted text-muted-foreground",
};

const channelColors: Record<string, string> = {
  web: "💬", whatsapp: "💚", instagram: "📸", sms: "📱", messenger: "💙", email: "📧",
};

export default function DashboardPage() {
  const overview = mockAnalyticsOverview;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-foreground">Overview</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Last 7 days · Updated just now</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Conversations" value={overview.totalConversations} change={overview.conversationsChange} icon={MessageSquare} />
        <StatCard label="Revenue Attributed" value={formatCurrency(overview.revenueAttributed)} change={overview.revenueChange} icon={DollarSign} />
        <StatCard label="Handoff Rate" value={`${overview.handoffRate}%`} change={overview.handoffChange} icon={AlertTriangle} />
        <StatCard label="Avg Response Time" value={`${overview.avgResponseTime}s`} change={overview.responseTimeChange} icon={Zap} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Volume chart */}
        <div className="col-span-2 bg-white rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-foreground text-sm">Conversation Volume</h3>
              <p className="text-xs text-muted-foreground">Conversations vs resolved</p>
            </div>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={mockVolumeData}>
              <defs>
                <linearGradient id="convGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
              <Area type="monotone" dataKey="conversations" stroke="#6366f1" fill="url(#convGrad)" strokeWidth={2} name="Total" />
              <Area type="monotone" dataKey="resolved" stroke="#22c55e" fill="none" strokeWidth={2} strokeDasharray="4 2" name="Resolved" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Channel breakdown */}
        <div className="bg-white rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground text-sm">By Channel</h3>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={mockChannelData} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="channel" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} width={60} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
              <Bar dataKey="conversations" radius={[0, 4, 4, 0]}>
                {mockChannelData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent conversations */}
      <div className="bg-white rounded-xl border border-border">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground text-sm">Recent Conversations</h3>
          <Link href="/dashboard/conversations" className="text-xs text-convix-600 hover:text-convix-700 font-medium">View all →</Link>
        </div>
        <div className="divide-y divide-border">
          {mockConversations.slice(0, 5).map(conv => (
            <Link key={conv.id} href={`/dashboard/conversations/${conv.id}`}
              className="flex items-center gap-4 px-5 py-3 hover:bg-muted/30 transition-colors">
              <div className="w-8 h-8 rounded-full bg-convix-100 flex items-center justify-center text-sm shrink-0">
                {conv.customerName[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{conv.customerName}</span>
                  <span className="text-xs text-muted-foreground">{channelColors[conv.channel]}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate max-w-sm">{conv.lastMessage}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", statusColors[conv.status])}>
                  {conv.status.replace("_", " ")}
                </span>
                <span className="text-xs text-muted-foreground">{formatRelativeTime(conv.updatedAt)}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
