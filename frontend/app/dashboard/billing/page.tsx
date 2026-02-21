"use client";
import { useState, useEffect } from "react";
import { Check, Download, Zap, Bot, Coins, Plus, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { authenticatedFetch } from "@/lib/auth";
import { toast } from "sonner";

type Tab = "plans" | "credits" | "usage";
type Cadence = "monthly" | "yearly";

interface Plan {
  id: string;
  name: string;
  monthlyPrice: number | null;
  description: string;
  features: string[];
  creditsPerMonth: number | null;
  agents: number | null;
  popular?: boolean;
}

const PLANS: Plan[] = [
  {
    id: "STARTER",
    name: "Starter",
    monthlyPrice: 0,
    description: "For individuals and side projects",
    creditsPerMonth: 500,
    agents: 1,
    features: [
      "500 credits / month",
      "1 agent",
      "Web widget only",
      "Community support",
    ],
  },
  {
    id: "BUILDER",
    name: "Builder",
    monthlyPrice: 49,
    description: "For growing teams and products",
    creditsPerMonth: 10000,
    agents: 5,
    popular: true,
    features: [
      "10,000 credits / month",
      "5 agents",
      "All channels",
      "Unlimited conversations",
      "Unlimited voice call minutes",
      "Email support",
      "Analytics",
    ],
  },
  {
    id: "PRO",
    name: "Pro",
    monthlyPrice: 149,
    description: "For teams that need more scale",
    creditsPerMonth: 50000,
    agents: 20,
    features: [
      "50,000 credits / month",
      "20 agents",
      "All channels",
      "Unlimited conversations",
      "Unlimited voice call minutes",
      "Priority support",
      "Advanced analytics",
    ],
  },
  {
    id: "ENTERPRISE",
    name: "Enterprise",
    monthlyPrice: null,
    description: "Custom solutions for large organizations",
    creditsPerMonth: null,
    agents: null,
    features: [
      "Unlimited credits",
      "Unlimited agents",
      "Dedicated infrastructure",
      "SLA guarantee",
      "SSO / SAML",
      "Custom integrations",
      "Dedicated success manager",
    ],
  },
];

interface CreditPack {
  id: string;
  credits: number;
  price: number;
  savings?: string;
  highlighted?: boolean;
}

const CREDIT_PACKS: CreditPack[] = [
  { id: "pack_500", credits: 500, price: 5 },
  { id: "pack_2500", credits: 2500, price: 20, savings: "Save $5" },
  { id: "pack_10000", credits: 10000, price: 69, savings: "Save $31", highlighted: true },
  { id: "pack_50000", credits: 50000, price: 299, savings: "Save $151" },
];

const YEARLY_DISCOUNT = 0.20;

function yearlyPrice(monthly: number) {
  return Math.round(monthly * (1 - YEARLY_DISCOUNT));
}

interface WorkspaceResponse {
  workspace: {
    plan: string;
    creditBalance: number;
    name: string;
  };
}

interface CreditsResponse {
  credits: {
    balance: number;
    plan: string;
    monthlyGrant: number;
    consumed: {
      messages: number;
      voice: number;
      tagging: number;
      total: number;
    };
  };
}

interface AgentsResponse {
  agents: { id: string }[];
}

export default function BillingPage() {
  const [tab, setTab] = useState<Tab>("plans");
  const [cadence, setCadence] = useState<Cadence>("yearly");
  const [creditQty, setCreditQty] = useState<Record<string, number>>({});

  // Real data from API
  const [currentPlan, setCurrentPlan] = useState<string>("STARTER");
  const [creditBalance, setCreditBalance] = useState<number>(0);
  const [creditsConsumed, setCreditsConsumed] = useState<number>(0);
  const [monthlyGrant, setMonthlyGrant] = useState<number>(500);
  const [agentCount, setAgentCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchBillingData = async () => {
      setLoading(true);
      try {
        const [workspaceRes, creditsRes, agentsRes] = await Promise.all([
          authenticatedFetch<WorkspaceResponse>("/v1/workspace"),
          authenticatedFetch<CreditsResponse>("/v1/analytics/credits"),
          authenticatedFetch<AgentsResponse>("/v1/agents"),
        ]);
        if (cancelled) return;

        setCurrentPlan(workspaceRes.workspace.plan);
        setCreditBalance(workspaceRes.workspace.creditBalance);
        setCreditsConsumed(creditsRes.credits.consumed.total);
        setMonthlyGrant(creditsRes.credits.monthlyGrant);
        setAgentCount(agentsRes.agents?.length ?? 0);
      } catch {
        // keep defaults on error
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchBillingData();
    return () => { cancelled = true; };
  }, []);

  const currentPlanObj = PLANS.find(p => p.id === currentPlan);
  const agentLimit = currentPlanObj?.agents ?? null;
  const creditLimit = currentPlanObj?.creditsPerMonth ?? null;

  const qty = (id: string) => creditQty[id] ?? 1;
  const setQty = (id: string, v: number) => setCreditQty(p => ({ ...p, [id]: Math.max(1, v) }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Billing</h1>
          <p className="text-sm text-muted-foreground">Manage your plan and credits.</p>
        </div>
        <div className="flex items-center bg-muted rounded-lg p-1 gap-1">
          {(["plans", "credits", "usage"] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn("px-4 py-1.5 text-xs font-medium rounded-md transition-colors capitalize",
                tab === t ? "bg-white shadow text-foreground" : "text-muted-foreground hover:text-foreground"
              )}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ── Plans tab ──────────────────────────────────────────────────────── */}
      {tab === "plans" && (
        <div className="space-y-5">
          {/* Monthly / Yearly toggle */}
          <div className="flex items-center justify-center gap-3">
            <span className={cn("text-sm font-medium", cadence === "monthly" ? "text-foreground" : "text-muted-foreground")}>Monthly</span>
            <button onClick={() => setCadence(c => c === "monthly" ? "yearly" : "monthly")}
              className={cn("relative rounded-full transition-colors", cadence === "yearly" ? "bg-convix-600" : "bg-muted border border-border")}
              style={{ height: "26px", width: "48px" }}>
              <div className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform",
                cadence === "yearly" ? "translate-x-6" : "translate-x-0.5"
              )} />
            </button>
            <span className={cn("text-sm font-medium flex items-center gap-1.5", cadence === "yearly" ? "text-foreground" : "text-muted-foreground")}>
              Yearly
              <span className="text-[10px] font-semibold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Save 20%</span>
            </span>
          </div>

          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {PLANS.map(plan => {
              const isCurrent = plan.id === currentPlan;
              const price = plan.monthlyPrice === null ? null
                : cadence === "yearly" && plan.monthlyPrice > 0
                  ? yearlyPrice(plan.monthlyPrice)
                  : plan.monthlyPrice;

              return (
                <div key={plan.id} className={cn("bg-white rounded-xl border p-5 flex flex-col gap-4 relative",
                  isCurrent ? "border-convix-400 ring-2 ring-convix-200" : "border-border",
                  plan.popular && !isCurrent ? "border-convix-300" : ""
                )}>
                  {/* Badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-foreground">{plan.name}</span>
                    {plan.popular && (
                      <span className="text-[10px] font-semibold bg-amber-400 text-amber-900 px-2 py-0.5 rounded-full">⭐ Popular</span>
                    )}
                    {isCurrent && (
                      <span className="text-[10px] font-semibold bg-convix-600 text-white px-2 py-0.5 rounded-full">Current</span>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground -mt-2">{plan.description}</p>

                  {/* Price */}
                  <div>
                    {price === null ? (
                      <span className="text-2xl font-bold text-foreground">Custom</span>
                    ) : (
                      <div className="flex items-end gap-1">
                        <span className="text-2xl font-bold text-foreground">${price}</span>
                        <span className="text-xs text-muted-foreground mb-1">/mo</span>
                        {cadence === "yearly" && price > 0 && (
                          <span className="text-[10px] text-muted-foreground mb-1 ml-1 line-through">${plan.monthlyPrice}/mo</span>
                        )}
                      </div>
                    )}
                    {cadence === "yearly" && price !== null && price > 0 && (
                      <p className="text-[10px] text-green-600 mt-0.5">billed as ${price * 12}/year</p>
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
                    onClick={() => {
                      if (isCurrent) return;
                      toast.success(price === null ? "Sales team will contact you!" : `Upgrade to ${plan.name} initiated!`);
                    }}
                    className={cn("w-full py-2 text-sm font-medium rounded-lg transition-colors",
                      isCurrent ? "bg-muted text-muted-foreground cursor-default" :
                      price === null ? "bg-foreground text-background hover:bg-foreground/90" :
                      "bg-convix-600 text-white hover:bg-convix-700"
                    )}>
                    {isCurrent ? "Current Plan" : price === null ? "Contact Sales" : `Upgrade to ${plan.name}`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Credits tab ────────────────────────────────────────────────────── */}
      {tab === "credits" && (
        <div className="space-y-5">
          {/* Current balance */}
          <div className="bg-convix-50 border border-convix-200 rounded-xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-convix-600 flex items-center justify-center">
                <Coins className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">Credit Balance</div>
                <div className="text-2xl font-bold text-convix-700">
                  {loading ? "—" : creditBalance.toLocaleString()}{" "}
                  <span className="text-sm font-normal text-muted-foreground">credits remaining</span>
                </div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground text-right">
              <div>{loading ? "—" : creditsConsumed.toLocaleString()} used this month</div>
              {monthlyGrant > 0 && (
                <div className="text-convix-600 font-medium mt-0.5">{monthlyGrant.toLocaleString()} monthly allocation</div>
              )}
            </div>
          </div>

          {/* How credits work */}
          <div className="bg-white border border-border rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">How credits work</h3>
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                { label: "Text message", cost: "1 credit" },
                { label: "Voice message / call (per minute)", cost: "5 credits" },
                { label: "Auto-tagging (per conversation)", cost: "2 credits" },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between px-3 py-2 bg-muted/40 rounded-lg text-xs">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-semibold text-foreground">{item.cost}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Monthly plan credits reset on your billing date. Purchased credits never expire.</p>
          </div>

          {/* Credit packs */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Buy one-time credits</h3>
            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {CREDIT_PACKS.map(pack => (
                <div key={pack.id} className={cn("bg-white rounded-xl border p-5 flex flex-col gap-4",
                  pack.highlighted ? "border-convix-400 ring-2 ring-convix-100" : "border-border"
                )}>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-base font-bold text-foreground">
                        {pack.credits.toLocaleString()} <span className="text-xs font-medium text-muted-foreground">credits</span>
                      </div>
                      {pack.savings && (
                        <span className="text-[10px] font-semibold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">{pack.savings}</span>
                      )}
                    </div>
                    <div className="text-2xl font-bold text-foreground">${pack.price}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      ${(pack.price / pack.credits * 1000).toFixed(1)} per 1,000 credits
                    </div>
                  </div>

                  {/* Quantity */}
                  <div className="flex items-center gap-2">
                    <button onClick={() => setQty(pack.id, qty(pack.id) - 1)}
                      className="w-7 h-7 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm font-semibold text-foreground w-6 text-center">{qty(pack.id)}</span>
                    <button onClick={() => setQty(pack.id, qty(pack.id) + 1)}
                      className="w-7 h-7 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
                      <Plus className="w-3 h-3" />
                    </button>
                    <span className="text-xs text-muted-foreground">= ${pack.price * qty(pack.id)}</span>
                  </div>

                  <button
                    onClick={() => toast.success(`${(pack.credits * qty(pack.id)).toLocaleString()} credits added!`)}
                    className={cn("w-full py-2 text-sm font-medium rounded-lg transition-colors mt-auto",
                      pack.highlighted ? "bg-convix-600 text-white hover:bg-convix-700" : "border border-convix-300 text-convix-700 hover:bg-convix-50"
                    )}>
                    Buy {qty(pack.id) > 1 ? `× ${qty(pack.id)}` : ""}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Usage tab ──────────────────────────────────────────────────────── */}
      {tab === "usage" && (
        <div className="space-y-4 max-w-2xl">
          <div className="bg-white rounded-xl border border-border p-5 space-y-5">
            <h3 className="font-semibold text-sm text-foreground">Usage This Month</h3>

            {[
              {
                label: "Credits Used",
                used: creditsConsumed,
                limit: creditLimit ?? creditsConsumed + 1,
                icon: Coins,
                color: "bg-convix-600",
                unlimited: creditLimit === null,
              },
              {
                label: "Agents",
                used: agentCount,
                limit: agentLimit ?? agentCount + 1,
                icon: Bot,
                color: "bg-purple-500",
                unlimited: agentLimit === null,
              },
            ].map(item => {
              const pct = item.unlimited ? 0 : Math.round((item.used / item.limit) * 100);
              return (
                <div key={item.label} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <item.icon className="w-4 h-4 text-muted-foreground" />
                      {item.label}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {loading ? "—" : item.unlimited
                        ? `${item.used.toLocaleString()} / ∞`
                        : `${item.used.toLocaleString()} / ${item.limit.toLocaleString()} (${pct}%)`
                      }
                    </span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all", item.color)}
                      style={{ width: item.unlimited ? "8%" : `${Math.min(pct, 100)}%` }} />
                  </div>
                  {!item.unlimited && pct >= 80 && (
                    <p className="text-xs text-orange-600">
                      Approaching your {item.label.toLowerCase()} limit.{" "}
                      <span className="underline cursor-pointer" onClick={() => setTab("plans")}>Upgrade</span> or{" "}
                      <span className="underline cursor-pointer" onClick={() => setTab("credits")}>buy credits</span> to avoid interruptions.
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Plan summary */}
          <div className="bg-white rounded-xl border border-border p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-foreground">Current Plan</h3>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Zap className="w-3.5 h-3.5 text-convix-600" />
                <span>
                  {loading ? "—" : currentPlanObj ? (
                    <>
                      {currentPlanObj.name} Plan{currentPlanObj.monthlyPrice !== null && currentPlanObj.monthlyPrice > 0 && (
                        <> · <strong className="text-foreground">${yearlyPrice(currentPlanObj.monthlyPrice)}/mo</strong> (yearly)</>
                      )}
                      {currentPlanObj.monthlyPrice === null && (
                        <> · <strong className="text-foreground">Custom pricing</strong></>
                      )}
                      {currentPlanObj.monthlyPrice === 0 && (
                        <> · <strong className="text-foreground">Free</strong></>
                      )}
                    </>
                  ) : currentPlan}
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Contact support to view invoices or change billing details.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
