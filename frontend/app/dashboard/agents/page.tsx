"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Plus, Bot, X, FlaskConical, Trash2, Link2, FileText, Pencil, Mic,
  Eye, EyeOff, Upload, HelpCircle, Globe, Map, Play, Tag, Settings,
  Clock, ChevronRight, ExternalLink, AlertTriangle,
} from "lucide-react";
import {
  mockCustomFields,
  type Agent, type ChannelType, type KnowledgeItem, type CustomField,
} from "@/lib/mock/data";
import { cn } from "@/lib/utils";
import { authenticatedFetch } from "@/lib/auth";
import { toast } from "sonner";

// TODO: REPLACE WITH API — GET/PATCH /agents/:id

// ── Channel type mapping (frontend id ↔ backend ChannelType enum) ───────────

const CHANNEL_ID_TO_TYPE: Record<string, string> = {
  whatsapp: "WHATSAPP",
  telegram: "TELEGRAM",
  messenger: "MESSENGER",
  slack: "SLACK",
  sms_twilio: "SMS",
  voice_twilio: "VOICE",
  email: "EMAIL",
};

const TYPE_TO_CHANNEL_ID: Record<string, string> = Object.fromEntries(
  Object.entries(CHANNEL_ID_TO_TYPE).map(([k, v]) => [v, k])
);

// ── Channel definitions ─────────────────────────────────────────────────────

interface CredField { key: string; label: string; type: "text" | "password"; placeholder?: string }
interface ChannelDef {
  id: string; label: string; icon: string; description: string;
  creds: CredField[]; helperLabel?: string; helperUrl?: string;
  note?: string; voiceNote?: string; requiresVoice?: boolean;
}

const CHANNEL_DEFS: ChannelDef[] = [
  { id: "web_widget", label: "Web Widget", icon: "💬", description: "Embed your agent on any website. No credentials needed.", creds: [] },
  {
    id: "whatsapp", label: "WhatsApp Business (Meta Cloud API)", icon: "💚",
    description: "Connect via Meta Cloud API",
    creds: [
      { key: "phoneNumberId", label: "Phone Number ID", type: "text" },
      { key: "accessToken", label: "Access Token", type: "password" },
      { key: "webhookVerifyToken", label: "Webhook Verify Token", type: "password" },
    ],
    helperLabel: "Set up at developers.facebook.com → WhatsApp → Getting Started",
    helperUrl: "https://developers.facebook.com",
    note: "Requires a verified Meta Business account.",
    voiceNote: "🎙️ Voice messages supported — users can send voice memos; the agent transcribes and replies via text. For actual phone calls, use Twilio Voice.",
  },
  {
    id: "telegram", label: "Telegram Bot", icon: "✈️",
    description: "Telegram Bot API",
    creds: [{ key: "botToken", label: "Bot Token", type: "password", placeholder: "123456:ABC-DEF..." }],
    helperLabel: "Create a bot via @BotFather on Telegram (free, instant)",
    note: "Free to use. No approval process required.",
    voiceNote: "🎙️ Voice messages supported — users can send voice memos; the agent transcribes and replies via text. For actual phone calls, use Twilio Voice.",
  },
  {
    id: "messenger", label: "Facebook Messenger (Meta Graph API)", icon: "💙",
    description: "Facebook Page messaging",
    creds: [
      { key: "pageAccessToken", label: "Page Access Token", type: "password" },
      { key: "appSecret", label: "App Secret", type: "password" },
      { key: "webhookVerifyToken", label: "Webhook Verify Token", type: "password" },
    ],
    helperLabel: "Set up at developers.facebook.com → Messenger",
    helperUrl: "https://developers.facebook.com",
    note: "Requires a Facebook Page and a Meta Developer App.",
  },
  {
    id: "slack", label: "Slack Bot", icon: "🟨",
    description: "Workspace messaging for B2B and internal use",
    creds: [
      { key: "botToken", label: "Bot Token (xoxb-...)", type: "password", placeholder: "xoxb-..." },
      { key: "signingSecret", label: "Signing Secret", type: "password" },
    ],
    helperLabel: "Create a Slack App at api.slack.com/apps",
    helperUrl: "https://api.slack.com/apps",
    note: "Install the app to your workspace to get tokens.",
  },
  {
    id: "sms_twilio", label: "SMS via Twilio", icon: "📱",
    description: "Text messaging via Twilio",
    creds: [
      { key: "accountSid", label: "Account SID", type: "text" },
      { key: "authToken", label: "Auth Token", type: "password" },
      { key: "phoneNumber", label: "Twilio Phone Number", type: "text", placeholder: "+14155552671" },
    ],
    helperLabel: "Get credentials at console.twilio.com",
    note: "Requires a Twilio account. SMS is billed per message.",
  },
  {
    id: "voice_twilio", label: "Voice Calls via Twilio", icon: "📞",
    description: "Inbound & outbound voice calls via Twilio Voice",
    creds: [
      { key: "accountSid", label: "Account SID", type: "text" },
      { key: "authToken", label: "Auth Token", type: "password" },
      { key: "phoneNumber", label: "Twilio Phone Number", type: "text", placeholder: "+14155552671" },
    ],
    helperLabel: "Get credentials at console.twilio.com",
    note: "Uses Twilio Voice. Billed per minute. Configure Twilio webhook: https://api.axon.ai/v1/voice/YOUR_AGENT_ID",
    requiresVoice: true,
  },
  {
    id: "email", label: "Email via SendGrid", icon: "📧",
    description: "Handle inbound support emails automatically",
    creds: [
      { key: "apiKey", label: "SendGrid API Key", type: "password" },
      { key: "fromAddress", label: "From Address", type: "text", placeholder: "support@yourcompany.com" },
      { key: "inboundDomain", label: "Inbound Parse Domain", type: "text", placeholder: "mail.yourcompany.com" },
    ],
    helperLabel: "Configure Inbound Parse at app.sendgrid.com → Settings",
    note: "AI reads inbound emails and replies automatically via SendGrid.",
  },
];

// ── Knowledge source definitions ────────────────────────────────────────────

type KbType = KnowledgeItem["type"];

const SOURCE_TYPES: { type: KbType; icon: string; label: string; desc: string }[] = [
  { type: "text", icon: "📝", label: "Text Block", desc: "Paste or type knowledge content" },
  { type: "url", icon: "🔗", label: "URL / Web page", desc: "Scrape a URL automatically" },
  { type: "file", icon: "📄", label: "File Upload", desc: "PDF, DOCX, TXT, CSV" },
  { type: "qa", icon: "❓", label: "Q&A Pair", desc: "Question + Answer entry" },
  { type: "youtube", icon: "🎥", label: "YouTube Transcript", desc: "Paste a YouTube URL" },
  { type: "sitemap", icon: "🗺️", label: "Sitemap Crawl", desc: "Paste a sitemap.xml URL" },
];

const kbTypeIcon: Record<KbType, React.ElementType> = {
  text: FileText, url: Link2, file: Upload, qa: HelpCircle, youtube: Play, sitemap: Map,
};

const channelEmoji: Record<string, string> = {
  web: "💬", whatsapp: "💚", instagram: "📸", sms: "📱",
  messenger: "💙", email: "📧", voice: "📞", slack: "🟨",
  telegram: "✈️",
};

// Maps backend ChannelType enum → frontend display key
const BACKEND_TYPE_TO_UI: Record<string, string> = {
  WEB: "web", WHATSAPP: "whatsapp", TELEGRAM: "telegram",
  MESSENGER: "messenger", SLACK: "slack", SMS: "sms",
  VOICE: "voice", EMAIL: "email",
};

// ── Types ────────────────────────────────────────────────────────────────────

interface ChannelState { enabled: boolean; creds: Record<string, string> }

interface AgentEditForm {
  name: string; systemPrompt: string; voiceEnabled: boolean;
  ttsVoice: string; speakingSpeed: number;
  handoffEnabled: boolean; confidenceThreshold: number; handoffDest: string;
  routingPolicy: string; supportEmail: string;
  knowledge: Omit<KnowledgeItem, "id" | "createdAt">[];
  channels: Record<string, ChannelState>;
  businessHoursEnabled: boolean; businessHoursStart: string; businessHoursEnd: string;
  businessHoursClosedMessage: string;
  customFields: CustomField[]; taggingEnabled: boolean; availableTags: string[];
}

interface KbForm {
  type: KbType; title: string; content: string; url: string;
  question: string; answer: string; fileName: string;
}

interface ApiAgent {
  id: string;
  name: string;
  avatar: string;
  systemPrompt: string;
  status: "ACTIVE" | "INACTIVE" | "DRAFT";
  mode: "TEXT" | "VOICE" | "BOTH";
  createdAt: string;
  activeChannelTypes?: string[];
}

interface ApiAgentsResponse {
  agents: ApiAgent[];
}

interface ApiSingleAgentResponse {
  agent: ApiAgent;
}

function toUiAgent(agent: ApiAgent): Agent {
  return {
    id: agent.id,
    name: agent.name,
    avatar: agent.avatar || "🤖",
    systemPrompt: agent.systemPrompt,
    status: agent.status === "ACTIVE" ? "active" : "inactive",
    channels: (agent.activeChannelTypes ?? [])
      .map(t => BACKEND_TYPE_TO_UI[t])
      .filter(Boolean) as ChannelType[],
    mode: agent.mode.toLowerCase() as "text" | "voice" | "both",
    toolIds: [],
    createdAt: new Date(agent.createdAt).toISOString().slice(0, 10),
  };
}

const initChannels = (): Record<string, ChannelState> => {
  const state: Record<string, ChannelState> = {};
  for (const ch of CHANNEL_DEFS) {
    const creds: Record<string, string> = {};
    for (const c of ch.creds) creds[c.key] = "";
    state[ch.id] = { enabled: false, creds };
  }
  return state;
};

const emptyEditForm = (agent?: Agent, kb?: KnowledgeItem[]): AgentEditForm => ({
  name: agent?.name ?? "",
  systemPrompt: agent?.systemPrompt ?? "",
  voiceEnabled: agent ? (agent.mode === "voice" || agent.mode === "both") : false,
  ttsVoice: "Alloy", speakingSpeed: 1.0,
  handoffEnabled: true, confidenceThreshold: 0.65, handoffDest: "LIVE_AGENT",
  routingPolicy: "", supportEmail: "",
  knowledge: (kb ?? []).map(({ id: _id, createdAt: _c, ...rest }) => rest),
  channels: initChannels(),
  businessHoursEnabled: false, businessHoursStart: "09:00", businessHoursEnd: "18:00",
  businessHoursClosedMessage: "Thank you for reaching out! We're currently outside our business hours. We'll get back to you as soon as we're available.",
  customFields: [...mockCustomFields], taggingEnabled: false, availableTags: [],
});

const emptyKbForm = (): KbForm => ({ type: "text", title: "", content: "", url: "", question: "", answer: "", fileName: "" });

// ── Voice preview ─────────────────────────────────────────────────────────────

const VOICE_DESCRIPTIONS: Record<string, string> = {
  Alloy: "Neutral, balanced",
  Echo: "Clear, professional",
  Fable: "Warm, storytelling",
  Onyx: "Deep, authoritative",
  Nova: "Bright, friendly",
  Shimmer: "Soft, conversational",
};

function previewVoice(voiceName: string, speed: number) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const speak = (voices: SpeechSynthesisVoice[]) => {
    const utterance = new SpeechSynthesisUtterance("Hi there! I'm your AI assistant, ready to help.");
    utterance.rate = speed;
    // Pitch by voice character
    const pitchMap: Record<string, number> = { Shimmer: 1.2, Nova: 1.2, Onyx: 0.75, Fable: 1.05 };
    utterance.pitch = pitchMap[voiceName] ?? 1.0;
    // Pick a matching browser voice
    const femaleVoices = ["Nova", "Shimmer"];
    const prefer = femaleVoices.includes(voiceName) ? "female" : "male";
    const en = voices.filter(v => v.lang.startsWith("en"));
    const match = en.find(v => prefer === "female" ? /female|zira|karen|samantha|victoria|susan/i.test(v.name) : /male|david|mark|daniel|alex/i.test(v.name));
    utterance.voice = match ?? en[0] ?? null;
    window.speechSynthesis.speak(utterance);
  };
  const voices = window.speechSynthesis.getVoices();
  if (voices.length) { speak(voices); }
  else { window.speechSynthesis.onvoiceschanged = () => { speak(window.speechSynthesis.getVoices()); }; }
}

// ── Component ────────────────────────────────────────────────────────────────

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [agentsError, setAgentsError] = useState("");
  const [knowledge, setKnowledge] = useState<Record<string, KnowledgeItem[]>>({});

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createPrompt, setCreatePrompt] = useState("");
  const [createVoice, setCreateVoice] = useState(false);

  // Edit modal
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<AgentEditForm>(emptyEditForm());
  const [editTab, setEditTab] = useState<"general" | "knowledge" | "channels" | "advanced">("general");
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");

  // Knowledge sub-modal
  const [showKbModal, setShowKbModal] = useState<"create" | "edit" | null>(null);
  const [kbStep, setKbStep] = useState<"pick" | "form">("pick");
  const [kbType, setKbType] = useState<KbType>("text");
  const [kbForm, setKbForm] = useState<KbForm>(emptyKbForm());
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Channel creds show/hide
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const togglePassword = (key: string) => setShowPasswords(p => ({ ...p, [key]: !p[key] }));

  // Channel connection state
  const [connectedChannels, setConnectedChannels] = useState<Set<string>>(new Set());
  const [connectingChannel, setConnectingChannel] = useState<string | null>(null);

  // Tag input
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadAgents = async () => {
      setAgentsLoading(true);
      setAgentsError("");
      try {
        const response = await authenticatedFetch<ApiAgentsResponse>("/v1/agents", {
          method: "GET",
        });
        if (cancelled) return;
        setAgents((response.agents ?? []).map(toUiAgent));
      } catch (error) {
        if (cancelled) return;
        setAgentsError(error instanceof Error ? error.message : "Failed to load agents");
      } finally {
        if (!cancelled) {
          setAgentsLoading(false);
        }
      }
    };

    void loadAgents();

    return () => {
      cancelled = true;
    };
  }, []);

  // ── helpers ──────────────────────────────────────────────────────────────

  const openEdit = async (agent: Agent) => {
    const agentKb = knowledge[agent.id] ?? [];
    const form = emptyEditForm(agent, agentKb);

    // Try to load real channel connection state from the backend
    try {
      const res = await authenticatedFetch<{
        channels: Array<{ type: string; isConnected: boolean; hasCredentials: boolean }>;
      }>(`/v1/agents/${agent.id}/channels`);
      const connected = new Set<string>();
      for (const ch of res.channels ?? []) {
        if (ch.isConnected) {
          const frontendId = TYPE_TO_CHANNEL_ID[ch.type];
          if (frontendId) {
            form.channels[frontendId] = { ...form.channels[frontendId], enabled: true };
            connected.add(frontendId);
          }
        }
      }
      setConnectedChannels(connected);
    } catch {
      setConnectedChannels(new Set());
    }

    setEditId(agent.id);
    setEditForm(form);
    setEditTab("general");
    setDeleteConfirmInput("");
    setShowPasswords({});
  };

  const handleConnectChannel = async (channelId: string) => {
    if (!editId) return;
    const backendType = CHANNEL_ID_TO_TYPE[channelId];
    if (!backendType) { toast.error("No API credentials needed for Web Widget"); return; }
    const ch = CHANNEL_DEFS.find(c => c.id === channelId);
    if (!ch) return;
    const state = editForm.channels[channelId];
    // Validate all credential fields are filled
    const missing = ch.creds.filter(c => !state?.creds[c.key]?.trim());
    if (missing.length > 0) {
      toast.error(`Please fill in: ${missing.map(c => c.label).join(", ")}`);
      return;
    }
    setConnectingChannel(channelId);
    try {
      await authenticatedFetch(`/v1/agents/${editId}/channels/${backendType}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credentials: state.creds, isActive: true }),
      });
      toast.success(`${ch.label} connected!`);
      setConnectedChannels(prev => { const next = new Set(prev); next.add(channelId); return next; });
      // Update the agent card to show the newly connected channel
      const uiType = BACKEND_TYPE_TO_UI[backendType] as ChannelType;
      if (uiType) {
        setAgents(prev => prev.map(a => a.id === editId && !a.channels.includes(uiType)
          ? { ...a, channels: [...a.channels, uiType] } : a));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to connect channel");
    } finally {
      setConnectingChannel(null);
    }
  };

  const handleDisconnectChannel = async (channelId: string) => {
    if (!editId) return;
    const backendType = CHANNEL_ID_TO_TYPE[channelId];
    if (!backendType) return;
    const ch = CHANNEL_DEFS.find(c => c.id === channelId);
    try {
      await authenticatedFetch(`/v1/agents/${editId}/channels/${backendType}`, { method: "DELETE" });
      toast.success(`${ch?.label ?? "Channel"} disconnected`);
      setConnectedChannels(prev => { const next = new Set(prev); next.delete(channelId); return next; });
      setChannelEnabled(channelId, false);
      // Update the agent card to remove the disconnected channel
      const backendType2 = CHANNEL_ID_TO_TYPE[channelId];
      const uiType2 = backendType2 ? BACKEND_TYPE_TO_UI[backendType2] as ChannelType : null;
      if (uiType2) {
        setAgents(prev => prev.map(a => a.id === editId
          ? { ...a, channels: a.channels.filter(c => c !== uiType2) } : a));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to disconnect channel");
    }
  };

  const toggleStatus = async (id: string) => {
    const agent = agents.find(a => a.id === id);
    if (!agent) return;
    const newApiStatus = agent.status === "active" ? "INACTIVE" : "ACTIVE";
    const newUiStatus = agent.status === "active" ? "inactive" : "active";
    // Optimistic update
    setAgents(prev => prev.map(a => a.id === id ? { ...a, status: newUiStatus } : a));
    try {
      await authenticatedFetch(`/v1/agents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newApiStatus }),
      });
      toast.success(`Agent ${newUiStatus === "active" ? "enabled" : "disabled"}`);
    } catch (error) {
      // Revert on failure
      setAgents(prev => prev.map(a => a.id === id ? { ...a, status: agent.status } : a));
      toast.error("Failed to update agent status");
    }
  };

  const createAgent = async () => {
    if (!createName.trim()) { toast.error("Agent name is required"); return; }
    if (!createPrompt.trim()) { toast.error("System prompt is required"); return; }
    try {
      const payload = await authenticatedFetch<ApiSingleAgentResponse>("/v1/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createName,
          systemPrompt: createPrompt,
          mode: createVoice ? "BOTH" : "TEXT",
        }),
      });
      const newAgent = toUiAgent(payload.agent);
      setAgents(prev => [newAgent, ...prev]);
      setShowCreate(false);
      setCreateName("");
      setCreatePrompt("");
      setCreateVoice(false);
      toast.success(`Agent "${newAgent.name}" created! Opening settings…`);
      // Immediately open the full edit modal so the user can configure all settings
      openEdit(newAgent);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create agent");
    }
  };

  const saveEdit = async () => {
    if (!editId) return;
    if (!editForm.name.trim()) { toast.error("Agent name is required"); return; }
    if (!editForm.systemPrompt.trim()) { toast.error("System prompt is required"); return; }
    try {
      // Build business hours JSON for the backend
      const businessHours = editForm.businessHoursEnabled ? {
        enabled: true,
        timezone: "UTC",
        closedMessage: editForm.businessHoursClosedMessage,
        schedule: {
          monday: { open: editForm.businessHoursStart, close: editForm.businessHoursEnd, enabled: true },
          tuesday: { open: editForm.businessHoursStart, close: editForm.businessHoursEnd, enabled: true },
          wednesday: { open: editForm.businessHoursStart, close: editForm.businessHoursEnd, enabled: true },
          thursday: { open: editForm.businessHoursStart, close: editForm.businessHoursEnd, enabled: true },
          friday: { open: editForm.businessHoursStart, close: editForm.businessHoursEnd, enabled: true },
          saturday: { open: "09:00", close: "17:00", enabled: false },
          sunday: { open: "09:00", close: "17:00", enabled: false },
        },
      } : { enabled: false };

      await authenticatedFetch(`/v1/agents/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          systemPrompt: editForm.systemPrompt,
          mode: editForm.voiceEnabled ? "BOTH" : "TEXT",
          handoffEnabled: editForm.handoffEnabled,
          handoffThreshold: editForm.confidenceThreshold,
          handoffDest: editForm.handoffDest,
          routingPolicy: editForm.routingPolicy,
          supportEmail: editForm.supportEmail,
          taggingEnabled: editForm.taggingEnabled,
          availableTags: editForm.availableTags,
          businessHours,
        }),
      });
      setAgents(prev => prev.map(a => a.id === editId ? {
        ...a,
        name: editForm.name,
        systemPrompt: editForm.systemPrompt,
        mode: editForm.voiceEnabled ? "both" : "text",
      } : a));
      setKnowledge(prev => ({
        ...prev,
        [editId]: editForm.knowledge.map((k, i) => ({ ...k, id: `kb_${Date.now()}_${i}`, createdAt: new Date().toISOString().split("T")[0] })),
      }));
      setEditId(null);
      toast.success("Agent saved!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save agent");
    }
  };

  const deleteAgent = async () => {
    if (!editId) return;
    const agent = agents.find(a => a.id === editId);
    if (deleteConfirmInput !== agent?.name) { toast.error("Name doesn't match"); return; }
    try {
      await authenticatedFetch(`/v1/agents/${editId}`, { method: "DELETE" });
      setAgents(prev => prev.filter(a => a.id !== editId));
      setEditId(null);
      setConnectedChannels(new Set());
      toast.success(`Agent "${agent?.name}" deleted`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete agent");
    }
  };

  // ── Knowledge helpers ──────────────────────────────────────────────────

  const extractYoutubeId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    return match?.[1] ?? null;
  };

  const getDomain = (url: string) => { try { return new URL(url).hostname; } catch { return url; } };

  const handleFileSelect = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!["pdf", "docx", "txt", "csv"].includes(ext)) {
      toast.error("Unsupported file type. Use PDF, DOCX, TXT, or CSV."); return;
    }
    setKbForm(p => ({ ...p, fileName: file.name, title: file.name }));
    toast.success(`"${file.name}" selected`);
  };

  const buildKbItem = (): Omit<KnowledgeItem, "id" | "createdAt"> | null => {
    switch (kbType) {
      case "text":
        if (!kbForm.title.trim() || !kbForm.content.trim()) { toast.error("Title and content are required"); return null; }
        return { type: "text", title: kbForm.title, content: kbForm.content };
      case "url":
        if (!kbForm.title.trim() || !kbForm.url.trim()) { toast.error("Title and URL are required"); return null; }
        return { type: "url", title: kbForm.title, url: kbForm.url };
      case "file":
        if (!kbForm.fileName) { toast.error("Please select a file"); return null; }
        return { type: "file", title: kbForm.title || kbForm.fileName, fileName: kbForm.fileName };
      case "qa": {
        if (!kbForm.question.trim() || !kbForm.answer.trim()) { toast.error("Question and answer are required"); return null; }
        const title = kbForm.question.slice(0, 55) + (kbForm.question.length > 55 ? "…" : "");
        return { type: "qa", title, question: kbForm.question, answer: kbForm.answer };
      }
      case "youtube": {
        const videoId = extractYoutubeId(kbForm.url);
        if (!videoId) { toast.error("Invalid YouTube URL"); return null; }
        return { type: "youtube", title: `YouTube: ${videoId}`, url: kbForm.url };
      }
      case "sitemap": {
        if (!kbForm.url.trim()) { toast.error("Sitemap URL is required"); return null; }
        const domain = getDomain(kbForm.url);
        const n = Math.floor(Math.random() * 33) + 8;
        return { type: "sitemap", title: `${domain} sitemap (${n} pages)`, url: kbForm.url };
      }
    }
  };

  const addKbItem = (target: "create" | "edit") => {
    const item = buildKbItem();
    if (!item) return;
    if (kbType === "file") toast.success("File uploaded and indexed!");
    if (kbType === "youtube") toast.success("Transcript extracted!");
    if (kbType === "sitemap") toast.success("Sitemap crawled!");
    if (target === "edit") setEditForm(p => ({ ...p, knowledge: [...p.knowledge, item] }));
    setKbForm(emptyKbForm()); setKbStep("pick"); setShowKbModal(null);
  };

  const removeKbItem = (target: "edit", idx: number) => {
    if (target === "edit") setEditForm(p => ({ ...p, knowledge: p.knowledge.filter((_, i) => i !== idx) }));
  };

  const setChannelEnabled = (id: string, val: boolean) =>
    setEditForm(p => ({ ...p, channels: { ...p.channels, [id]: { ...p.channels[id], enabled: val } } }));

  const setChannelCred = (id: string, key: string, val: string) =>
    setEditForm(p => ({ ...p, channels: { ...p.channels, [id]: { ...p.channels[id], creds: { ...p.channels[id].creds, [key]: val } } } }));

  const addCustomField = () =>
    setEditForm(p => ({ ...p, customFields: [...p.customFields, { id: `cf_${Date.now()}`, label: "New Field", sourceEndpoint: "", field: "", showInList: true, showInDetail: true }] }));

  const removeCustomField = (id: string) =>
    setEditForm(p => ({ ...p, customFields: p.customFields.filter(f => f.id !== id) }));

  const updateCustomField = (id: string, key: keyof CustomField, val: unknown) =>
    setEditForm(p => ({ ...p, customFields: p.customFields.map(f => f.id === id ? { ...f, [key]: val } : f) }));

  const addTag = () => {
    const t = tagInput.trim();
    if (!t || editForm.availableTags.includes(t)) return;
    setEditForm(p => ({ ...p, availableTags: [...p.availableTags, t] }));
    setTagInput("");
  };

  const removeTag = (tag: string) =>
    setEditForm(p => ({ ...p, availableTags: p.availableTags.filter(t => t !== tag) }));

  // ── Render ────────────────────────────────────────────────────────────────

  const currentAgent = agents.find(a => a.id === editId);

  const TABS = ["general", "knowledge", "channels", "advanced"] as const;
  type EditTab = typeof TABS[number];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Agents</h1>
          <p className="text-sm text-muted-foreground">{agents.length} agent{agents.length !== 1 ? "s" : ""} in your workspace</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-convix-600 text-white text-sm font-medium rounded-lg hover:bg-convix-700 transition-colors">
          <Plus className="w-4 h-4" /> Create Agent
        </button>
      </div>

      {/* Agent cards */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {agentsError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm md:col-span-2 xl:col-span-3">
            {agentsError}
          </div>
        ) : agentsLoading ? (
          <div className="rounded-xl border border-border bg-white text-muted-foreground px-4 py-3 text-sm md:col-span-2 xl:col-span-3">
            Loading agents...
          </div>
        ) : agents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-white text-muted-foreground px-4 py-3 text-sm md:col-span-2 xl:col-span-3">
            No agents found. Create one to test your workflows.
          </div>
        ) : agents.map(agent => {
          const agentKb = knowledge[agent.id] ?? [];
          const hasVoice = agent.mode === "voice" || agent.mode === "both";
          return (
            <div key={agent.id} className={cn("bg-white rounded-xl border p-5 flex flex-col gap-4 transition-all hover:shadow-sm",
              agent.status === "active" ? "border-convix-200" : "border-border"
            )}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold text-foreground text-sm truncate">{agent.name}</div>
                  <div className={cn("flex items-center gap-1.5 text-xs mt-0.5", agent.status === "active" ? "text-green-600" : "text-muted-foreground")}>
                    <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", agent.status === "active" ? "bg-green-500 animate-pulse" : "bg-muted-foreground/50")} />
                    {agent.status === "active" ? "Active" : "Inactive"}
                    {hasVoice && <span className="ml-1 flex items-center gap-0.5 text-convix-500"><Mic className="w-2.5 h-2.5" />voice</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => openEdit(agent)} title="Edit agent"
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => toggleStatus(agent.id)}
                    className={cn("relative rounded-full transition-colors", agent.status === "active" ? "bg-convix-600" : "bg-muted border border-border")}
                    style={{ height: "22px", width: "40px" }}>
                    <div className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                      agent.status === "active" ? "translate-x-5" : "translate-x-0.5"
                    )} />
                  </button>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{agent.systemPrompt}</p>

              <div className="flex flex-wrap gap-1.5">
                {agent.channels.map(ch => (
                  <span key={ch} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {channelEmoji[ch]} {ch}
                  </span>
                ))}
                {agent.channels.length === 0 && <span className="text-xs text-muted-foreground italic">No channels connected</span>}
              </div>

              {agentKb.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {agentKb.map(kb => {
                    const KbIcon = kbTypeIcon[kb.type] ?? FileText;
                    return (
                      <span key={kb.id} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-convix-50 text-convix-700 border border-convix-100">
                        <KbIcon className="w-2.5 h-2.5" />{kb.title}
                      </span>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center gap-2 border-t border-border pt-3 mt-auto">
                <Link href={`/dashboard/agents/${agent.id}/test`}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-convix-600 text-white rounded-lg hover:bg-convix-700 transition-colors">
                  <FlaskConical className="w-3.5 h-3.5" /> Test Agent
                </Link>
                <span className="ml-auto text-[10px] text-muted-foreground">{agent.createdAt}</span>
              </div>
            </div>
          );
        })}

        <button onClick={() => setShowCreate(true)}
          className="flex flex-col items-center justify-center gap-3 bg-muted/30 border border-dashed border-border rounded-xl p-8 hover:bg-muted/50 hover:border-convix-300 transition-all text-muted-foreground hover:text-convix-600 group">
          <div className="w-12 h-12 rounded-xl bg-muted group-hover:bg-convix-50 flex items-center justify-center transition-colors">
            <Plus className="w-6 h-6" />
          </div>
          <div className="text-sm font-medium">Create new agent</div>
          <div className="text-xs text-center">Any use case — customer support, internal tools, assistants, and more.</div>
        </button>
      </div>

      {/* ── Create Modal ──────────────────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-border shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Create Agent</h2>
              <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Agent Name</label>
                <input value={createName} onChange={e => setCreateName(e.target.value)}
                  placeholder="e.g. Aria, SupportBot, DataHelper"
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-convix-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">System Prompt</label>
                <textarea value={createPrompt} onChange={e => setCreatePrompt(e.target.value)} rows={4}
                  placeholder="You are [name], a helpful assistant for [purpose]..."
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-convix-500 resize-none font-mono" />
              </div>
              <div className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-border bg-muted/20">
                <div className="flex items-center gap-2">
                  <Mic className="w-3.5 h-3.5 text-muted-foreground" />
                  <div>
                    <div className="text-xs font-medium text-foreground">Voice / Call mode</div>
                    <div className="text-[10px] text-muted-foreground">Enable for voice & call deployments</div>
                  </div>
                </div>
                <button onClick={() => setCreateVoice(p => !p)}
                  className={cn("relative rounded-full transition-colors shrink-0", createVoice ? "bg-convix-600" : "bg-muted border border-border")}
                  style={{ height: "22px", width: "40px" }}>
                  <div className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform", createVoice ? "translate-x-5" : "translate-x-0.5")} />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
              <button onClick={createAgent} className="flex items-center gap-2 px-4 py-2 bg-convix-600 text-white text-sm font-medium rounded-lg hover:bg-convix-700">
                <Bot className="w-4 h-4" /> Create Agent
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal (4 tabs) ───────────────────────────────────────────────── */}
      {editId && currentAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-border shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <h2 className="font-semibold text-foreground">Edit: {currentAgent.name}</h2>
              <button onClick={() => { setEditId(null); setConnectedChannels(new Set()); }} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border shrink-0">
              {TABS.map(tab => (
                <button key={tab} onClick={() => setEditTab(tab as EditTab)}
                  className={cn("px-5 py-2.5 text-xs font-medium capitalize transition-colors border-b-2",
                    editTab === tab ? "border-convix-600 text-convix-700 bg-convix-50/50" : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  )}>{tab}</button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto">

              {/* ── Tab 1: General ───────────────────────────────────────── */}
              {editTab === "general" && (
                <div className="px-6 py-5 space-y-5">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Agent Name</label>
                    <input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="e.g. Aria, SupportBot"
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-convix-500" />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">System Prompt</label>
                    <textarea value={editForm.systemPrompt} onChange={e => setEditForm(p => ({ ...p, systemPrompt: e.target.value }))}
                      rows={6} placeholder="You are [name], a helpful assistant..."
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-convix-500 resize-none font-mono" />
                  </div>

                  {/* Voice toggle */}
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-border bg-muted/20">
                    <div className="flex items-center gap-2">
                      <Mic className="w-3.5 h-3.5 text-muted-foreground" />
                      <div>
                        <div className="text-xs font-medium text-foreground">Voice / Call mode</div>
                        <div className="text-[10px] text-muted-foreground">Enable for voice & call channel deployments</div>
                      </div>
                    </div>
                    <button onClick={() => setEditForm(p => ({ ...p, voiceEnabled: !p.voiceEnabled }))}
                      className={cn("relative rounded-full transition-colors shrink-0", editForm.voiceEnabled ? "bg-convix-600" : "bg-muted border border-border")}
                      style={{ height: "22px", width: "40px" }}>
                      <div className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform", editForm.voiceEnabled ? "translate-x-5" : "translate-x-0.5")} />
                    </button>
                  </div>

                  {/* TTS settings (voice only) */}
                  {editForm.voiceEnabled && (
                    <div className="space-y-3 pl-3 border-l-2 border-convix-200">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">TTS Voice</label>
                        <div className="flex items-center gap-2">
                          <select value={editForm.ttsVoice} onChange={e => setEditForm(p => ({ ...p, ttsVoice: e.target.value }))}
                            className="flex-1 px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-convix-500 bg-white">
                            {["Alloy", "Echo", "Fable", "Onyx", "Nova", "Shimmer"].map(v => (
                              <option key={v} value={v}>{v}</option>
                            ))}
                          </select>
                          <button onClick={() => previewVoice(editForm.ttsVoice, editForm.speakingSpeed)}
                            title="Preview voice"
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-convix-300 text-convix-700 rounded-lg hover:bg-convix-50 transition-colors shrink-0">
                            <Play className="w-3 h-3" /> Preview
                          </button>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">{VOICE_DESCRIPTIONS[editForm.ttsVoice]}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-2 block">
                          Speaking Speed: <span className="text-foreground font-semibold">{editForm.speakingSpeed}×</span>
                        </label>
                        <input type="range" min="0.5" max="2.0" step="0.1" value={editForm.speakingSpeed}
                          onChange={e => setEditForm(p => ({ ...p, speakingSpeed: parseFloat(e.target.value) }))}
                          className="w-full accent-convix-600" />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>0.5× slow</span><span>2.0× fast</span></div>
                      </div>
                    </div>
                  )}

                  {/* Route to Human Agent toggle */}
                  <div className="border border-border rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2.5 bg-muted/20">
                      <div>
                        <div className="text-xs font-medium text-foreground">Route to Human Agent</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">When off, the AI never escalates — it handles everything.</div>
                      </div>
                      <button onClick={() => setEditForm(p => ({ ...p, handoffEnabled: !p.handoffEnabled }))}
                        className={cn("relative rounded-full transition-colors shrink-0", editForm.handoffEnabled ? "bg-convix-600" : "bg-muted border border-border")}
                        style={{ height: "22px", width: "40px" }}>
                        <div className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform", editForm.handoffEnabled ? "translate-x-5" : "translate-x-0.5")} />
                      </button>
                    </div>
                    {editForm.handoffEnabled && (
                      <div className="px-3 py-3 border-t border-border space-y-3">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-2 block">
                            Confidence Threshold: <span className="text-foreground font-semibold">{editForm.confidenceThreshold}</span>
                          </label>
                          <input type="range" min="0.3" max="0.9" step="0.05" value={editForm.confidenceThreshold}
                            onChange={e => setEditForm(p => ({ ...p, confidenceThreshold: parseFloat(e.target.value) }))}
                            className="w-full accent-convix-600" />
                          <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>More AI answers</span><span>More human handoffs</span></div>
                          <p className="text-xs text-muted-foreground mt-1">AI hands off when confidence drops below this value.</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">Routing Policy</label>
                          <textarea value={editForm.routingPolicy}
                            onChange={e => setEditForm(p => ({ ...p, routingPolicy: e.target.value }))}
                            rows={3} placeholder="Describe when and how to route to a human. e.g. Always escalate billing disputes. If a customer is angry, route immediately..."
                            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-convix-500 resize-none" />
                          <p className="text-[10px] text-muted-foreground mt-1">This policy is injected into the agent's system prompt. Be specific.</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">Support Email</label>
                          <input type="email" value={editForm.supportEmail}
                            onChange={e => setEditForm(p => ({ ...p, supportEmail: e.target.value }))}
                            placeholder="support@yourcompany.com"
                            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-convix-500" />
                          <p className="text-[10px] text-muted-foreground mt-1">The AI will tell customers to email this address when routing to a human.</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">Handoff Destination</label>
                          <select value={editForm.handoffDest} onChange={e => setEditForm(p => ({ ...p, handoffDest: e.target.value }))}
                            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-convix-500 bg-white">
                            <option value="LIVE_AGENT">Live Agent (in-dashboard)</option>
                            <option value="ZENDESK">Zendesk</option>
                            <option value="FRESHDESK">Freshdesk</option>
                            <option value="GORGIAS">Gorgias</option>
                            <option value="EMAIL_QUEUE">Email Queue</option>
                            <option value="NONE">None (AI only)</option>
                          </select>
                          <p className="text-[10px] text-muted-foreground mt-1">Where handoffs are routed in the backend (Zendesk, Freshdesk, etc.).</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Danger zone */}
                  <div className="border border-red-200 rounded-xl p-4 space-y-3 bg-red-50/40">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <span className="text-sm font-semibold text-red-700">Danger Zone</span>
                    </div>
                    <p className="text-xs text-red-600">Type the agent name <strong>{currentAgent.name}</strong> to confirm deletion.</p>
                    <input value={deleteConfirmInput} onChange={e => setDeleteConfirmInput(e.target.value)}
                      placeholder={currentAgent.name}
                      className="w-full px-3 py-2 text-sm border border-red-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 bg-white" />
                    <button onClick={deleteAgent}
                      disabled={deleteConfirmInput !== currentAgent.name}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                      <Trash2 className="w-3.5 h-3.5" /> Delete Agent Permanently
                    </button>
                  </div>
                </div>
              )}

              {/* ── Tab 2: Knowledge ─────────────────────────────────────── */}
              {editTab === "knowledge" && (
                <div className="px-6 py-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Knowledge Sources</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">What your agent knows and can reference.</p>
                    </div>
                    <button onClick={() => { setKbStep("pick"); setKbForm(emptyKbForm()); setShowKbModal("edit"); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-convix-600 text-white rounded-lg hover:bg-convix-700 transition-colors">
                      <Plus className="w-3 h-3" /> Add Knowledge
                    </button>
                  </div>
                  {editForm.knowledge.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border border-dashed border-border rounded-xl">
                      <p className="text-sm">No knowledge added yet.</p>
                      <p className="text-xs mt-1">Click "Add Knowledge" to get started.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {editForm.knowledge.map((k, i) => {
                        const KbIcon = kbTypeIcon[k.type] ?? FileText;
                        const src = SOURCE_TYPES.find(s => s.type === k.type);
                        return (
                          <div key={i} className="flex items-center gap-3 px-3 py-2.5 bg-muted/40 rounded-lg border border-border">
                            <span className="text-base shrink-0">{src?.icon ?? "📄"}</span>
                            <KbIcon className="w-3.5 h-3.5 text-convix-600 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs text-foreground font-medium truncate">{k.title}</div>
                              <div className="text-[10px] text-muted-foreground">{src?.label ?? k.type}</div>
                            </div>
                            <button onClick={() => removeKbItem("edit", i)}
                              className="p-1 text-muted-foreground hover:text-red-500 transition-colors shrink-0">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── Tab 3: Channels ──────────────────────────────────────── */}
              {editTab === "channels" && (
                <div className="px-6 py-5 space-y-3">
                  <div className="mb-2">
                    <h3 className="text-sm font-semibold text-foreground">Connected Channels</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Toggle a channel on to see its configuration.</p>
                  </div>
                  {CHANNEL_DEFS.filter(ch => !ch.requiresVoice || editForm.voiceEnabled).map(ch => {
                    const state = editForm.channels[ch.id];
                    return (
                      <div key={ch.id} className={cn("border rounded-xl overflow-hidden transition-all",
                        state?.enabled ? "border-convix-200" : "border-border"
                      )}>
                        {/* Channel row */}
                        <div className="flex items-center gap-3 px-4 py-3">
                          <span className="text-xl shrink-0">{ch.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-foreground">{ch.label}</div>
                            <div className="text-xs text-muted-foreground truncate">{ch.description}</div>
                          </div>
                          <button onClick={() => {
                            setChannelEnabled(ch.id, !state?.enabled);
                            if (!state?.enabled && ch.id !== "web_widget") toast.success(`${ch.label} enabled`);
                          }}
                            className={cn("relative rounded-full transition-colors shrink-0", state?.enabled ? "bg-convix-600" : "bg-muted border border-border")}
                            style={{ height: "22px", width: "40px" }}>
                            <div className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                              state?.enabled ? "translate-x-5" : "translate-x-0.5"
                            )} />
                          </button>
                        </div>

                        {/* Expanded config */}
                        {state?.enabled && (
                          <div className="px-4 pb-4 border-t border-border bg-muted/20 space-y-3 pt-3">
                            {ch.id === "web_widget" ? (
                              <div className="flex items-center gap-2 text-xs text-convix-700">
                                <Globe className="w-3.5 h-3.5" />
                                <span>Embed your agent on any website —</span>
                                <a href="/dashboard/widget" className="underline font-medium flex items-center gap-0.5">
                                  go to Widget Builder <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            ) : (
                              <>
                                {/* Connected badge */}
                                {connectedChannels.has(ch.id) && (
                                  <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                                    <div className="w-2 h-2 rounded-full bg-green-500" />
                                    <span className="text-xs text-green-700 font-medium">Connected to this agent</span>
                                  </div>
                                )}
                                {ch.creds.map(c => {
                                  const pk = `${ch.id}_${c.key}`;
                                  const shown = showPasswords[pk];
                                  return (
                                    <div key={c.key}>
                                      <label className="text-xs font-medium text-muted-foreground mb-1 block">{c.label}</label>
                                      <div className="relative">
                                        <input
                                          type={c.type === "password" && !shown ? "password" : "text"}
                                          value={state.creds[c.key] ?? ""}
                                          onChange={e => setChannelCred(ch.id, c.key, e.target.value)}
                                          placeholder={connectedChannels.has(ch.id) && !state.creds[c.key] ? "(already saved — enter a new value to update)" : c.placeholder}
                                          className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-convix-500 bg-white pr-9" />
                                        {c.type === "password" && (
                                          <button type="button" onClick={() => togglePassword(pk)}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                            {shown ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                                {ch.helperLabel && (
                                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <ChevronRight className="w-3 h-3 shrink-0" /> {ch.helperLabel}
                                  </p>
                                )}
                                {ch.note && (
                                  <p className="text-[10px] text-muted-foreground bg-muted/40 px-3 py-2 rounded-lg">{ch.note}</p>
                                )}
                                {ch.voiceNote && (
                                  <p className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 px-3 py-2 rounded-lg">{ch.voiceNote}</p>
                                )}
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleConnectChannel(ch.id)}
                                    disabled={connectingChannel === ch.id}
                                    className="px-3 py-1.5 text-xs bg-convix-600 text-white font-medium rounded-lg hover:bg-convix-700 transition-colors disabled:opacity-50">
                                    {connectingChannel === ch.id
                                      ? "Connecting…"
                                      : connectedChannels.has(ch.id) ? "Update credentials" : "Connect channel"}
                                  </button>
                                  {connectedChannels.has(ch.id) && (
                                    <button
                                      onClick={() => handleDisconnectChannel(ch.id)}
                                      className="px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                                      Disconnect
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── Tab 4: Advanced ──────────────────────────────────────── */}
              {editTab === "advanced" && (
                <div className="px-6 py-5 space-y-6">
                  {/* Business hours */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <h3 className="text-sm font-semibold text-foreground">Business Hours</h3>
                          <p className="text-xs text-muted-foreground">Outside hours, the agent responds with a premade message.</p>
                        </div>
                      </div>
                      <button onClick={() => setEditForm(p => ({ ...p, businessHoursEnabled: !p.businessHoursEnabled }))}
                        className={cn("relative rounded-full transition-colors shrink-0", editForm.businessHoursEnabled ? "bg-convix-600" : "bg-muted border border-border")}
                        style={{ height: "22px", width: "40px" }}>
                        <div className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform", editForm.businessHoursEnabled ? "translate-x-5" : "translate-x-0.5")} />
                      </button>
                    </div>
                    {editForm.businessHoursEnabled && (
                      <div className="space-y-3 pl-3 border-l-2 border-convix-200">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Opens at (Mon–Fri)</label>
                            <input type="time" value={editForm.businessHoursStart}
                              onChange={e => setEditForm(p => ({ ...p, businessHoursStart: e.target.value }))}
                              className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-convix-500" />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Closes at (Mon–Fri)</label>
                            <input type="time" value={editForm.businessHoursEnd}
                              onChange={e => setEditForm(p => ({ ...p, businessHoursEnd: e.target.value }))}
                              className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-convix-500" />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">Closed message</label>
                          <textarea value={editForm.businessHoursClosedMessage}
                            onChange={e => setEditForm(p => ({ ...p, businessHoursClosedMessage: e.target.value }))}
                            rows={2}
                            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-convix-500 resize-none" />
                          <p className="text-[10px] text-muted-foreground mt-1">Sent automatically when a customer messages outside business hours.</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Custom fields */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Settings className="w-4 h-4 text-muted-foreground" />
                        <h3 className="text-sm font-semibold text-foreground">Custom Conversation Fields</h3>
                      </div>
                      <button onClick={addCustomField}
                        className="flex items-center gap-1 text-xs text-convix-600 hover:text-convix-700 font-medium">
                        <Plus className="w-3 h-3" /> Add Field
                      </button>
                    </div>
                    {editForm.customFields.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-3 text-center border border-dashed border-border rounded-lg">No custom fields. Click "Add Field" to pull data from your own APIs.</p>
                    ) : (
                      <div className="space-y-2">
                        {editForm.customFields.map(f => (
                          <div key={f.id} className="border border-border rounded-lg p-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <input value={f.label} onChange={e => updateCustomField(f.id, "label", e.target.value)}
                                placeholder="Field label"
                                className="flex-1 px-2.5 py-1.5 text-xs border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-convix-500" />
                              <button onClick={() => removeCustomField(f.id)} className="p-1 text-muted-foreground hover:text-red-500">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <input value={f.sourceEndpoint} onChange={e => updateCustomField(f.id, "sourceEndpoint", e.target.value)}
                              placeholder="Source endpoint (e.g. https://api.yourapp.com/users/{{customer_email}})"
                              className="w-full px-2.5 py-1.5 text-xs border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-convix-500 font-mono" />
                            <input value={f.field} onChange={e => updateCustomField(f.id, "field", e.target.value)}
                              placeholder="JSON field path (e.g. data.plan_name)"
                              className="w-full px-2.5 py-1.5 text-xs border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-convix-500 font-mono" />
                            <div className="flex items-center gap-4">
                              <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                                <input type="checkbox" checked={f.showInList} onChange={e => updateCustomField(f.id, "showInList", e.target.checked)} className="accent-convix-600" />
                                Show in list
                              </label>
                              <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                                <input type="checkbox" checked={f.showInDetail} onChange={e => updateCustomField(f.id, "showInDetail", e.target.checked)} className="accent-convix-600" />
                                Show in detail
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Conversation tagging */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <h3 className="text-sm font-semibold text-foreground">Conversation Tagging</h3>
                          <p className="text-xs text-muted-foreground">Auto-categorise conversations using a lightweight model.</p>
                          <p className="text-[10px] text-amber-600 mt-0.5 font-medium">⚡ Auto-tagging costs additional credits per conversation.</p>
                        </div>
                      </div>
                      <button onClick={() => setEditForm(p => ({ ...p, taggingEnabled: !p.taggingEnabled }))}
                        className={cn("relative rounded-full transition-colors shrink-0", editForm.taggingEnabled ? "bg-convix-600" : "bg-muted border border-border")}
                        style={{ height: "22px", width: "40px" }}>
                        <div className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform", editForm.taggingEnabled ? "translate-x-5" : "translate-x-0.5")} />
                      </button>
                    </div>
                    {editForm.taggingEnabled && (
                      <div className="space-y-3 pl-3 border-l-2 border-convix-200">
                        <div className="flex flex-wrap gap-2">
                          {editForm.availableTags.map(tag => (
                            <span key={tag} className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full bg-convix-50 text-convix-700 border border-convix-200">
                              {tag}
                              <button onClick={() => removeTag(tag)} className="text-convix-400 hover:text-convix-700"><X className="w-2.5 h-2.5" /></button>
                            </span>
                          ))}
                          {editForm.availableTags.length === 0 && <span className="text-xs text-muted-foreground italic">No tags yet.</span>}
                        </div>
                        <div className="flex gap-2">
                          <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && addTag()}
                            placeholder="e.g. billing, onboarding, bug-report"
                            className="flex-1 px-3 py-1.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-convix-500" />
                          <button onClick={addTag} className="px-3 py-1.5 text-sm bg-convix-600 text-white font-medium rounded-lg hover:bg-convix-700 transition-colors">Add</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border shrink-0">
              <button onClick={() => { setEditId(null); setConnectedChannels(new Set()); }} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
              <button onClick={saveEdit} className="px-4 py-2 bg-convix-600 text-white text-sm font-medium rounded-lg hover:bg-convix-700">Save changes</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Knowledge sub-modal ───────────────────────────────────────────────── */}
      {showKbModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-border shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
              <h3 className="font-semibold text-sm text-foreground">
                {kbStep === "pick" ? "Add Knowledge" : `Add: ${SOURCE_TYPES.find(s => s.type === kbType)?.label}`}
              </h3>
              <button onClick={() => { setShowKbModal(null); setKbStep("pick"); }} className="p-1 rounded-md hover:bg-muted">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {kbStep === "pick" ? (
              <div className="p-5">
                <div className="grid grid-cols-2 gap-2">
                  {SOURCE_TYPES.map(s => (
                    <button key={s.type}
                      onClick={() => { setKbType(s.type); setKbStep("form"); setKbForm(emptyKbForm()); }}
                      className="flex items-start gap-3 p-3 rounded-xl border border-border hover:border-convix-300 hover:bg-convix-50 transition-all text-left group">
                      <span className="text-xl shrink-0">{s.icon}</span>
                      <div>
                        <div className="text-xs font-semibold text-foreground group-hover:text-convix-700">{s.label}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{s.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="px-5 py-4 space-y-3">
                {/* Back button */}
                <button onClick={() => setKbStep("pick")} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  ← Back
                </button>

                {kbType === "text" && (
                  <>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Title</label>
                      <input value={kbForm.title} onChange={e => setKbForm(p => ({ ...p, title: e.target.value }))}
                        placeholder="e.g. Company Overview"
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-convix-500" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Content</label>
                      <textarea value={kbForm.content} onChange={e => setKbForm(p => ({ ...p, content: e.target.value }))}
                        rows={5} placeholder="Paste your knowledge content here..."
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-convix-500 resize-none" />
                    </div>
                  </>
                )}

                {kbType === "url" && (
                  <>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Title</label>
                      <input value={kbForm.title} onChange={e => setKbForm(p => ({ ...p, title: e.target.value }))}
                        placeholder="e.g. API Documentation"
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-convix-500" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">URL</label>
                      <input value={kbForm.url} onChange={e => setKbForm(p => ({ ...p, url: e.target.value }))}
                        placeholder="https://docs.example.com/..."
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-convix-500" />
                    </div>
                  </>
                )}

                {kbType === "file" && (
                  <>
                    <div
                      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={e => {
                        e.preventDefault(); setDragOver(false);
                        const file = e.dataTransfer.files[0];
                        if (file) handleFileSelect(file);
                      }}
                      onClick={() => fileInputRef.current?.click()}
                      className={cn("border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors",
                        dragOver ? "border-convix-400 bg-convix-50" : "border-border hover:border-convix-300"
                      )}>
                      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm font-medium text-foreground">Drop file here or click to browse</p>
                      <p className="text-xs text-muted-foreground mt-1">.pdf, .docx, .txt, .csv</p>
                      {kbForm.fileName && (
                        <p className="text-xs font-medium text-convix-600 mt-2 bg-convix-50 px-2 py-1 rounded-full inline-block">{kbForm.fileName}</p>
                      )}
                    </div>
                    <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt,.csv" className="hidden"
                      onChange={e => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0]); }} />
                  </>
                )}

                {kbType === "qa" && (
                  <>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Question</label>
                      <input value={kbForm.question} onChange={e => setKbForm(p => ({ ...p, question: e.target.value }))}
                        placeholder="e.g. How do I reset my password?"
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-convix-500" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Answer</label>
                      <textarea value={kbForm.answer} onChange={e => setKbForm(p => ({ ...p, answer: e.target.value }))}
                        rows={4} placeholder="Provide a complete answer..."
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-convix-500 resize-none" />
                    </div>
                  </>
                )}

                {(kbType === "youtube") && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">YouTube URL</label>
                    <input value={kbForm.url} onChange={e => setKbForm(p => ({ ...p, url: e.target.value }))}
                      placeholder="https://youtube.com/watch?v=... or https://youtu.be/..."
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-convix-500" />
                    <p className="text-xs text-muted-foreground mt-1.5">We&apos;ll extract and index the video transcript automatically.</p>
                  </div>
                )}

                {kbType === "sitemap" && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Sitemap URL</label>
                    <input value={kbForm.url} onChange={e => setKbForm(p => ({ ...p, url: e.target.value }))}
                      placeholder="https://yoursite.com/sitemap.xml"
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-convix-500" />
                    <p className="text-xs text-muted-foreground mt-1.5">We&apos;ll crawl and index all pages found in your sitemap.</p>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button onClick={() => setKbStep("pick")} className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">Back</button>
                  <button onClick={() => addKbItem(showKbModal)}
                    className="px-3 py-1.5 text-sm bg-convix-600 text-white font-medium rounded-lg hover:bg-convix-700 transition-colors">
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt,.csv" className="hidden sr-only"
        onChange={e => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0]); }} />
    </div>
  );
}
