// TODO: REPLACE WITH API — all exports in this file come from real API endpoints in Phase 3

// ── Types ──────────────────────────────────────────────────────────────────────

export type ConversationStatus = "active" | "handed_off" | "resolved" | "abandoned";
export type ChannelType = "web" | "whatsapp" | "sms" | "voice" | "instagram" | "messenger" | "email" | "slack";
export type AgentMode = "text" | "voice" | "both";
export type ToolType = "http" | "webhook" | "database" | "function";

export interface Message {
  id: string;
  role: "user" | "ai" | "human_agent";
  content: string;
  confidence?: number;
  timestamp: string;
}

export interface Conversation {
  id: string;
  customerName: string;
  customerEmail: string;
  channel: ChannelType;
  status: ConversationStatus;
  lastMessage: string;
  messageCount: number;
  duration: number; // seconds
  agentId: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
}

export interface Agent {
  id: string;
  name: string;
  avatar: string;
  systemPrompt: string;
  status: "active" | "inactive";
  channels: ChannelType[];
  mode: AgentMode;
  toolIds: string[];
  createdAt: string;
}

export interface Tool {
  id: string;
  name: string;
  type: ToolType;
  url: string;
  status: "connected" | "error" | "untested";
  assignedAgents: string[];
  createdAt: string;
}

export interface CustomField {
  id: string;
  label: string;
  sourceEndpoint: string;
  field: string;
  showInList: boolean;
  showInDetail: boolean;
}

// ── Mock Agents ────────────────────────────────────────────────────────────────
// TODO: REPLACE WITH API — GET /agents

export const mockAgents: Agent[] = [
  {
    id: "agent_001",
    name: "Aria",
    avatar: "🤖",
    systemPrompt: "You are Aria, a helpful assistant for Acme Corp. You help users with product questions, onboarding, and support. Be concise, friendly, and professional. When you don't know something, say so and offer to connect the user with a human.",
    status: "active",
    channels: ["web", "whatsapp", "email"],
    mode: "both",
    toolIds: ["tool_001", "tool_002"],
    createdAt: "2024-01-15",
  },
  {
    id: "agent_002",
    name: "DataBot",
    avatar: "📊",
    systemPrompt: "You are DataBot, an internal analytics assistant. You help team members query and understand company metrics. Pull live data when asked. Be precise and cite your sources.",
    status: "active",
    channels: ["slack"],
    mode: "text",
    toolIds: ["tool_003"],
    createdAt: "2024-02-01",
  },
  {
    id: "agent_003",
    name: "VoiceDesk",
    avatar: "🎙️",
    systemPrompt: "You are VoiceDesk, a voice support agent. Speak naturally and conversationally. When callers have complex issues, offer to transfer them to a human agent.",
    status: "inactive",
    channels: ["voice", "sms"],
    mode: "voice",
    toolIds: ["tool_001"],
    createdAt: "2024-02-10",
  },
];

// ── Mock Tools ─────────────────────────────────────────────────────────────────
// TODO: REPLACE WITH API — GET /tools

export const mockTools: Tool[] = [
  {
    id: "tool_001",
    name: "Customer DB Lookup",
    type: "http",
    url: "https://api.acmecorp.com/customers",
    status: "connected",
    assignedAgents: ["agent_001", "agent_003"],
    createdAt: "2024-01-15",
  },
  {
    id: "tool_002",
    name: "Knowledge Base",
    type: "http",
    url: "https://api.acmecorp.com/kb/search",
    status: "connected",
    assignedAgents: ["agent_001"],
    createdAt: "2024-01-20",
  },
  {
    id: "tool_003",
    name: "Analytics Endpoint",
    type: "http",
    url: "https://api.acmecorp.com/analytics",
    status: "connected",
    assignedAgents: ["agent_002"],
    createdAt: "2024-02-01",
  },
  {
    id: "tool_004",
    name: "Slack Notifier",
    type: "webhook",
    url: "https://hooks.slack.com/services/...",
    status: "untested",
    assignedAgents: [],
    createdAt: "2024-02-15",
  },
];

// ── Mock Conversations ─────────────────────────────────────────────────────────
// TODO: REPLACE WITH API — GET /agents/:id/conversations

export const mockConversations: Conversation[] = [
  {
    id: "conv_001",
    customerName: "Emma Rodriguez",
    customerEmail: "emma@example.com",
    channel: "web",
    status: "resolved",
    lastMessage: "That answered everything, thanks!",
    messageCount: 6,
    duration: 184,
    agentId: "agent_001",
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    messages: [
      { id: "m1", role: "user", content: "Hey, how do I reset my API key?", timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
      { id: "m2", role: "ai", content: "Sure! Go to Settings → API Keys → click 'Regenerate'. Your old key will be invalidated immediately. Need me to walk you through it?", confidence: 0.96, timestamp: new Date(Date.now() - 1000 * 60 * 29).toISOString() },
      { id: "m3", role: "user", content: "And does it affect webhooks?", timestamp: new Date(Date.now() - 1000 * 60 * 20).toISOString() },
      { id: "m4", role: "ai", content: "Yes — any webhooks using the old key will stop working immediately. Make sure to update them in your systems before regenerating.", confidence: 0.93, timestamp: new Date(Date.now() - 1000 * 60 * 19).toISOString() },
      { id: "m5", role: "user", content: "Good to know. That answered everything, thanks!", timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString() },
      { id: "m6", role: "ai", content: "Happy to help! Let me know if anything else comes up.", confidence: 0.99, timestamp: new Date(Date.now() - 1000 * 60 * 9).toISOString() },
    ],
  },
  {
    id: "conv_002",
    customerName: "James Patel",
    customerEmail: "james@dev.io",
    channel: "whatsapp",
    status: "handed_off",
    lastMessage: "This keeps failing and I need it fixed today.",
    messageCount: 7,
    duration: 620,
    agentId: "agent_001",
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    messages: [
      { id: "m1", role: "user", content: "Your API keeps returning 502 errors on POST /v1/sessions", timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString() },
      { id: "m2", role: "ai", content: "I'm checking our status page — I don't see any active incidents. Can you share your request payload so I can investigate?", confidence: 0.72, timestamp: new Date(Date.now() - 1000 * 60 * 89).toISOString() },
      { id: "m3", role: "user", content: "I've tried everything. This keeps failing and I need it fixed today.", timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString() },
      { id: "m4", role: "ai", content: "I completely understand the urgency. Let me connect you with our engineering support team — they can dig into the logs directly.", confidence: 0.38, timestamp: new Date(Date.now() - 1000 * 60 * 44).toISOString() },
      { id: "m5", role: "human_agent", content: "Hi James, this is Marcus from engineering. I'm looking at the logs now — I can see the issue. It's a rate limit on your account tier. I'm escalating to unblock you.", timestamp: new Date(Date.now() - 1000 * 60 * 20).toISOString() },
    ],
  },
  {
    id: "conv_003",
    customerName: "Aisha Okonkwo",
    customerEmail: "aisha@startup.ng",
    channel: "web",
    status: "active",
    lastMessage: "Can I deploy multiple agents under one account?",
    messageCount: 3,
    duration: 90,
    agentId: "agent_001",
    createdAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 1).toISOString(),
    messages: [
      { id: "m1", role: "user", content: "I'm evaluating Axon AI for our team.", timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString() },
      { id: "m2", role: "ai", content: "Welcome! Happy to help you find the right fit. What's your main use case?", confidence: 0.91, timestamp: new Date(Date.now() - 1000 * 60 * 7).toISOString() },
      { id: "m3", role: "user", content: "Can I deploy multiple agents under one account?", timestamp: new Date(Date.now() - 1000 * 60 * 1).toISOString() },
    ],
  },
  {
    id: "conv_004",
    customerName: "Marcus Chen",
    customerEmail: "m.chen@corp.com",
    channel: "slack",
    status: "resolved",
    lastMessage: "Perfect, that's all I needed.",
    messageCount: 4,
    duration: 210,
    agentId: "agent_002",
    createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    messages: [
      { id: "m1", role: "user", content: "What were our active users last week?", timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString() },
      { id: "m2", role: "ai", content: "Pulling from the analytics endpoint... Last week you had 4,821 active users, up 12% from the week before.", confidence: 0.97, timestamp: new Date(Date.now() - 1000 * 60 * 179).toISOString() },
      { id: "m3", role: "user", content: "And the breakdown by plan?", timestamp: new Date(Date.now() - 1000 * 60 * 150).toISOString() },
      { id: "m4", role: "user", content: "Perfect, that's all I needed.", timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString() },
    ],
  },
  {
    id: "conv_005",
    customerName: "Sophie Turner",
    customerEmail: "sophie@example.io",
    channel: "voice",
    status: "resolved",
    lastMessage: "[Call ended — 3m 42s]",
    messageCount: 8,
    duration: 222,
    agentId: "agent_003",
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    messages: [
      { id: "m1", role: "user", content: "[Call started]", timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString() },
      { id: "m2", role: "ai", content: "Hi, you've reached VoiceDesk. How can I help you today?", confidence: 0.99, timestamp: new Date(Date.now() - 1000 * 60 * 59).toISOString() },
      { id: "m3", role: "user", content: "I need to know my current plan and usage.", timestamp: new Date(Date.now() - 1000 * 60 * 58).toISOString() },
      { id: "m4", role: "ai", content: "Looking that up for you... You're on the Builder plan. This month you've used 3,200 of your 10,000 included conversations.", confidence: 0.94, timestamp: new Date(Date.now() - 1000 * 60 * 57).toISOString() },
      { id: "m5", role: "user", content: "[Call ended — 3m 42s]", timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString() },
    ],
  },
  {
    id: "conv_006",
    customerName: "Tyler Brooks",
    customerEmail: "tyler@dev.com",
    channel: "sms",
    status: "abandoned",
    lastMessage: "nvm",
    messageCount: 2,
    duration: 30,
    agentId: "agent_001",
    createdAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 230).toISOString(),
    messages: [
      { id: "m1", role: "user", content: "how do i integrate this", timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString() },
      { id: "m2", role: "user", content: "nvm", timestamp: new Date(Date.now() - 1000 * 60 * 230).toISOString() },
    ],
  },
];

// ── Mock Custom Fields ─────────────────────────────────────────────────────────
// TODO: REPLACE WITH API — GET /agents/:id/settings/customFields

export const mockCustomFields: CustomField[] = [];
// Empty by default — users configure these in Settings

// ── Mock Channels ──────────────────────────────────────────────────────────────
// TODO: REPLACE WITH API — GET /agents/:id/channels

export const mockChannels = [
  { id: "ch_web", type: "web", name: "Web Widget", description: "Embeddable chat widget for websites", isActive: true, conversations: 1240, icon: "💬" },
  { id: "ch_wa", type: "whatsapp", name: "WhatsApp", description: "WhatsApp Business via Meta Cloud API", isActive: true, conversations: 748, icon: "💚" },
  { id: "ch_sms", type: "sms", name: "SMS", description: "Text messaging via Twilio", isActive: false, conversations: 0, icon: "📱" },
  { id: "ch_voice", type: "voice", name: "Voice Call", description: "Inbound & outbound calls via Twilio Voice", isActive: false, conversations: 0, icon: "📞" },
  { id: "ch_ig", type: "instagram", name: "Instagram DMs", description: "Respond to Instagram direct messages", isActive: true, conversations: 412, icon: "📸" },
  { id: "ch_msg", type: "messenger", name: "Facebook Messenger", description: "Facebook Page messaging", isActive: false, conversations: 0, icon: "💙" },
  { id: "ch_email", type: "email", name: "Email", description: "Inbound email support", isActive: false, conversations: 0, icon: "📧" },
  { id: "ch_slack", type: "slack", name: "Slack", description: "Workspace messaging for B2B and internal use", isActive: false, conversations: 0, icon: "🟨" },
];

// ── Mock Training Docs ─────────────────────────────────────────────────────────
// TODO: REPLACE WITH API — GET /agents/:id/training

export const mockTrainingDocs = [
  { id: "doc_001", title: "Product FAQ", type: "FAQ", wordCount: 1240, status: "indexed", isActive: true, createdAt: "2024-01-15" },
  { id: "doc_002", title: "API Documentation", type: "URL", wordCount: 8400, status: "indexed", isActive: true, createdAt: "2024-01-20" },
  { id: "doc_003", title: "Support Runbook", type: "POLICY", wordCount: 920, status: "indexed", isActive: true, createdAt: "2024-02-01" },
  { id: "doc_004", title: "Onboarding Guide", type: "MANUAL", wordCount: 2100, status: "indexed", isActive: true, createdAt: "2024-02-10" },
  { id: "doc_005", title: "Pricing Details", type: "FAQ", wordCount: 380, status: "pending", isActive: false, createdAt: "2024-02-18" },
];
