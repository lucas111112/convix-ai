"use client";
import { NodeCanvas } from "@/components/dashboard/NodeCanvas";
import type { CanvasNode, Connection } from "@/components/dashboard/NodeCanvas";

// TODO: REPLACE WITH API — node canvas pulls data from user-configured endpoints

const defaultNodes: CanvasNode[] = [
  {
    id: "ds1", type: "datasource", title: "Conversations API",
    x: 60, y: 80,
    config: { url: "/api/analytics/conversations", method: "GET" },
    showInAnalytics: true,
  },
  {
    id: "m1", type: "metric", title: "Total Conversations",
    x: 380, y: 50,
    config: { label: "Total Conversations", value: "2,847", suffix: "", trend: "+18%" },
    showInAnalytics: true,
  },
  {
    id: "m2", type: "metric", title: "Handoff Rate",
    x: 580, y: 50,
    config: { label: "Handoff Rate", value: "6.8", suffix: "%", trend: "-1.2%" },
    showInAnalytics: true,
  },
  {
    id: "ch1", type: "chart", title: "Conversation Volume",
    x: 380, y: 200,
    config: { chartType: "area", dataKey: "conversations", label: "Volume Over Time" },
    showInAnalytics: true,
  },
  {
    id: "ch2", type: "chart", title: "Channel Breakdown",
    x: 720, y: 200,
    config: { chartType: "bar", dataKey: "channel", label: "By Channel" },
    showInAnalytics: true,
  },
];

const defaultConnections: Connection[] = [
  { id: "c1", sourceNodeId: "ds1", targetNodeId: "m1" },
  { id: "c2", sourceNodeId: "ds1", targetNodeId: "m2" },
  { id: "c3", sourceNodeId: "ds1", targetNodeId: "ch1" },
  { id: "c4", sourceNodeId: "ds1", targetNodeId: "ch2" },
];

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col h-full space-y-4 animate-fade-in" style={{ height: "calc(100vh - 7rem)" }}>
      <div>
        <h1 className="text-xl font-bold text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground">Drag in data sources and wire them to metrics, charts, and alerts.</p>
      </div>

      <div className="flex-1 rounded-xl border border-border overflow-hidden">
        <NodeCanvas
          storageKey="analytics-canvas"
          defaultNodes={defaultNodes}
          defaultConnections={defaultConnections}
        />
      </div>
    </div>
  );
}
