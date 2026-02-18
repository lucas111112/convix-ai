"use client";
import { useState } from "react";
import { Check, Download, Zap, MessageSquare, PhoneCall, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// TODO: REPLACE WITH API — GET /billing/plans, /billing/usage, /billing/invoices

type Tab = "plans" | "usage";

const plans = [
  {
    id: "starter",
    name: "Starter",
    price: 0,
    description: "For individuals and side projects",
    features: ["1 agent", "500 conversations/mo", "Web widget only", "Community support"],
    conversations: 500, voice: 0, agents: 1,
    current: false,
  },
  {
    id: "builder",
    name: "Builder",
    price: 49,
    description: "For growing teams and products",
    features: ["5 agents", "10,000 conversations/mo", "All channels", "Voice calls (100 min/mo)", "Email support", "Analytics"],
    conversations: 10000, voice: 100, agents: 5,
    current: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: 149,
    description: "For teams that need more scale",
    features: ["20 agents", "50,000 conversations/mo", "All channels", "Voice calls (1,000 min/mo)", "Priority support", "Advanced analytics", "Custom domains"],
    conversations: 50000, voice: 1000, agents: 20,
    current: false,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: null,
    description: "Custom solutions for large organizations",
    features: ["Unlimited agents", "Unlimited conversations", "Dedicated infrastructure", "SLA guarantee", "SSO/SAML", "Custom integrations", "Dedicated CSM"],
    conversations: Infinity, voice: Infinity, agents: Infinity,
    current: false,
  },
];

const usage = {
  conversations: { used: 3240, limit: 10000 },
  voice: { used: 42, limit: 100 },
  agents: { used: 2, limit: 5 },
};

const invoices = [
  { id: "inv_001", date: "Feb 1, 2026", amount: "$49.00", status: "paid" },
  { id: "inv_002", date: "Jan 1, 2026", amount: "$49.00", status: "paid" },
  { id: "inv_003", date: "Dec 1, 2025", amount: "$49.00", status: "paid" },
];

export default function BillingPage() {
  const [tab, setTab] = useState<Tab>("plans");

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Billing</h1>
          <p className="text-sm text-muted-foreground">Manage your plan and view usage.</p>
        </div>
        <div className="flex items-center bg-muted rounded-lg p-1 gap-1">
          {(["plans", "usage"] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn("px-4 py-1.5 text-xs font-medium rounded-md transition-colors capitalize",
                tab === t ? "bg-white shadow text-foreground" : "text-muted-foreground hover:text-foreground"
              )}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === "plans" ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {plans.map(plan => (
            <div key={plan.id} className={cn("bg-white rounded-xl border p-5 flex flex-col gap-4",
              plan.current ? "border-convix-400 ring-2 ring-convix-200" : "border-border"
            )}>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-foreground">{plan.name}</span>
                  {plan.current && (
                    <span className="text-[10px] font-semibold bg-convix-600 text-white px-2 py-0.5 rounded-full">Current</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{plan.description}</p>
              </div>

              <div>
                {plan.price === null ? (
                  <span className="text-2xl font-bold text-foreground">Custom</span>
                ) : (
                  <div className="flex items-end gap-1">
                    <span className="text-2xl font-bold text-foreground">${plan.price}</span>
                    <span className="text-xs text-muted-foreground mb-1">/mo</span>
                  </div>
                )}
              </div>

              <ul className="space-y-2 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Check className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => plan.current ? null : toast.success(plan.price === null ? "Sales team will contact you!" : `Upgrade to ${plan.name} initiated!`)}
                className={cn("w-full py-2 text-sm font-medium rounded-lg transition-colors",
                  plan.current ? "bg-muted text-muted-foreground cursor-default" :
                  plan.price === null ? "bg-foreground text-background hover:bg-foreground/90" :
                  "bg-convix-600 text-white hover:bg-convix-700"
                )}>
                {plan.current ? "Current Plan" : plan.price === null ? "Contact Sales" : `Upgrade to ${plan.name}`}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4 max-w-2xl">
          <div className="bg-white rounded-xl border border-border p-5 space-y-5">
            <h3 className="font-semibold text-sm text-foreground">Usage This Month</h3>

            {[
              { label: "Conversations", used: usage.conversations.used, limit: usage.conversations.limit, icon: MessageSquare, color: "bg-convix-600" },
              { label: "Voice Minutes", used: usage.voice.used, limit: usage.voice.limit, icon: PhoneCall, color: "bg-teal-500" },
              { label: "Agents", used: usage.agents.used, limit: usage.agents.limit, icon: Bot, color: "bg-purple-500" },
            ].map(item => {
              const pct = Math.round((item.used / item.limit) * 100);
              return (
                <div key={item.label} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <item.icon className="w-4 h-4 text-muted-foreground" />
                      {item.label}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {item.used.toLocaleString()} / {item.limit.toLocaleString()} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all", item.color, pct >= 80 ? "opacity-90" : "")}
                      style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  {pct >= 80 && (
                    <p className="text-xs text-orange-600">You're approaching your {item.label.toLowerCase()} limit. <span className="underline cursor-pointer" onClick={() => setTab("plans")}>Upgrade</span> to avoid interruptions.</p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="bg-white rounded-xl border border-border p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-foreground">Invoices</h3>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Zap className="w-3.5 h-3.5 text-convix-600" />
                <span>Builder Plan · <strong className="text-foreground">$49/mo</strong></span>
              </div>
            </div>
            <div className="space-y-2">
              {invoices.map(inv => (
                <div key={inv.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <span className="text-sm text-foreground">{inv.date}</span>
                    <span className="ml-3 text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">{inv.status}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-foreground">{inv.amount}</span>
                    <button onClick={() => toast.success("Invoice downloaded")}
                      className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors">
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
