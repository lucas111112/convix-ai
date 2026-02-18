"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  MessageSquare, Zap, Globe, BarChart3, Users, ShieldCheck,
  ArrowRight, Check, Star, ChevronRight, Bot, HeadphonesIcon
} from "lucide-react";

const features = [
  { icon: Globe, title: "Platform Agnostic", desc: "Works on Shopify, WooCommerce, BigCommerce, Squarespace, or any custom store. No platform lock-in.", color: "text-violet-500 bg-violet-50" },
  { icon: MessageSquare, title: "True Omnichannel", desc: "Web chat, WhatsApp, Instagram DMs, SMS, Messenger, Email — one AI brain across all channels.", color: "text-blue-500 bg-blue-50" },
  { icon: HeadphonesIcon, title: "Full Customer Support", desc: "Order tracking, returns, refunds, subscription management — handled autonomously 24/7.", color: "text-green-500 bg-green-50" },
  { icon: ShieldCheck, title: "Smart Human Handoff", desc: "Confidence-based routing escalates to humans at the right moment, with full context summary.", color: "text-orange-500 bg-orange-50" },
  { icon: BarChart3, title: "Full Analytics — Every Plan", desc: "Revenue attribution, handoff trends, top questions, channel breakdown. No feature gating.", color: "text-pink-500 bg-pink-50" },
  { icon: Users, title: "B2B Ready", desc: "Auth-aware sessions, tiered pricing visibility, account rep routing for wholesale brands.", color: "text-cyan-500 bg-cyan-50" },
];

const plans = [
  { name: "Starter", price: 19, convos: "500", channels: "Web + 1 channel", cta: "Start Free", popular: false },
  { name: "Growth", price: 49, convos: "3,000", channels: "Web + 3 channels", cta: "Start Free", popular: true },
  { name: "Scale", price: 129, convos: "15,000", channels: "All channels", cta: "Start Free", popular: false },
  { name: "Enterprise", price: null, convos: "Unlimited", channels: "All channels + SLA", cta: "Contact Us", popular: false },
];

const comparison = [
  { feature: "All eCommerce platforms", convix: true, zipchat: false, tidio: "partial", intercom: false },
  { feature: "B2B gated store support", convix: true, zipchat: false, tidio: false, intercom: "partial" },
  { feature: "Omnichannel (5+ channels)", convix: true, zipchat: false, tidio: "partial", intercom: false },
  { feature: "Full analytics every plan", convix: true, zipchat: false, tidio: false, intercom: false },
  { feature: "Confidence-based handoff", convix: true, zipchat: "partial", tidio: false, intercom: "partial" },
  { feature: "Learns from escalations", convix: true, zipchat: false, tidio: false, intercom: false },
  { feature: "SaaS businesses", convix: true, zipchat: false, tidio: "partial", intercom: true },
  { feature: "Starting price", convix: "$19/mo", zipchat: "$49/mo", tidio: "$29/mo", intercom: "$74/mo" },
];

const CheckIcon = ({ val }: { val: boolean | string }) => {
  if (val === true) return <Check className="w-4 h-4 text-green-500 mx-auto" />;
  if (val === "partial") return <span className="text-yellow-500 text-xs font-medium">Partial</span>;
  if (val === false) return <span className="text-muted-foreground">—</span>;
  return <span className="text-sm font-semibold text-foreground">{val}</span>;
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-convix-600 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-foreground">Convix AI</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <a href="#compare" className="hover:text-foreground transition-colors">Compare</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Log in</Link>
            <Link href="/dashboard" className="px-4 py-2 bg-convix-600 text-white text-sm font-medium rounded-lg hover:bg-convix-700 transition-colors flex items-center gap-1.5">
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
              <Zap className="w-3 h-3" /> Zipchat alternative for every platform
            </div>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-foreground mb-6 leading-tight">
              Sell smarter. Support faster.<br />
              <span className="text-convix-600">On every channel.</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              Convix AI handles your sales and support across 7 channels — automatically escalating to humans when confidence drops. Works on any platform, not just Shopify.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/dashboard" className="px-8 py-3.5 bg-convix-600 text-white font-semibold rounded-xl hover:bg-convix-700 transition-colors flex items-center gap-2 text-base shadow-lg shadow-convix-200">
                Start free — no card needed <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/dashboard" className="px-8 py-3.5 bg-secondary text-foreground font-semibold rounded-xl hover:bg-secondary/80 transition-colors text-base">
                View live demo →
              </Link>
            </div>
            <p className="text-xs text-muted-foreground mt-4">14-day free trial · No credit card required · Cancel anytime</p>
          </motion.div>

          {/* Dashboard Preview */}
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-16 rounded-2xl border border-border shadow-2xl overflow-hidden bg-muted/30">
            <div className="bg-muted/50 px-4 py-2 flex items-center gap-2 border-b border-border">
              <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-red-400" /><div className="w-3 h-3 rounded-full bg-yellow-400" /><div className="w-3 h-3 rounded-full bg-green-400" /></div>
              <div className="flex-1 text-center text-xs text-muted-foreground">convix.ai/dashboard</div>
            </div>
            <div className="grid grid-cols-4 h-64 text-left">
              {/* Sidebar */}
              <div className="bg-white border-r border-border p-4 space-y-1">
                <div className="flex items-center gap-2 px-2 py-1.5 bg-convix-50 text-convix-700 rounded-md text-xs font-medium">
                  <BarChart3 className="w-3.5 h-3.5" /> Overview
                </div>
                {["Conversations", "Analytics", "Channels", "Widget", "Training", "Settings"].map(item => (
                  <div key={item} className="flex items-center gap-2 px-2 py-1.5 text-muted-foreground text-xs rounded-md hover:bg-muted cursor-pointer">
                    <ChevronRight className="w-3 h-3" /> {item}
                  </div>
                ))}
              </div>
              {/* Main */}
              <div className="col-span-3 p-4 space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Conversations", value: "2,847", change: "+18%" },
                    { label: "Revenue", value: "$48,920", change: "+23%" },
                    { label: "Handoff Rate", value: "6.8%", change: "-1.2%" },
                  ].map(stat => (
                    <div key={stat.label} className="bg-white rounded-lg border border-border p-3">
                      <div className="text-xs text-muted-foreground">{stat.label}</div>
                      <div className="text-lg font-bold text-foreground">{stat.value}</div>
                      <div className="text-xs text-green-600">{stat.change}</div>
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-lg border border-border p-3">
                  <div className="text-xs font-medium text-foreground mb-2">Recent Conversations</div>
                  <div className="space-y-1.5">
                    {[
                      { name: "Emma Rodriguez", channel: "Web", status: "resolved", msg: "Thank you so much!" },
                      { name: "James Patel", channel: "WhatsApp", status: "handed_off", msg: "I want to speak to a manager" },
                      { name: "Aisha Okonkwo", channel: "Instagram", status: "active", msg: "Do you ship to Nigeria?" },
                    ].map(c => (
                      <div key={c.name} className="flex items-center justify-between text-xs">
                        <span className="font-medium text-foreground">{c.name}</span>
                        <span className="text-muted-foreground truncate max-w-32">{c.msg}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${c.status === "resolved" ? "bg-green-50 text-green-700" : c.status === "handed_off" ? "bg-orange-50 text-orange-700" : "bg-blue-50 text-blue-700"}`}>
                          {c.status.replace("_", " ")}
                        </span>
                      </div>
                    ))}
                  </div>
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
            <h2 className="text-3xl font-bold text-foreground mb-4">Everything Zipchat can't do</h2>
            <p className="text-muted-foreground text-lg">Built for the other 80% of commerce businesses they ignored.</p>
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
          <p className="text-sm text-muted-foreground mb-6">One AI brain, 7 channels</p>
          <div className="flex flex-wrap items-center justify-center gap-6 text-2xl">
            {["💬 Web", "💚 WhatsApp", "📸 Instagram", "📱 SMS", "💙 Messenger", "📧 Email", "🟨 Slack"].map(ch => (
              <span key={ch} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-default">{ch}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-foreground mb-4">Pricing that doesn't punish growth</h2>
            <p className="text-muted-foreground">Full analytics and B2B support on every plan. No gotchas.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-4">
            {plans.map((plan) => (
              <div key={plan.name} className={`rounded-2xl border p-6 relative ${plan.popular ? "border-convix-500 shadow-lg shadow-convix-100 ring-1 ring-convix-500" : "border-border"}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-convix-600 text-white text-xs font-semibold rounded-full">Most Popular</div>
                )}
                <div className="font-semibold text-foreground mb-1">{plan.name}</div>
                <div className="mb-4">
                  {plan.price ? (
                    <><span className="text-3xl font-bold">${plan.price}</span><span className="text-muted-foreground text-sm">/mo</span></>
                  ) : (
                    <span className="text-3xl font-bold">Custom</span>
                  )}
                </div>
                <div className="space-y-2 mb-6 text-sm text-muted-foreground">
                  <div className="flex gap-2"><Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />{plan.convos} conversations/mo</div>
                  <div className="flex gap-2"><Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />{plan.channels}</div>
                  <div className="flex gap-2"><Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />Full analytics</div>
                  <div className="flex gap-2"><Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />B2B support</div>
                </div>
                <Link href="/dashboard" className={`block text-center py-2.5 rounded-lg text-sm font-semibold transition-colors ${plan.popular ? "bg-convix-600 text-white hover:bg-convix-700" : "bg-secondary text-foreground hover:bg-secondary/80"}`}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground mt-6">All plans include a 14-day free trial. No credit card required.</p>
        </div>
      </section>

      {/* Comparison */}
      <section id="compare" className="py-20 px-6 bg-muted/20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">How we stack up</h2>
          </div>
          <div className="bg-white rounded-2xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 font-medium text-muted-foreground w-1/3">Feature</th>
                  <th className="p-4 text-center font-semibold text-convix-600">Convix AI</th>
                  <th className="p-4 text-center font-medium text-muted-foreground">Zipchat</th>
                  <th className="p-4 text-center font-medium text-muted-foreground">Tidio</th>
                  <th className="p-4 text-center font-medium text-muted-foreground">Intercom</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((row, i) => (
                  <tr key={row.feature} className={`border-b border-border last:border-0 ${i % 2 === 0 ? "bg-muted/20" : ""}`}>
                    <td className="p-4 text-foreground font-medium">{row.feature}</td>
                    <td className="p-4 text-center"><CheckIcon val={row.convix} /></td>
                    <td className="p-4 text-center"><CheckIcon val={row.zipchat} /></td>
                    <td className="p-4 text-center"><CheckIcon val={row.tidio} /></td>
                    <td className="p-4 text-center"><CheckIcon val={row.intercom} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="flex items-center justify-center gap-1 mb-4">
            {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />)}
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-4">Join 500+ merchants who switched</h2>
          <p className="text-muted-foreground mb-8">Start handling 90%+ of your support and sales conversations automatically — in 2 minutes.</p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 px-8 py-4 bg-convix-600 text-white font-semibold rounded-xl hover:bg-convix-700 transition-colors text-base shadow-lg shadow-convix-200">
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
            <span className="font-semibold text-foreground">Convix AI</span>
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="hover:text-foreground transition-colors">Docs</a>
          </div>
          <p className="text-sm text-muted-foreground">© 2024 Convix AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
