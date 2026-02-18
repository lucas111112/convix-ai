"use client";
import { useState } from "react";
import { mockChannels } from "@/lib/mock/data";
import { Check, X, Settings, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// TODO: REPLACE WITH API — GET /stores/:id/channels

export default function ChannelsPage() {
  const [channels, setChannels] = useState(mockChannels);

  const toggle = (id: string) => {
    setChannels(prev => prev.map(c => c.id === id ? { ...c, isActive: !c.isActive } : c));
    const ch = channels.find(c => c.id === id);
    toast.success(ch?.isActive ? `${ch.name} disconnected` : `${ch?.name} connected!`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-foreground">Channels</h1>
        <p className="text-sm text-muted-foreground">Connect Convix AI to every channel your customers use.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {channels.map(ch => (
          <div key={ch.id} className={cn("bg-white rounded-xl border p-5 transition-all", ch.isActive ? "border-convix-200 shadow-sm" : "border-border")}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="text-2xl">{ch.icon}</div>
                <div>
                  <div className="font-semibold text-foreground text-sm">{ch.name}</div>
                  <div className={cn("flex items-center gap-1 text-xs mt-0.5", ch.isActive ? "text-green-600" : "text-muted-foreground")}>
                    {ch.isActive ? <><Check className="w-3 h-3" /> Connected</> : <><X className="w-3 h-3" /> Not connected</>}
                  </div>
                </div>
              </div>
              <button onClick={() => toggle(ch.id)}
                className={cn("relative w-10 h-5.5 rounded-full transition-colors focus:outline-none shrink-0 mt-0.5",
                  ch.isActive ? "bg-convix-600" : "bg-muted border border-border"
                )} style={{ height: "22px", width: "40px" }}>
                <div className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                  ch.isActive ? "translate-x-5" : "translate-x-0.5"
                )} />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{ch.description}</p>
            <div className="flex items-center justify-between">
              {ch.isActive ? (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Zap className="w-3 h-3 text-convix-500" />
                  {ch.conversations.toLocaleString()} conversations
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">Not yet connected</span>
              )}
              <button className="flex items-center gap-1 text-xs text-convix-600 hover:text-convix-700 font-medium">
                <Settings className="w-3 h-3" /> {ch.isActive ? "Manage" : "Set up"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
