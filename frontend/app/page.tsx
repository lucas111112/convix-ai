"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Zap, Globe, BarChart3, ShieldCheck,
  ArrowRight, Check, Bot, Mic, Wrench, Layers,
  LayoutDashboard, AppWindow, BookMarked, CreditCard, Coins
} from "lucide-react";

const features = [
  { icon: Bot, title: "Build Any Agent", desc: "Define the agent's name, avatar, and system prompt — total control over personality and behaviour for any use case.", color: "text-violet-500 bg-violet-50" },
  { icon: Wrench, title: "Connect Your Tools", desc: "HTTP endpoints, webhooks, database queries, or custom functions. Agents call your own APIs in real time.", color: "text-blue-500 bg-blue-50" },
  { icon: Globe, title: "Deploy Everywhere", desc: "Web widget, WhatsApp, SMS, voice calls, Instagram, Messenger, Email, Slack. One agent, every channel.", color: "text-green-500 bg-green-50" },
  { icon: BarChart3, title: "Real-Time Analytics", desc: "Pre-built dashboards showing conversations, response time, handoff rate, and credit usage — updated live with CSV and PNG export.", color: "text-orange-500 bg-orange-50" },
  { icon: ShieldCheck, title: "Smart Human Handoff", desc: "Confidence-based routing escalates to humans at the right moment, with full conversation summary passed automatically.", color: "text-pink-500 bg-pink-50" },
  { icon: Mic, title: "Voice Ready", desc: "Text, voice, or both — switchable per agent. Full Twilio Voice integration for inbound and outbound calling.", color: "text-cyan-500 bg-cyan-50" },
];

const plans = [
  { name: "Starter", price: 0, credits: "500 credits / mo", agents: "1 agent", channels: "Web widget only", cta: "Get Started Free", popular: false },
  { name: "Builder", price: 49, credits: "10,000 credits / mo", agents: "5 agents", channels: "All channels", cta: "Start Free", popular: true },
  { name: "Pro", price: 149, credits: "50,000 credits / mo", agents: "20 agents", channels: "All channels + priority support", cta: "Start Free", popular: false },
  { name: "Enterprise", price: null, credits: "Custom volume", agents: "Unlimited agents", channels: "All + SLA + white-label", cta: "Contact Us", popular: false },
];

const comparison = [
  { feature: "Any use case (not just eCommerce)", axon: true, intercom: false, zipchat: false, custom: true },
  { feature: "Connect your own APIs / tools", axon: true, intercom: false, zipchat: false, custom: true },
  { feature: "Custom system prompt", axon: true, intercom: false, zipchat: false, custom: true },
  { feature: "Built-in analytics dashboard", axon: true, intercom: "partial", zipchat: false, custom: true },
  { feature: "Voice / calling support", axon: true, intercom: false, zipchat: false, custom: true },
  { feature: "Multiple agents per workspace", axon: true, intercom: "partial", zipchat: false, custom: true },
  { feature: "Time to deploy", axon: "Minutes", intercom: "Hours", zipchat: "Hours", custom: "Weeks" },
  { feature: "Starting price", axon: "Free", intercom: "$74/mo", zipchat: "$49/mo", custom: "$0 + dev" },
];

const CheckIcon = ({ val }: { val: boolean | string }) => {
  if (val === true) return <Check className="w-4 h-4 text-green-500 mx-auto" />;
  if (val === "partial") return <span className="text-yellow-500 text-xs font-medium">Partial</span>;
  if (val === false) return <span className="text-muted-foreground">—</span>;
  return <span className="text-sm font-semibold text-foreground">{val}</span>;
};

export default function LandingPage() {
  const signupHref = "/signup";
  const loginHref = "/login";

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-convix-600 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-foreground">Axon AI</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <a href="#compare" className="hover:text-foreground transition-colors">Compare</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href={loginHref} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Log in
            </Link>
            <Link
              href={signupHref}
              className="px-4 py-2 bg-convix-600 text-white text-sm font-medium rounded-lg hover:bg-convix-700 transition-colors flex items-center gap-1.5">
              Start Free <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-convix-50 text-convix-700 text-xs font-medium rounded-full border border-convix-200 mb-6">
              <Zap className="w-3 h-3" /> Universal AI agent builder — deploy anywhere
            </div>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-foreground mb-6 leading-tight">
              Build AI agents that<br />
              <span className="text-convix-600">connect to anything.</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              Define your agent's personality. Connect your own tools and APIs. Deploy on web, voice, WhatsApp, Slack, and more — in minutes, not months.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href={signupHref}
                className="px-8 py-3.5 bg-convix-600 text-white font-semibold rounded-xl hover:bg-convix-700 transition-colors flex items-center gap-2 text-base shadow-lg shadow-convix-200">
                Start free — no card needed <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href={loginHref} className="px-8 py-3.5 bg-secondary text-foreground font-semibold rounded-xl hover:bg-secondary/80 transition-colors text-base">
                View live demo
              </Link>
            </div>
            <p className="text-xs text-muted-foreground mt-4">14-day free trial · No credit card required · Cancel anytime</p>
          </motion.div>

          {/* Dashboard Preview */}
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-16 rounded-2xl border border-border shadow-2xl overflow-hidden bg-muted/30">
            <div className="bg-muted/50 px-4 py-2 flex items-center gap-2 border-b border-border">
              <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-red-400" /><div className="w-3 h-3 rounded-full bg-yellow-400" /><div className="w-3 h-3 rounded-full bg-green-400" /></div>
              <div className="flex-1 text-center text-xs text-muted-foreground">axon.ai/dashboard</div>
            </div>
            <div className="grid grid-cols-4 h-64 text-left">
              {/* Sidebar */}
              <div className="bg-white border-r border-border p-3 space-y-0.5">
                <div className="flex items-center gap-2 px-2 py-1.5 mb-2">
                  <div className="w-5 h-5 rounded bg-convix-600 flex items-center justify-center shrink-0">
                    <Bot className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-xs font-bold">Axon AI</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1.5 bg-convix-50 text-convix-700 rounded-md text-[10px] font-medium">
                  <LayoutDashboard className="w-3 h-3 shrink-0" /> Overview
                </div>
                {[
                  { label: "Agents", icon: Bot },
                  { label: "Analytics", icon: BarChart3 },
                  { label: "Widget", icon: AppWindow },
                ].map(({ label, icon: Icon }) => (
                  <div key={label} className="flex items-center gap-1.5 px-2 py-1.5 text-muted-foreground text-[10px] rounded-md">
                    <Icon className="w-3 h-3 shrink-0" /> {label}
                  </div>
                ))}
                <div className="border-t border-border my-1 mx-1" />
                {[
                  { label: "Docs", icon: BookMarked },
                  { label: "Billing", icon: CreditCard },
                ].map(({ label, icon: Icon }) => (
                  <div key={label} className="flex items-center gap-1.5 px-2 py-1.5 text-muted-foreground text-[10px] rounded-md">
                    <Icon className="w-3 h-3 shrink-0" /> {label}
                  </div>
                ))}
              </div>
              {/* Main */}
              <div className="col-span-3 p-3 space-y-2 bg-muted/20">
                <div className="text-[10px] font-semibold text-foreground">Overview</div>
                {/* Stat cards */}
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: "Credits Used", value: "3,241", sub: "of 10,000" },
                    { label: "Conversations", value: "2,847", sub: "this month" },
                    { label: "Avg Latency", value: "1.2s", sub: "response time" },
                    { label: "Active Now", value: "3", sub: "agents online" },
                  ].map(stat => (
                    <div key={stat.label} className="bg-white rounded-lg border border-border p-2">
                      <div className="text-[8px] text-muted-foreground leading-tight">{stat.label}</div>
                      <div className="text-xs font-bold text-foreground mt-0.5">{stat.value}</div>
                      <div className="text-[8px] text-muted-foreground">{stat.sub}</div>
                    </div>
                  ))}
                </div>
                {/* Mini bar chart */}
                <div className="bg-white rounded-lg border border-border p-2">
                  <div className="text-[8px] text-muted-foreground mb-1.5">Messages — Last 7 days</div>
                  <div className="flex items-end gap-1 h-10">
                    {[40, 65, 50, 80, 55, 90, 70].map((h, i) => (
                      <div key={i} className="flex-1 bg-convix-500 rounded-sm opacity-80" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
                {/* Quick agent list */}
                <div className="bg-white rounded-lg border border-border p-2 flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-convix-100 flex items-center justify-center text-[9px]">🤖</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[9px] font-medium text-foreground">Support Agent</div>
                    <div className="text-[8px] text-muted-foreground">Active · Web + WhatsApp</div>
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6 bg-muted/20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-foreground mb-4">One platform for every AI agent you can imagine</h2>
            <p className="text-muted-foreground text-lg">Customer support, internal tools, personal assistants, data analysts — build any of them in minutes.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} viewport={{ once: true }}
                className="bg-white rounded-2xl border border-border p-6 hover:shadow-md transition-shadow">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${f.color}`}>
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Channels strip */}
      <section className="py-12 px-6 border-y border-border">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm text-muted-foreground mb-6">Deploy your agents on any of these channels</p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            {["💬 Web Widget", "💚 WhatsApp", "📸 Instagram", "📱 SMS", "📞 Voice", "💙 Messenger", "📧 Email", "🟨 Slack"].map(ch => (
              <span key={ch} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-default">{ch}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Built for any team, any use case</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { who: "SaaS startups", what: "Product FAQ agent + onboarding assistant embedded in-app", icon: "🚀" },
              { who: "Dev teams", what: "Internal tool agent that calls your own APIs for live data", icon: "⚙️" },
              { who: "Support teams", what: "Voice + text agent with helpdesk integration and smart handoff", icon: "🎧" },
              { who: "Agencies", what: "Multiple agents per client, white-label ready", icon: "🏢" },
              { who: "Researchers", what: "Data analysis agent with custom metrics dashboard", icon: "🔬" },
              { who: "Anyone", what: "Whatever you want — that's the point", icon: "✨" },
            ].map(u => (
              <div key={u.who} className="bg-muted/30 rounded-xl border border-border p-5">
                <div className="text-2xl mb-2">{u.icon}</div>
                <div className="font-semibold text-foreground text-sm mb-1">{u.who}</div>
                <p className="text-xs text-muted-foreground leading-relaxed">{u.what}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6 bg-muted/20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-foreground mb-4">Simple pricing</h2>
            <p className="text-muted-foreground">All plans include custom system prompts, tool connections, analytics, and smart handoff. Usage is billed in credits.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-4">
            {plans.map((plan) => (
              <div key={plan.name} className={`rounded-2xl border p-6 relative ${plan.popular ? "border-convix-500 shadow-lg shadow-convix-100 ring-1 ring-convix-500" : "border-border bg-white"}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-convix-600 text-white text-xs font-semibold rounded-full">Most Popular</div>
                )}
                <div className="font-semibold text-foreground mb-1">{plan.name}</div>
                <div className="mb-4">
                  {plan.price !== null ? (
                    <><span className="text-3xl font-bold">${plan.price}</span><span className="text-muted-foreground text-sm">/mo</span></>
                  ) : (
                    <span className="text-3xl font-bold">Custom</span>
                  )}
                </div>
                <div className="space-y-2 mb-6 text-sm text-muted-foreground">
                  <div className="flex gap-2"><Coins className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />{plan.credits}</div>
                  <div className="flex gap-2"><Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />{plan.agents}</div>
                  <div className="flex gap-2"><Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />{plan.channels}</div>
                  <div className="flex gap-2"><Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />Analytics dashboard</div>
                </div>
                <Link href="/signup" className={`block text-center py-2.5 rounded-lg text-sm font-semibold transition-colors ${plan.popular ? "bg-convix-600 text-white hover:bg-convix-700" : "bg-secondary text-foreground hover:bg-secondary/80"}`}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground mt-6">All plans include a 14-day free trial. No credit card required.</p>
        </div>
      </section>

      {/* Comparison */}
      <section id="compare" className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">How we compare</h2>
          </div>
          <div className="bg-white rounded-2xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 font-medium text-muted-foreground w-1/3">Feature</th>
                  <th className="p-4 text-center font-semibold text-convix-600">Axon AI</th>
                  <th className="p-4 text-center font-medium text-muted-foreground">Intercom</th>
                  <th className="p-4 text-center font-medium text-muted-foreground">Zipchat</th>
                  <th className="p-4 text-center font-medium text-muted-foreground">Custom Build</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((row, i) => (
                  <tr key={row.feature} className={`border-b border-border last:border-0 ${i % 2 === 0 ? "bg-muted/20" : ""}`}>
                    <td className="p-4 text-foreground font-medium">{row.feature}</td>
                    <td className="p-4 text-center"><CheckIcon val={row.axon} /></td>
                    <td className="p-4 text-center"><CheckIcon val={row.intercom} /></td>
                    <td className="p-4 text-center"><CheckIcon val={row.zipchat} /></td>
                    <td className="p-4 text-center"><CheckIcon val={row.custom} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-muted/20">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-16 h-16 rounded-2xl bg-convix-600 flex items-center justify-center mx-auto mb-6">
            <Layers className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-4">Build your first agent in minutes</h2>
          <p className="text-muted-foreground mb-8">Name it, give it a system prompt, connect a tool, and deploy — no engineering required.</p>
          <Link href="/signup" className="inline-flex items-center gap-2 px-8 py-4 bg-convix-600 text-white font-semibold rounded-xl hover:bg-convix-700 transition-colors text-base shadow-lg shadow-convix-200">
            Get started free <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-convix-600 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-foreground">Axon AI</span>
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="hover:text-foreground transition-colors">Docs</a>
          </div>
          <p className="text-sm text-muted-foreground">© 2026 Axon AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
