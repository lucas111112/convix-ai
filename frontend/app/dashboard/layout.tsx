"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, MessageSquare, BarChart3, Radio, AppWindow,
  BookOpen, Settings, Bot, ChevronLeft, ChevronRight,
  Bell, Search, LogOut, User, Layers, Wrench
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Agents", href: "/dashboard/agents", icon: Bot },
  { label: "Tools", href: "/dashboard/tools", icon: Wrench },
  { label: "Conversations", href: "/dashboard/conversations", icon: MessageSquare, badge: 3 },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { label: "Channels", href: "/dashboard/channels", icon: Radio },
  { label: "Widget", href: "/dashboard/widget", icon: AppWindow },
  { label: "Training", href: "/dashboard/training", icon: BookOpen },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

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
              <span className="text-xs text-foreground font-medium truncate">My Workspace</span>
              <ChevronRight className="w-3 h-3 text-muted-foreground ml-auto" />
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {nav.map(item => {
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
          })}
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
                <div className="text-[10px] text-muted-foreground truncate">Builder Plan</div>
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
            <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
              <Bell className="w-4 h-4 text-muted-foreground" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <div className="flex items-center gap-2 ml-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse2" />
              <span className="text-xs text-muted-foreground">3 active</span>
            </div>
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
