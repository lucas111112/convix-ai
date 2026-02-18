"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, MessageSquare, Settings, Tag } from "lucide-react";
import { mockConversations, mockCustomFields, type ConversationStatus, type ChannelType } from "@/lib/mock/data";
import { formatRelativeTime, cn } from "@/lib/utils";

// TODO: REPLACE WITH API — GET /agents/:id/conversations

const statusColors: Record<string, string> = {
  active: "bg-blue-50 text-blue-700 border-blue-100",
  resolved: "bg-green-50 text-green-700 border-green-100",
  handed_off: "bg-orange-50 text-orange-700 border-orange-100",
  abandoned: "bg-muted text-muted-foreground border-border",
};

const channelEmoji: Record<ChannelType, string> = {
  web: "💬", whatsapp: "💚", instagram: "📸", sms: "📱",
  messenger: "💙", email: "📧", voice: "📞", slack: "🟨",
};

const tagColors = ["bg-purple-50 text-purple-700 border-purple-200", "bg-teal-50 text-teal-700 border-teal-200", "bg-blue-50 text-blue-700 border-blue-200", "bg-pink-50 text-pink-700 border-pink-200"];

const listFields = mockCustomFields.filter(f => f.showInList);

function getConvTag(convId: string, tags: string[]): string | null {
  if (tags.length === 0) return null;
  const hash = convId.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return tags[hash % tags.length];
}

export default function ConversationsPage() {
  const [filter, setFilter] = useState<ConversationStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [taggingEnabled, setTaggingEnabled] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  useEffect(() => {
    setTaggingEnabled(localStorage.getItem("axon-tagging-enabled") === "true");
    const stored = localStorage.getItem("axon-available-tags");
    if (stored) setAvailableTags(JSON.parse(stored));
  }, []);

  const showTagCol = taggingEnabled && availableTags.length > 0;

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

  const baseCols = showTagCol ? "2fr 1fr 2fr 1fr 100px" : "2fr 1fr 2fr 1fr";
  const customCols = listFields.map(() => "1fr").join(" ");
  const gridCols = `${baseCols} ${customCols} 1fr`;

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
              className={cn("px-3 py-1.5 text-xs font-medium transition-colors",
                filter === s ? "bg-convix-600 text-white" : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}>
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
        <div className="grid text-xs font-medium text-muted-foreground border-b border-border px-5 py-2.5 bg-muted/30"
          style={{ gridTemplateColumns: gridCols }}>
          <span>Customer</span>
          <span>Channel</span>
          <span>Last Message</span>
          <span>Status</span>
          {showTagCol && <span className="flex items-center gap-1"><Tag className="w-3 h-3" />Tag</span>}
          {listFields.map(f => <span key={f.id}>{f.label}</span>)}
          <span>Updated</span>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <MessageSquare className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm">No conversations found</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map(conv => {
              const convTag = showTagCol ? getConvTag(conv.id, availableTags) : null;
              const tagColorClass = convTag ? tagColors[availableTags.indexOf(convTag) % tagColors.length] : "";
              return (
                <Link key={conv.id} href={`/dashboard/conversations/${conv.id}`}
                  className="grid items-center px-5 py-3 hover:bg-muted/20 transition-colors text-sm"
                  style={{ gridTemplateColumns: gridCols }}>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-convix-100 flex items-center justify-center text-xs font-medium text-convix-700 shrink-0">
                      {conv.customerName[0]}
                    </div>
                    <div>
                      <div className="font-medium text-foreground text-xs">{conv.customerName}</div>
                      <div className="text-[10px] text-muted-foreground">{conv.customerEmail}</div>
                    </div>
                  </div>
                  <span className="text-base">{channelEmoji[conv.channel] ?? "💬"}</span>
                  <span className="text-xs text-muted-foreground truncate pr-4">{conv.lastMessage}</span>
                  <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium border w-fit", statusColors[conv.status])}>
                    {conv.status.replace("_", " ")}
                  </span>
                  {showTagCol && (
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium border w-fit", convTag ? tagColorClass : "text-muted-foreground")}>
                      {convTag ?? "—"}
                    </span>
                  )}
                  {listFields.map(f => (
                    <span key={f.id} className="text-xs text-muted-foreground">—</span>
                  ))}
                  <span className="text-xs text-muted-foreground">{formatRelativeTime(conv.updatedAt)}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {listFields.length === 0 && !showTagCol && (
        <div className="flex items-center gap-3 px-4 py-3 bg-muted/40 rounded-xl border border-border text-sm text-muted-foreground">
          <Settings className="w-4 h-4 shrink-0" />
          <span>Configure <Link href="/dashboard/settings" className="text-convix-600 hover:underline font-medium">custom fields</Link> or enable <Link href="/dashboard/settings" className="text-convix-600 hover:underline font-medium">conversation tagging</Link> in Settings.</span>
        </div>
      )}
    </div>
  );
}
