"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  LayoutDashboard, BarChart3, AppWindow,
  Bot, ChevronLeft, ChevronRight,
  Bell, Search, LogOut, User, Layers, BookMarked, CreditCard,
  AlertTriangle, MessageSquare, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { hasValidSession, authenticatedFetch } from "@/lib/auth";

const navMain = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Agents", href: "/dashboard/agents", icon: Bot },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { label: "Widget", href: "/dashboard/widget", icon: AppWindow },
];

const navSecondary = [
  { label: "Docs", href: "/dashboard/docs", icon: BookMarked },
  { label: "Billing", href: "/dashboard/billing", icon: CreditCard },
];

type NavItem = { label: string; href: string; icon: React.ElementType; badge?: number };

type NotificationItem = {
  id: string;
  type: "handoff" | "new_conversation";
  title: string;
  description: string;
  conversationId: string;
  agentName: string;
  customerName: string | null;
  createdAt: string;
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeAgentCount, setActiveAgentCount] = useState<number | null>(null);
  const [workspaceName, setWorkspaceName] = useState("My Workspace");
  const [workspacePlan, setWorkspacePlan] = useState("Starter Plan");

  // Notifications state
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notifCount, setNotifCount] = useState(0);
  const [showNotif, setShowNotif] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    hasValidSession()
      .then((ok) => {
        if (!cancelled) {
          setIsAuthenticated(ok);
          if (!ok) {
            router.replace("/login");
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsAuthenticated(false);
          router.replace("/login");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsCheckingSession(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await authenticatedFetch<{ count: number; items: NotificationItem[] }>("/v1/notifications");
      setNotifCount(res.count ?? 0);
      setNotifications(res.items ?? []);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;

    const loadHeaderData = async () => {
      try {
        const [agentsRes, workspaceRes] = await Promise.all([
          authenticatedFetch<{ agents: Array<{ status: string }> }>("/v1/agents"),
          authenticatedFetch<{ workspace: { name: string; plan: string } }>("/v1/workspace"),
        ]);
        if (cancelled) return;
        const active = (agentsRes.agents ?? []).filter(a => a.status === "ACTIVE").length;
        setActiveAgentCount(active);
        if (workspaceRes.workspace?.name) setWorkspaceName(workspaceRes.workspace.name);
        if (workspaceRes.workspace?.plan) {
          const planMap: Record<string, string> = { STARTER: "Starter Plan", BUILDER: "Builder Plan", PRO: "Pro Plan", ENTERPRISE: "Enterprise" };
          setWorkspacePlan(planMap[workspaceRes.workspace.plan] ?? workspaceRes.workspace.plan);
        }
      } catch {
        // silently fail — header data is non-critical
      }
    };

    void loadHeaderData();
    void loadNotifications();

    // Poll notifications every 60 seconds
    const interval = setInterval(() => {
      if (!cancelled) void loadNotifications();
    }, 60_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isAuthenticated, loadNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showNotif) return;
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotif(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showNotif]);

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-muted/20 flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Checking session...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const renderNav = (items: NavItem[]) =>
    items.map(item => {
      const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
      return (
        <Link key={item.href} href={item.href}
          className={cn("flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-colors relative",
            active ? "bg-convix-50 text-convix-700 font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            collapsed && "justify-center px-0"
          )}>
          <item.icon className="w-4 h-4 shrink-0" />
          {!collapsed && <span>{item.label}</span>}
          {!collapsed && item.badge && (
            <span className="ml-auto bg-convix-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-medium">
              {item.badge}
            </span>
          )}
        </Link>
      );
    });

  return (
    <div className="flex h-screen bg-muted/20 overflow-hidden">
      {/* Sidebar */}
      <aside className={cn("flex flex-col bg-white border-r border-border transition-all duration-200 shrink-0", collapsed ? "w-16" : "w-56")}>
        {/* Logo */}
        <div className={cn("h-16 flex items-center border-b border-border px-4 gap-2", collapsed && "justify-center px-0")}>
          <div className="w-8 h-8 rounded-lg bg-convix-600 flex items-center justify-center shrink-0">
            <Bot className="w-5 h-5 text-white" />
          </div>
          {!collapsed && <span className="font-bold text-foreground">Axon AI</span>}
        </div>

        {/* Workspace selector */}
        {!collapsed && (
          <div className="px-3 py-2 border-b border-border">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/50 cursor-pointer hover:bg-muted">
              <Layers className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-foreground font-medium truncate">{workspaceName}</span>
              <ChevronRight className="w-3 h-3 text-muted-foreground ml-auto" />
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 overflow-y-auto space-y-0.5">
          {renderNav(navMain)}

          {/* Separator */}
          <div className={cn("my-2", collapsed ? "mx-auto w-6 border-t border-border" : "border-t border-border mx-1")} />

          {renderNav(navSecondary)}
        </nav>

        {/* Bottom */}
        <div className="border-t border-border p-2">
          {!collapsed ? (
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted cursor-pointer">
              <div className="w-6 h-6 rounded-full bg-convix-100 flex items-center justify-center shrink-0">
                <User className="w-3.5 h-3.5 text-convix-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-foreground truncate">My Account</div>
                <div className="text-[10px] text-muted-foreground truncate">{workspacePlan}</div>
              </div>
              <LogOut className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-7 h-7 rounded-full bg-convix-100 flex items-center justify-center cursor-pointer">
                <User className="w-4 h-4 text-convix-600" />
              </div>
            </div>
          )}
          <button onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center p-1.5 mt-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors">
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-border flex items-center px-6 gap-4 shrink-0">
          <div className="flex-1 flex items-center gap-3">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input placeholder="Search conversations..." className="pl-9 pr-4 py-1.5 text-sm bg-muted/50 rounded-lg border border-border w-64 focus:outline-none focus:ring-2 focus:ring-convix-500 focus:border-transparent" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Notification bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotif(v => !v)}
                className="relative p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <Bell className="w-4 h-4 text-muted-foreground" />
                {notifCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[14px] h-[14px] bg-red-500 rounded-full flex items-center justify-center text-[9px] text-white font-bold px-0.5">
                    {notifCount > 9 ? "9+" : notifCount}
                  </span>
                )}
              </button>

              {/* Dropdown */}
              {showNotif && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-border rounded-xl shadow-lg z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <span className="text-sm font-semibold text-foreground">Notifications</span>
                    <button onClick={() => setShowNotif(false)} className="text-muted-foreground hover:text-foreground">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                        <Bell className="w-8 h-8 text-muted-foreground/30 mb-2" />
                        <p className="text-sm text-muted-foreground">No notifications</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">Handoff requests and new conversations will appear here</p>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className="flex items-start gap-3 px-4 py-3 hover:bg-muted/40 border-b border-border last:border-0 cursor-default"
                        >
                          <div className={cn(
                            "w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                            n.type === "handoff"
                              ? "bg-orange-100 text-orange-600"
                              : "bg-convix-100 text-convix-600"
                          )}>
                            {n.type === "handoff"
                              ? <AlertTriangle className="w-3.5 h-3.5" />
                              : <MessageSquare className="w-3.5 h-3.5" />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-foreground">{n.title}</span>
                              <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(n.createdAt)}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.description}</p>
                            <p className="text-[10px] text-muted-foreground/60 mt-1">via {n.agentName}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {notifications.length > 0 && (
                    <div className="px-4 py-2.5 border-t border-border">
                      <button
                        onClick={() => { void loadNotifications(); }}
                        className="text-xs text-convix-600 hover:text-convix-700 font-medium"
                      >
                        Refresh
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {activeAgentCount !== null && (
              <div className="flex items-center gap-2 ml-2">
                <div className={cn("w-2 h-2 rounded-full", activeAgentCount > 0 ? "bg-green-500 animate-pulse" : "bg-muted-foreground/40")} />
                <span className="text-xs text-muted-foreground">{activeAgentCount} active</span>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
