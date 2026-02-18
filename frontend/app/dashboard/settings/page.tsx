"use client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Save, Zap, Plus, Trash2, Tag, X, ArrowRight } from "lucide-react";
import { mockCustomFields, type CustomField } from "@/lib/mock/data";
import { cn } from "@/lib/utils";
import Link from "next/link";

// TODO: REPLACE WITH API — GET/PATCH /workspace/settings

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    timezone: "America/New_York",
    confidenceThreshold: 0.65,
    handoffDest: "live_agent",
    businessHoursStart: "09:00",
    businessHoursEnd: "18:00",
    plan: "Builder",
  });

  const [customFields, setCustomFields] = useState<CustomField[]>(mockCustomFields);
  const [taggingEnabled, setTaggingEnabled] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    setTaggingEnabled(localStorage.getItem("axon-tagging-enabled") === "true");
    const stored = localStorage.getItem("axon-available-tags");
    if (stored) setAvailableTags(JSON.parse(stored));
  }, []);

  const save = () => {
    localStorage.setItem("axon-tagging-enabled", String(taggingEnabled));
    localStorage.setItem("axon-available-tags", JSON.stringify(availableTags));
    toast.success("Settings saved!");
  };

  const addField = () => {
    setCustomFields(prev => [...prev, {
      id: `field_${Date.now()}`, label: "New Field",
      sourceEndpoint: "", field: "", showInList: true, showInDetail: true,
    }]);
  };
  const removeField = (id: string) => setCustomFields(prev => prev.filter(f => f.id !== id));
  const updateField = (id: string, key: keyof CustomField, val: unknown) =>
    setCustomFields(prev => prev.map(f => f.id === id ? { ...f, [key]: val } : f));

  const addTag = () => {
    const t = tagInput.trim();
    if (!t || availableTags.includes(t)) return;
    setAvailableTags(prev => [...prev, t]);
    setTagInput("");
  };
  const removeTag = (tag: string) => setAvailableTags(prev => prev.filter(t => t !== tag));

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Workspace-level configuration — AI behaviour, business hours, and more.</p>
      </div>

      {/* Per-agent settings nudge */}
      <div className="flex items-center gap-3 px-4 py-3 bg-convix-50 border border-convix-200 rounded-xl text-sm">
        <Zap className="w-4 h-4 text-convix-600 shrink-0" />
        <span className="text-convix-700 flex-1">To edit an agent's <strong>name, system prompt, knowledge, or voice settings</strong>, click the <strong>pencil icon</strong> on any agent card.</span>
        <Link href="/dashboard/agents" className="flex items-center gap-1 text-xs font-semibold text-convix-700 hover:text-convix-900 whitespace-nowrap">
          Go to Agents <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Plan */}
      <div className="bg-white rounded-xl border border-border p-5">
        <h3 className="font-semibold text-sm text-foreground mb-3">Workspace Plan</h3>
        <div className="flex items-center gap-2 px-3 py-2 text-sm border border-convix-200 rounded-lg bg-convix-50">
          <Zap className="w-3.5 h-3.5 text-convix-600" />
          <span className="font-medium text-convix-700">{settings.plan} Plan</span>
          <Link href="/dashboard/billing" className="ml-auto text-xs text-convix-600 underline cursor-pointer">Manage billing</Link>
        </div>
      </div>

      {/* AI Behaviour */}
      <div className="bg-white rounded-xl border border-border p-5 space-y-4">
        <h3 className="font-semibold text-sm text-foreground">AI Behaviour</h3>
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
            <option value="live_agent">Live Agent (in-dashboard)</option>
            <option value="zendesk">Zendesk</option>
            <option value="freshdesk">Freshdesk</option>
            <option value="email">Email Queue</option>
          </select>
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
        <p className="text-xs text-muted-foreground">Outside hours, the AI queues messages and responds when back online.</p>
      </div>

      {/* Custom Fields */}
      <div className="bg-white rounded-xl border border-border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm text-foreground">Custom Conversation Fields</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Pull extra data from your own endpoints into conversation views.</p>
          </div>
          <button onClick={addField}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-convix-600 text-white rounded-lg hover:bg-convix-700 transition-colors">
            <Plus className="w-3 h-3" /> Add Field
          </button>
        </div>
        {customFields.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground border border-dashed border-border rounded-xl">
            <p className="text-sm">No custom fields yet</p>
            <p className="text-xs mt-1">Click "Add Field" to pull data from your own APIs.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {customFields.map(f => (
              <div key={f.id} className="border border-border rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input value={f.label} onChange={e => updateField(f.id, "label", e.target.value)}
                    placeholder="Field label"
                    className="flex-1 px-2.5 py-1.5 text-xs border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-convix-500" />
                  <button onClick={() => removeField(f.id)} className="p-1.5 text-muted-foreground hover:text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <input value={f.sourceEndpoint} onChange={e => updateField(f.id, "sourceEndpoint", e.target.value)}
                  placeholder="Source endpoint (e.g. https://api.yourapp.com/users/{{customer_email}})"
                  className="w-full px-2.5 py-1.5 text-xs border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-convix-500 font-mono" />
                <input value={f.field} onChange={e => updateField(f.id, "field", e.target.value)}
                  placeholder="JSON field path (e.g. data.plan_name)"
                  className="w-full px-2.5 py-1.5 text-xs border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-convix-500 font-mono" />
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                    <input type="checkbox" checked={f.showInList} onChange={e => updateField(f.id, "showInList", e.target.checked)} className="accent-convix-600" />
                    Show in list
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                    <input type="checkbox" checked={f.showInDetail} onChange={e => updateField(f.id, "showInDetail", e.target.checked)} className="accent-convix-600" />
                    Show in detail
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Conversation Tagging */}
      <div className="bg-white rounded-xl border border-border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm text-foreground">Conversation Tagging</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Auto-categorise conversations using a lightweight model. Off by default.</p>
          </div>
          <button onClick={() => setTaggingEnabled(!taggingEnabled)}
            className={cn("relative rounded-full transition-colors shrink-0", taggingEnabled ? "bg-convix-600" : "bg-muted border border-border")}
            style={{ height: "22px", width: "40px" }}>
            <div className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
              taggingEnabled ? "translate-x-5" : "translate-x-0.5"
            )} />
          </button>
        </div>

        {taggingEnabled ? (
          <>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Tags</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {availableTags.map(tag => (
                  <span key={tag} className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full bg-convix-50 text-convix-700 border border-convix-200">
                    <Tag className="w-2.5 h-2.5" />
                    {tag}
                    <button onClick={() => removeTag(tag)} className="text-convix-400 hover:text-convix-700">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
                {availableTags.length === 0 && <span className="text-xs text-muted-foreground italic">No tags yet.</span>}
              </div>
              <div className="flex gap-2">
                <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addTag()}
                  placeholder="e.g. billing, onboarding, bug-report"
                  className="flex-1 px-3 py-1.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-convix-500" />
                <button onClick={addTag} className="px-3 py-1.5 text-sm bg-convix-600 text-white font-medium rounded-lg hover:bg-convix-700 transition-colors">
                  Add
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
              💡 A small classification model will assign one of these tags to each new conversation based on its content.
            </p>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">Enable to configure auto-tagging categories for your conversations.</p>
        )}
      </div>

      <button onClick={save}
        className="flex items-center gap-2 px-5 py-2.5 bg-convix-600 text-white text-sm font-medium rounded-lg hover:bg-convix-700 transition-colors">
        <Save className="w-4 h-4" /> Save Settings
      </button>
    </div>
  );
}
