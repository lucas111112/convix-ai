"use client";
import { useState } from "react";
import Link from "next/link";
import { Search, Filter, MessageSquare } from "lucide-react";
import { mockConversations, type ConversationStatus, type ChannelType } from "@/lib/mock/data";
import { formatRelativeTime, cn } from "@/lib/utils";

// TODO: REPLACE WITH API — GET /stores/:id/conversations

const statusColors: Record<string, string> = {
  active: "bg-blue-50 text-blue-700 border-blue-100",
  resolved: "bg-green-50 text-green-700 border-green-100",
  handed_off: "bg-orange-50 text-orange-700 border-orange-100",
  abandoned: "bg-muted text-muted-foreground border-border",
};

const channelEmoji: Record<ChannelType, string> = {
  web: "💬", whatsapp: "💚", instagram: "📸", sms: "📱", messenger: "💙", email: "📧",
};

const sentimentColor = (s: number) => s > 0.5 ? "bg-green-400" : s > 0 ? "bg-yellow-400" : "bg-red-400";

export default function ConversationsPage() {
  const [filter, setFilter] = useState<ConversationStatus | "all">("all");
  const [search, setSearch] = useState("");

  const filtered = mockConversations.filter(c => {
    const matchStatus = filter === "all" || c.status === filter;
    const matchSearch = !search || c.customerName.toLowerCase().includes(search.toLowerCase()) || c.lastMessage.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const counts = {
    all: mockConversations.length,
    active: mockConversations.filter(c => c.status === "active").length,
    handed_off: mockConversations.filter(c => c.status === "handed_off").length,
    resolved: mockConversations.filter(c => c.status === "resolved").length,
    abandoned: mockConversations.filter(c => c.status === "abandoned").length,
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Conversations</h1>
          <p className="text-sm text-muted-foreground">{mockConversations.length} total conversations</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center bg-white border border-border rounded-lg overflow-hidden">
          {(["all", "active", "handed_off", "resolved", "abandoned"] as const).map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={cn("px-3 py-1.5 text-xs font-medium transition-colors", filter === s ? "bg-convix-600 text-white" : "text-muted-foreground hover:text-foreground hover:bg-muted")}>
              {s.replace("_", " ")} ({counts[s]})
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search customers..."
            className="pl-8 pr-3 py-1.5 text-sm bg-white border border-border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-convix-500" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="grid grid-cols-[2fr_1fr_2fr_1fr_1fr_1fr] text-xs font-medium text-muted-foreground border-b border-border px-5 py-2.5 bg-muted/30">
          <span>Customer</span>
          <span>Channel</span>
          <span>Last Message</span>
          <span>Status</span>
          <span>Sentiment</span>
          <span>Updated</span>
        </div>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <MessageSquare className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm">No conversations found</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map(conv => (
              <Link key={conv.id} href={`/dashboard/conversations/${conv.id}`}
                className="grid grid-cols-[2fr_1fr_2fr_1fr_1fr_1fr] items-center px-5 py-3 hover:bg-muted/20 transition-colors text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-convix-100 flex items-center justify-center text-xs font-medium text-convix-700 shrink-0">
                    {conv.customerName[0]}
                  </div>
                  <div>
                    <div className="font-medium text-foreground text-xs">{conv.customerName}</div>
                    <div className="text-[10px] text-muted-foreground">{conv.customerEmail}</div>
                  </div>
                </div>
                <span className="text-base">{channelEmoji[conv.channel]}</span>
                <span className="text-xs text-muted-foreground truncate pr-4">{conv.lastMessage}</span>
                <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium border w-fit", statusColors[conv.status])}>
                  {conv.status.replace("_", " ")}
                </span>
                <div className="flex items-center gap-1.5">
                  <div className={cn("w-2 h-2 rounded-full", sentimentColor(conv.sentiment))} />
                  <span className="text-xs text-muted-foreground">{(conv.sentiment * 100).toFixed(0)}</span>
                </div>
                <span className="text-xs text-muted-foreground">{formatRelativeTime(conv.updatedAt)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
