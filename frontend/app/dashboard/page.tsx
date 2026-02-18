"use client";
import Link from "next/link";
import { MessageSquare, ArrowUpRight, Users, Clock, UserCheck } from "lucide-react";
import { mockConversations, mockAgents } from "@/lib/mock/data";
import { formatRelativeTime, cn } from "@/lib/utils";

// TODO: REPLACE WITH API — GET /dashboard/overview

const statusColors: Record<string, string> = {
  active: "bg-blue-50 text-blue-700 border-blue-100",
  resolved: "bg-green-50 text-green-700 border-green-100",
  handed_off: "bg-orange-50 text-orange-700 border-orange-100",
  abandoned: "bg-muted text-muted-foreground border-border",
};

const channelEmoji: Record<string, string> = {
  web: "💬", whatsapp: "💚", instagram: "📸", sms: "📱",
  messenger: "💙", email: "📧", voice: "📞", slack: "🟨",
};

export default function DashboardPage() {
  const total = mockConversations.length;
  const active = mockConversations.filter(c => c.status === "active").length;
  const redirects = mockConversations.filter(c => c.status === "handed_off").length;
  const avgLatency = 642;
  const recent = [...mockConversations].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5);

  const stats = [
    { label: "Total Conversations", value: total.toLocaleString(), icon: MessageSquare, color: "text-convix-600", bg: "bg-convix-50", change: "+12% this week" },
    { label: "Redirects to Human", value: redirects.toString(), icon: UserCheck, color: "text-orange-600", bg: "bg-orange-50", change: `${((redirects / total) * 100).toFixed(0)}% of total` },
    { label: "Avg Latency", value: `${avgLatency} ms`, icon: Clock, color: "text-purple-600", bg: "bg-purple-50", change: "−43 ms vs last week" },
    { label: "Active Now", value: active.toString(), icon: Users, color: "text-green-600", bg: "bg-green-50", change: `${mockAgents.filter(a => a.status === "active").length} agents running` },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Overview</h1>
          <p className="text-sm text-muted-foreground">Your workspace at a glance</p>
        </div>
        <Link href="/dashboard/analytics" className="flex items-center gap-1.5 text-xs font-medium text-convix-600 hover:text-convix-700 transition-colors">
          View analytics <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", s.bg)}>
                <s.icon className={cn("w-4 h-4", s.color)} />
              </div>
            </div>
            <div className="text-2xl font-bold text-foreground mb-1">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.change}</div>
          </div>
        ))}
      </div>

      {/* Recent Conversations */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <span className="text-sm font-semibold text-foreground">Recent Conversations</span>
          <Link href="/dashboard/conversations" className="text-xs text-convix-600 hover:underline font-medium">View all</Link>
        </div>
        <div className="divide-y divide-border">
          {recent.map(conv => (
            <Link key={conv.id} href={`/dashboard/conversations/${conv.id}`}
              className="flex items-center gap-4 px-5 py-3 hover:bg-muted/20 transition-colors">
              <div className="w-8 h-8 rounded-full bg-convix-100 flex items-center justify-center text-xs font-semibold text-convix-700 shrink-0">
                {conv.customerName[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{conv.customerName}</span>
                  <span className="text-base">{channelEmoji[conv.channel] ?? "💬"}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium border", statusColors[conv.status])}>
                  {conv.status.replace("_", " ")}
                </span>
                <span className="text-[10px] text-muted-foreground">{formatRelativeTime(conv.updatedAt)}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Agents at a glance */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <span className="text-sm font-semibold text-foreground">Agents</span>
          <Link href="/dashboard/agents" className="text-xs text-convix-600 hover:underline font-medium">Manage</Link>
        </div>
        <div className="divide-y divide-border">
          {mockAgents.map(agent => (
            <div key={agent.id} className="flex items-center gap-3 px-5 py-3">
              <div className={cn("w-2 h-2 rounded-full shrink-0", agent.status === "active" ? "bg-green-500 animate-pulse" : "bg-muted-foreground/40")} />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-foreground">{agent.name}</span>
                <span className="text-xs text-muted-foreground ml-2">{agent.channels.length} channel{agent.channels.length !== 1 ? "s" : ""}</span>
              </div>
              <span className={cn("text-xs", agent.status === "active" ? "text-green-600" : "text-muted-foreground")}>
                {agent.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
