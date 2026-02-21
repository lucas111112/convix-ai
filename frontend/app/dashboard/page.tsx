"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquare, Clock, UserCheck, Users, Bot, BarChart3, AppWindow, CheckCircle, XCircle, Zap, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { authenticatedFetch } from "@/lib/auth";

interface OverviewData {
  total: number;
  redirects: number;
  avgLatency: number;
  activeNow: number;
  creditsUsed: number;
  creditsLimit: number;
  hasActiveAgents: boolean;
  apiStatus: "ok" | "error";
}

export default function DashboardPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [analyticsRes, creditsRes, agentsRes] = await Promise.all([
          authenticatedFetch<{ analytics: { totals: { messages: number; handoffs: number; avgLatencyMs: number } } }>("/v1/analytics"),
          authenticatedFetch<{ credits: { balance: number; monthlyGrant: number; consumed: { total: number } } }>("/v1/analytics/credits"),
          authenticatedFetch<{ agents: Array<{ status: string }> }>("/v1/agents"),
        ]);
        if (cancelled) return;
        const totals = analyticsRes.analytics?.totals ?? { messages: 0, handoffs: 0, avgLatencyMs: 0 };
        const credits = creditsRes.credits;
        const agents = agentsRes.agents ?? [];
        const activeNow = agents.filter(a => a.status === "ACTIVE").length;
        setData({
          total: totals.messages,
          redirects: totals.handoffs,
          avgLatency: Math.round(totals.avgLatencyMs),
          activeNow,
          creditsUsed: credits?.consumed?.total ?? 0,
          creditsLimit: credits?.monthlyGrant ?? 10000,
          hasActiveAgents: activeNow > 0,
          apiStatus: "ok",
        });
      } catch {
        if (!cancelled) {
          setData({ total: 0, redirects: 0, avgLatency: 0, activeNow: 0, creditsUsed: 0, creditsLimit: 10000, hasActiveAgents: false, apiStatus: "error" });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const stats = data ? [
    { label: "Messages Handled", value: data.total.toLocaleString(), icon: MessageSquare, color: "text-convix-600", bg: "bg-convix-50", change: "Last 30 days" },
    { label: "Redirects to Human", value: data.redirects.toString(), icon: UserCheck, color: "text-orange-600", bg: "bg-orange-50", change: data.total > 0 ? `${((data.redirects / data.total) * 100).toFixed(0)}% of total` : "0% of total" },
    { label: "Avg Latency", value: data.avgLatency > 0 ? `${data.avgLatency} ms` : "—", icon: Clock, color: "text-purple-600", bg: "bg-purple-50", change: "Per AI response" },
    { label: "Active Now", value: data.activeNow.toString(), icon: Users, color: "text-green-600", bg: "bg-green-50", change: `${data.activeNow} agent${data.activeNow !== 1 ? "s" : ""} running` },
    { label: "Credits Used", value: data.creditsUsed.toLocaleString(), icon: Zap, color: "text-amber-600", bg: "bg-amber-50", change: `${data.creditsUsed.toLocaleString()} / ${data.creditsLimit.toLocaleString()} this month` },
  ] : [];

  const quickActions = [
    { label: "Create Agent", desc: "Build a new AI agent", icon: Bot, href: "/dashboard/agents", color: "text-convix-600", bg: "bg-convix-50" },
    { label: "Add Knowledge", desc: "Train your agent", icon: MessageSquare, href: "/dashboard/agents", color: "text-blue-600", bg: "bg-blue-50" },
    { label: "View Analytics", desc: "Usage & performance", icon: BarChart3, href: "/dashboard/analytics", color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Widget Builder", desc: "Get embed code", icon: AppWindow, href: "/dashboard/widget", color: "text-teal-600", bg: "bg-teal-50" },
  ];

  const apiOk = data?.apiStatus === "ok";
  const systemStatus = [
    { label: "API", status: apiOk ? "Operational" : "Degraded", ok: apiOk },
    { label: "Webhooks", status: "Operational", ok: true },
    { label: "Voice", status: "Operational", ok: true },
  ];
  const allOk = systemStatus.every(s => s.ok);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Overview</h1>
          <p className="text-sm text-muted-foreground">Your workspace at a glance</p>
        </div>
        <Link href="/dashboard/analytics" className="flex items-center gap-1.5 text-xs font-medium text-convix-600 hover:text-convix-700 transition-colors">
          Full analytics →
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-border p-5 flex items-center justify-center h-24">
              <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
            </div>
          ))
        ) : stats.map(s => (
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

      {/* Empty state if no active agents */}
      {!loading && !data?.hasActiveAgents && (
        <div className="bg-white rounded-xl border border-dashed border-border p-10 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-xl bg-convix-50 flex items-center justify-center">
            <Bot className="w-6 h-6 text-convix-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">No active agents yet</p>
            <p className="text-xs text-muted-foreground mt-0.5">Create your first agent to start handling conversations.</p>
          </div>
          <Link href="/dashboard/agents"
            className="px-4 py-2 bg-convix-600 text-white text-sm font-medium rounded-lg hover:bg-convix-700 transition-colors">
            Create your first agent
          </Link>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Quick Actions</h2>
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {quickActions.map(a => (
            <Link key={a.label} href={a.href}
              className="flex items-center gap-3 bg-white rounded-xl border border-border p-4 hover:border-convix-200 hover:shadow-sm transition-all group">
              <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", a.bg)}>
                <a.icon className={cn("w-5 h-5", a.color)} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground group-hover:text-convix-700 transition-colors">{a.label}</div>
                <div className="text-xs text-muted-foreground">{a.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">System Status</h2>
          {loading ? (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking…
            </span>
          ) : allOk ? (
            <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
              <CheckCircle className="w-3.5 h-3.5" /> All systems operational
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-amber-600 font-medium">
              <XCircle className="w-3.5 h-3.5" /> Some systems degraded
            </span>
          )}
        </div>
        <div className="space-y-2">
          {systemStatus.map(s => (
            <div key={s.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div className="flex items-center gap-2.5">
                <div className={cn("w-2 h-2 rounded-full", s.ok ? "bg-green-500" : "bg-amber-500")} />
                <span className="text-sm text-foreground font-medium">{s.label}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className={s.ok ? "" : "text-amber-600"}>{s.status}</span>
                <div className="flex items-center gap-1">
                  <Zap className={cn("w-3 h-3", s.ok ? "text-green-500" : "text-amber-500")} />
                  <span>Last 30 days</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
