"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Save, AlertTriangle, Zap } from "lucide-react";

// TODO: REPLACE WITH API — GET/PATCH /stores/:id/settings

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    storeName: "My Store",
    domain: "mystore.com",
    platform: "Shopify",
    plan: "Growth",
    timezone: "America/New_York",
    brandVoice: "friendly",
    confidenceThreshold: 0.65,
    handoffDest: "zendesk",
    highValueThreshold: 200,
    businessHoursStart: "09:00",
    businessHoursEnd: "18:00",
    zendeskKey: "",
  });

  const save = () => toast.success("Settings saved!");

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your store and AI configuration.</p>
      </div>

      {/* Store Info */}
      <div className="bg-white rounded-xl border border-border p-5 space-y-4">
        <h3 className="font-semibold text-sm text-foreground">Store Details</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Store Name</label>
            <input value={settings.storeName} onChange={e => setSettings(p => ({ ...p, storeName: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-convix-500" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Domain</label>
            <input value={settings.domain} onChange={e => setSettings(p => ({ ...p, domain: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-convix-500" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Platform</label>
            <input value={settings.platform} disabled className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-muted cursor-not-allowed text-muted-foreground" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Current Plan</label>
            <div className="flex items-center gap-2 px-3 py-2 text-sm border border-convix-200 rounded-lg bg-convix-50">
              <Zap className="w-3.5 h-3.5 text-convix-600" />
              <span className="font-medium text-convix-700">{settings.plan}</span>
              <span className="ml-auto text-xs text-convix-600 underline cursor-pointer">Upgrade</span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Config */}
      <div className="bg-white rounded-xl border border-border p-5 space-y-4">
        <h3 className="font-semibold text-sm text-foreground">AI Configuration</h3>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Brand Voice</label>
          <select value={settings.brandVoice} onChange={e => setSettings(p => ({ ...p, brandVoice: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-convix-500 bg-white">
            <option value="friendly">Friendly & Warm</option>
            <option value="professional">Professional</option>
            <option value="casual">Casual</option>
            <option value="formal">Formal</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-2 block">
            Confidence Threshold: <span className="text-foreground font-semibold">{settings.confidenceThreshold}</span>
          </label>
          <input type="range" min="0.3" max="0.9" step="0.05" value={settings.confidenceThreshold}
            onChange={e => setSettings(p => ({ ...p, confidenceThreshold: parseFloat(e.target.value) }))}
            className="w-full accent-convix-600" />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>More AI answers</span><span>More human handoffs</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">AI hands off to humans when confidence drops below this threshold.</p>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Handoff Destination</label>
          <select value={settings.handoffDest} onChange={e => setSettings(p => ({ ...p, handoffDest: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-convix-500 bg-white">
            <option value="zendesk">Zendesk</option>
            <option value="gorgias">Gorgias</option>
            <option value="freshdesk">Freshdesk</option>
            <option value="email">Email Queue</option>
            <option value="live_agent">Live Agent (in-dashboard)</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">High-Value Cart Threshold (USD)</label>
          <input type="number" value={settings.highValueThreshold}
            onChange={e => setSettings(p => ({ ...p, highValueThreshold: parseInt(e.target.value) }))}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-convix-500" />
          <p className="text-xs text-muted-foreground mt-1">Conversations with carts above this value get extra-careful AI handling.</p>
        </div>
      </div>

      {/* Business Hours */}
      <div className="bg-white rounded-xl border border-border p-5 space-y-4">
        <h3 className="font-semibold text-sm text-foreground">Business Hours</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Opens at</label>
            <input type="time" value={settings.businessHoursStart}
              onChange={e => setSettings(p => ({ ...p, businessHoursStart: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-convix-500" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Closes at</label>
            <input type="time" value={settings.businessHoursEnd}
              onChange={e => setSettings(p => ({ ...p, businessHoursEnd: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-convix-500" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Outside hours, Convix AI creates a support ticket and sends the customer an ETA.</p>
      </div>

      <div className="flex items-center justify-between">
        <button onClick={save}
          className="flex items-center gap-2 px-5 py-2.5 bg-convix-600 text-white text-sm font-medium rounded-lg hover:bg-convix-700 transition-colors">
          <Save className="w-4 h-4" /> Save Settings
        </button>
        <button className="flex items-center gap-2 px-4 py-2.5 text-red-500 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors border border-red-200">
          <AlertTriangle className="w-3.5 h-3.5" /> Delete Store
        </button>
      </div>
    </div>
  );
}
