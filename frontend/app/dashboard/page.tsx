"use client";
import { mockConversations } from "@/lib/mock/data";
import { formatRelativeTime, cn } from "@/lib/utils";
import Link from "next/link";
import { NodeCanvas } from "@/components/dashboard/NodeCanvas";
import type { CanvasNode, Connection } from "@/components/dashboard/NodeCanvas";

// TODO: REPLACE WITH API — GET /workspaces/:id/overview

const statusColors: Record<string, string> = {
  active: "bg-blue-50 text-blue-700",
  resolved: "bg-green-50 text-green-700",
  handed_off: "bg-orange-50 text-orange-700",
  abandoned: "bg-muted text-muted-foreground",
};

const channelEmoji: Record<string, string> = {
  web: "💬", whatsapp: "💚", instagram: "📸", sms: "📱",
  messenger: "💙", email: "📧", voice: "📞", slack: "🟨",
};

const defaultNodes: CanvasNode[] = [
  {
    id: "n1", type: "datasource", title: "Conversations API",
    x: 60, y: 80,
    config: { url: "/api/conversations/stats", method: "GET" },
    showInAnalytics: true,
  },
  {
    id: "n2", type: "metric", title: "Total Conversations",
    x: 360, y: 60,
    config: { label: "Total Conversations", value: "2,847", suffix: "", trend: "+18%" },
    showInAnalytics: true,
  },
  {
    id: "n3", type: "chart", title: "Volume Over Time",
    x: 360, y: 220,
    config: { chartType: "area", dataKey: "conversations", label: "Conversation Volume" },
    showInAnalytics: true,
  },
];

const defaultConnections: Connection[] = [
  { id: "c1", sourceNodeId: "n1", targetNodeId: "n2" },
  { id: "c2", sourceNodeId: "n1", targetNodeId: "n3" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-foreground">Overview</h1>
        <p className="text-sm text-muted-foreground">Your workspace canvas — drag nodes to build your own dashboard.</p>
      </div>

      {/* Node canvas */}
      <div className="h-[420px] rounded-xl border border-border overflow-hidden">
        <NodeCanvas
          storageKey="overview-canvas"
          defaultNodes={defaultNodes}
          defaultConnections={defaultConnections}
        />
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
                  <span className="text-xs text-muted-foreground">{channelEmoji[conv.channel] ?? "💬"}</span>
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
