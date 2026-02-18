"use client";
import { use } from "react";
import { mockConversations } from "@/lib/mock/data";
import { formatRelativeTime, cn } from "@/lib/utils";
import { ArrowLeft, Bot, User, Headphones, AlertTriangle, CheckCircle, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

// TODO: REPLACE WITH API — GET /stores/:id/conversations/:id

const roleIcon = { ai: Bot, user: User, human_agent: Headphones };
const roleLabel = { ai: "Convix AI", user: "Customer", human_agent: "Human Agent" };
const roleStyle = {
  user: "bg-muted text-foreground self-start",
  ai: "bg-convix-600 text-white self-end",
  human_agent: "bg-purple-600 text-white self-end",
};

export default function ConversationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const conv = mockConversations.find(c => c.id === id);
  if (!conv) notFound();

  const sentimentLabel = conv.sentiment > 0.5 ? "Positive" : conv.sentiment > 0 ? "Neutral" : "Negative";
  const sentimentColor = conv.sentiment > 0.5 ? "text-green-600" : conv.sentiment > 0 ? "text-yellow-600" : "text-red-500";

  return (
    <div className="animate-fade-in max-w-5xl">
      <div className="flex items-center gap-3 mb-5">
        <Link href="/dashboard/conversations" className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-foreground">{conv.customerName}</h1>
          <p className="text-xs text-muted-foreground">{conv.customerEmail} · {conv.channel} · {conv.messageCount} messages</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium border",
            conv.status === "active" ? "bg-blue-50 text-blue-700 border-blue-100" :
            conv.status === "resolved" ? "bg-green-50 text-green-700 border-green-100" :
            conv.status === "handed_off" ? "bg-orange-50 text-orange-700 border-orange-100" :
            "bg-muted text-muted-foreground border-border"
          )}>
            {conv.status.replace("_", " ")}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Messages */}
        <div className="col-span-2 bg-white rounded-xl border border-border flex flex-col h-[600px]">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Conversation Thread</span>
            <span className="text-xs text-muted-foreground">{formatRelativeTime(conv.createdAt)}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {conv.messages.map((msg) => {
              const Icon = roleIcon[msg.role];
              const isUser = msg.role === "user";
              return (
                <div key={msg.id} className={cn("flex gap-2.5 max-w-[85%]", isUser ? "self-start" : "self-end ml-auto flex-row-reverse")}>
                  <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                    msg.role === "user" ? "bg-muted" : msg.role === "ai" ? "bg-convix-100" : "bg-purple-100"
                  )}>
                    <Icon className={cn("w-3.5 h-3.5", msg.role === "user" ? "text-muted-foreground" : msg.role === "ai" ? "text-convix-600" : "text-purple-600")} />
                  </div>
                  <div className={cn("flex flex-col gap-1", !isUser && "items-end")}>
                    <div className={cn("flex items-center gap-2", !isUser && "flex-row-reverse")}>
                      <span className="text-[10px] font-medium text-muted-foreground">{roleLabel[msg.role]}</span>
                      {msg.confidence !== undefined && (
                        <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-medium",
                          msg.confidence >= 0.8 ? "bg-green-50 text-green-700" :
                          msg.confidence >= 0.6 ? "bg-yellow-50 text-yellow-700" : "bg-red-50 text-red-700"
                        )}>
                          {(msg.confidence * 100).toFixed(0)}% confidence
                        </span>
                      )}
                    </div>
                    <div className={cn("px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed", roleStyle[msg.role])}>
                      {msg.content}
                    </div>
                    <span className="text-[10px] text-muted-foreground">{formatRelativeTime(msg.timestamp)}</span>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Input bar (disabled — view only) */}
          <div className="border-t border-border px-4 py-3 flex items-center gap-2 bg-muted/20">
            <input disabled placeholder={conv.status === "resolved" ? "Conversation resolved" : "AI is handling this conversation…"} className="flex-1 text-sm bg-transparent text-muted-foreground focus:outline-none cursor-not-allowed" />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Customer info */}
          <div className="bg-white rounded-xl border border-border p-4">
            <h3 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wide">Customer</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="font-medium text-foreground">{conv.customerName}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="text-xs text-foreground truncate max-w-[120px]">{conv.customerEmail}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Channel</span><span className="font-medium capitalize">{conv.channel}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Sentiment</span><span className={cn("font-medium text-xs", sentimentColor)}>{sentimentLabel}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Intent</span><span className="font-medium">{(conv.intentScore * 100).toFixed(0)}%</span></div>
            </div>
          </div>

          {/* Revenue */}
          {conv.revenueAttributed > 0 && (
            <div className="bg-green-50 rounded-xl border border-green-100 p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-xs font-semibold text-green-700">Revenue Attributed</span>
              </div>
              <div className="text-2xl font-bold text-green-700">${conv.revenueAttributed}</div>
              <p className="text-xs text-green-600 mt-0.5">Attributed to this conversation</p>
            </div>
          )}

          {/* Handoff info */}
          {conv.status === "handed_off" && conv.handoffReason && (
            <div className="bg-orange-50 rounded-xl border border-orange-100 p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                <span className="text-xs font-semibold text-orange-700">Handoff Triggered</span>
              </div>
              <p className="text-xs text-orange-700 mb-3">{conv.handoffReason}</p>
              <div className="text-xs font-medium text-orange-800 mb-1">AI Summary for Agent:</div>
              <p className="text-xs text-orange-700 bg-orange-100/50 rounded p-2 leading-relaxed">
                Customer is frustrated about a delayed order (#4892). AI attempted 2 resolution attempts, providing new ETAs. Customer escalated, requesting a manager. Sentiment is strongly negative. Customer has ordered before.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="bg-white rounded-xl border border-border p-4 space-y-2">
            <h3 className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">Actions</h3>
            <button className="w-full py-2 px-3 text-xs font-medium bg-convix-600 text-white rounded-lg hover:bg-convix-700 transition-colors">
              {conv.status === "active" ? "Trigger Handoff" : conv.status === "handed_off" ? "Take Over as Agent" : "Reopen Conversation"}
            </button>
            <button className="w-full py-2 px-3 text-xs font-medium bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors">
              Mark as Resolved
            </button>
            <button className="w-full py-2 px-3 text-xs font-medium text-muted-foreground rounded-lg hover:bg-muted transition-colors flex items-center justify-center gap-1.5">
              <ExternalLink className="w-3 h-3" /> Export Transcript
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
