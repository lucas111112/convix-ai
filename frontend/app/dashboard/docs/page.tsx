"use client";
import { useState } from "react";
import { ChevronDown, ChevronRight, Book, Zap, Bot, Globe, Code } from "lucide-react";
import { cn } from "@/lib/utils";

// Static documentation — TODO: REPLACE WITH CMS or MDX in production

interface DocSection {
  id: string;
  label: string;
  icon: React.ElementType;
  children: { id: string; label: string }[];
}

const sections: DocSection[] = [
  {
    id: "getting-started", label: "Getting Started", icon: Book,
    children: [
      { id: "introduction", label: "Introduction" },
      { id: "quickstart", label: "Quick Start" },
    ],
  },
  {
    id: "api-reference", label: "API Reference", icon: Code,
    children: [
      { id: "agents-api", label: "Agents API" },
      { id: "conversations-api", label: "Conversations API" },
    ],
  },
  {
    id: "channels", label: "Channels", icon: Globe,
    children: [
      { id: "web-widget", label: "Web Widget" },
      { id: "whatsapp", label: "WhatsApp" },
    ],
  },
  {
    id: "sdks", label: "SDKs & Integrations", icon: Zap,
    children: [
      { id: "js-sdk", label: "JavaScript SDK" },
      { id: "python-sdk", label: "Python SDK" },
    ],
  },
];

const docs: Record<string, { title: string; content: React.ReactNode }> = {
  introduction: {
    title: "Introduction to Axon AI",
    content: (
      <div className="space-y-4 text-sm leading-relaxed">
        <p className="text-muted-foreground">
          Axon AI is a universal AI agent platform that lets you deploy intelligent conversational agents across any channel — web, WhatsApp, voice, Slack, email, and more — without writing backend infrastructure.
        </p>
        <h3 className="font-semibold text-foreground mt-6">Core Concepts</h3>
        <ul className="space-y-3 text-muted-foreground">
          <li><strong className="text-foreground">Agents</strong> — AI-powered conversation handlers configured via a system prompt and optional knowledge base. Each agent runs on one or more channels.</li>
          <li><strong className="text-foreground">Channels</strong> — Integration points where your agent communicates: Web Widget, WhatsApp Business, SMS (Twilio), Voice calls, and more.</li>
          <li><strong className="text-foreground">Knowledge</strong> — Text blocks or URLs indexed and made available to your agent during conversations. Used to ground responses in your specific domain.</li>
          <li><strong className="text-foreground">Handoff</strong> — Automatic escalation to a human agent when the AI's confidence drops below a configurable threshold.</li>
        </ul>
        <div className="bg-convix-50 border border-convix-200 rounded-lg px-4 py-3 mt-6">
          <p className="text-xs font-medium text-convix-700">💡 Tip</p>
          <p className="text-xs text-convix-700 mt-1">Start with the Quick Start guide to deploy your first agent in under 5 minutes.</p>
        </div>
      </div>
    ),
  },
  quickstart: {
    title: "Quick Start",
    content: (
      <div className="space-y-6 text-sm">
        <p className="text-muted-foreground">Deploy your first agent in three steps.</p>
        {[
          {
            step: "1", title: "Create an Agent",
            body: "Navigate to Agents → Create Agent. Give it a name and write your system prompt. The system prompt defines personality, scope, and behaviour.",
            code: null,
          },
          {
            step: "2", title: "Add Knowledge",
            body: "In the Create Agent modal, click 'Add knowledge'. Paste text blocks or add URLs to your documentation, help center, or product pages.",
            code: null,
          },
          {
            step: "3", title: "Deploy to a Channel",
            body: "Go to Channels, activate Web Widget, and embed the snippet in your site:",
            code: `<script src="https://cdn.axon.ai/widget.js"
  data-agent-id="YOUR_AGENT_ID"
  data-theme="light">
</script>`,
          },
        ].map(item => (
          <div key={item.step} className="flex gap-4">
            <div className="w-7 h-7 rounded-full bg-convix-600 text-white text-xs font-bold flex items-center justify-center shrink-0">{item.step}</div>
            <div className="flex-1 space-y-2">
              <h4 className="font-semibold text-foreground">{item.title}</h4>
              <p className="text-muted-foreground">{item.body}</p>
              {item.code && (
                <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-xs font-mono leading-relaxed">{item.code}</pre>
              )}
            </div>
          </div>
        ))}
      </div>
    ),
  },
  "agents-api": {
    title: "Agents API",
    content: (
      <div className="space-y-6 text-sm">
        <p className="text-muted-foreground">All requests require an <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">Authorization: Bearer YOUR_API_KEY</code> header.</p>
        <p className="text-muted-foreground">Base URL: <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">https://api.axon.ai/v1</code></p>

        {[
          { method: "GET", path: "/agents", desc: "List all agents in your workspace.", response: `[
  {
    "id": "agent_001",
    "name": "Aria",
    "status": "active",
    "channels": ["web", "whatsapp"],
    "createdAt": "2024-01-15"
  }
]` },
          { method: "POST", path: "/agents", desc: "Create a new agent.", response: `{
  "id": "agent_xyz",
  "name": "My Agent",
  "status": "inactive",
  "channels": []
}` },
          { method: "PATCH", path: "/agents/:id", desc: "Update an existing agent's configuration.", response: `{ "success": true, "agent": { ... } }` },
          { method: "DELETE", path: "/agents/:id", desc: "Delete an agent permanently.", response: `{ "success": true }` },
        ].map(ep => (
          <div key={ep.path} className="border border-border rounded-xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 bg-muted/30 border-b border-border">
              <span className={cn("text-xs font-bold px-2 py-0.5 rounded",
                ep.method === "GET" ? "bg-blue-50 text-blue-700" :
                ep.method === "POST" ? "bg-green-50 text-green-700" :
                ep.method === "PATCH" ? "bg-yellow-50 text-yellow-700" :
                "bg-red-50 text-red-700"
              )}>
                {ep.method}
              </span>
              <code className="text-xs font-mono text-foreground">{ep.path}</code>
            </div>
            <div className="px-4 py-3 space-y-2">
              <p className="text-xs text-muted-foreground">{ep.desc}</p>
              <pre className="bg-gray-900 text-green-400 p-3 rounded-lg text-xs font-mono leading-relaxed overflow-x-auto">{ep.response}</pre>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  "conversations-api": {
    title: "Conversations API",
    content: (
      <div className="space-y-4 text-sm">
        <p className="text-muted-foreground">Retrieve and manage conversations handled by your agents.</p>
        {[
          { method: "GET", path: "/conversations", desc: "List all conversations across all agents.", response: `{ "data": [...], "total": 2847, "page": 1 }` },
          { method: "GET", path: "/conversations/:id", desc: "Get a single conversation with full message thread.", response: `{ "id": "conv_001", "messages": [...], "status": "resolved" }` },
          { method: "POST", path: "/conversations/:id/handoff", desc: "Manually trigger handoff to a human agent.", response: `{ "success": true, "handoffAt": "2026-02-18T12:00:00Z" }` },
        ].map(ep => (
          <div key={ep.path} className="border border-border rounded-xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 bg-muted/30 border-b border-border">
              <span className={cn("text-xs font-bold px-2 py-0.5 rounded",
                ep.method === "GET" ? "bg-blue-50 text-blue-700" : "bg-green-50 text-green-700"
              )}>
                {ep.method}
              </span>
              <code className="text-xs font-mono text-foreground">{ep.path}</code>
            </div>
            <div className="px-4 py-3 space-y-2">
              <p className="text-xs text-muted-foreground">{ep.desc}</p>
              <pre className="bg-gray-900 text-green-400 p-3 rounded-lg text-xs font-mono">{ep.response}</pre>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  "web-widget": {
    title: "Web Widget",
    content: (
      <div className="space-y-4 text-sm">
        <p className="text-muted-foreground">Embed the Axon AI chat widget on any website with a single script tag.</p>
        <h3 className="font-semibold text-foreground">Basic Embed</h3>
        <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs font-mono leading-relaxed overflow-x-auto">{`<script
  src="https://cdn.axon.ai/widget.js"
  data-agent-id="YOUR_AGENT_ID"
  data-theme="light"
  data-position="bottom-right"
  defer>
</script>`}</pre>
        <h3 className="font-semibold text-foreground mt-4">Configuration Options</h3>
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="grid grid-cols-3 text-xs font-medium text-muted-foreground bg-muted/30 px-4 py-2 border-b border-border">
            <span>Attribute</span><span>Default</span><span>Description</span>
          </div>
          {[
            ["data-agent-id", "required", "Your agent's unique identifier"],
            ["data-theme", "\"light\"", "Widget theme: \"light\" or \"dark\""],
            ["data-position", "\"bottom-right\"", "Position: bottom-right or bottom-left"],
            ["data-primary-color", "\"#6d28d9\"", "Hex color for the widget button and header"],
            ["data-greeting", "\"Hi there!\"", "Initial greeting message shown to users"],
            ["data-hide-powered-by", "false", "Hide the 'Powered by Axon AI' badge"],
          ].map(([attr, def, desc]) => (
            <div key={attr} className="grid grid-cols-3 px-4 py-2.5 border-b border-border last:border-0 text-xs">
              <code className="font-mono text-convix-700">{attr}</code>
              <code className="font-mono text-muted-foreground">{def}</code>
              <span className="text-muted-foreground">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  whatsapp: {
    title: "WhatsApp Business Integration",
    content: (
      <div className="space-y-4 text-sm text-muted-foreground">
        <p>Connect Axon AI to WhatsApp Business using the Meta Cloud API.</p>
        <ol className="space-y-3 list-decimal list-inside">
          <li>Create a Meta Business account and register a WhatsApp Business number.</li>
          <li>In your Meta Developer dashboard, create an app and enable the WhatsApp product.</li>
          <li>Copy your Phone Number ID and Access Token.</li>
          <li>In Axon AI, go to Channels → WhatsApp → paste your credentials.</li>
          <li>Configure your webhook URL to <code className="bg-muted text-foreground px-1 py-0.5 rounded text-xs font-mono">https://api.axon.ai/v1/webhooks/whatsapp/YOUR_AGENT_ID</code>.</li>
        </ol>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
          <p className="text-xs font-medium text-yellow-700">⚠️ Note</p>
          <p className="text-xs text-yellow-700 mt-1">WhatsApp Business requires approval from Meta before you can send messages to users outside of the 24-hour service window.</p>
        </div>
      </div>
    ),
  },
  "js-sdk": {
    title: "JavaScript SDK",
    content: (
      <div className="space-y-4 text-sm">
        <p className="text-muted-foreground">Install the Axon AI JS SDK to manage agents and conversations programmatically.</p>
        <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs font-mono">npm install @axon-ai/sdk</pre>
        <h3 className="font-semibold text-foreground">Usage</h3>
        <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs font-mono leading-relaxed">{`import { AxonClient } from "@axon-ai/sdk";

const client = new AxonClient({ apiKey: process.env.AXON_API_KEY });

// List agents
const agents = await client.agents.list();

// Send a test message
const response = await client.agents.chat("agent_001", {
  message: "Hello, how can I reset my password?",
  sessionId: "test_session_123",
});

console.log(response.text, response.confidence);`}</pre>
      </div>
    ),
  },
  "python-sdk": {
    title: "Python SDK",
    content: (
      <div className="space-y-4 text-sm">
        <p className="text-muted-foreground">Install the Axon AI Python SDK for backend integrations.</p>
        <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs font-mono">pip install axon-ai</pre>
        <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs font-mono leading-relaxed">{`from axon_ai import AxonClient

client = AxonClient(api_key="YOUR_API_KEY")

agents = client.agents.list()
response = client.agents.chat(
    agent_id="agent_001",
    message="What is the refund policy?",
    session_id="user_789",
)
print(response.text, response.confidence)`}</pre>
      </div>
    ),
  },
};

export default function DocsPage() {
  const [activeDoc, setActiveDoc] = useState("introduction");
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(["getting-started"]));

  const toggleSection = (id: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const doc = docs[activeDoc];

  return (
    <div className="flex gap-0 animate-fade-in h-full" style={{ height: "calc(100vh - 7rem)" }}>
      {/* Left nav */}
      <div className="w-56 shrink-0 bg-white border border-border rounded-xl overflow-y-auto mr-4">
        <div className="px-4 py-3.5 border-b border-border">
          <div className="flex items-center gap-2">
            <Book className="w-4 h-4 text-convix-600" />
            <span className="text-sm font-semibold text-foreground">Documentation</span>
          </div>
        </div>
        <nav className="py-2">
          {sections.map(section => {
            const open = openSections.has(section.id);
            return (
              <div key={section.id}>
                <button onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
                  {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  <section.icon className="w-3.5 h-3.5" />
                  {section.label}
                </button>
                {open && (
                  <div className="ml-2 pl-3 border-l border-border mb-1">
                    {section.children.map(child => (
                      <button key={child.id} onClick={() => setActiveDoc(child.id)}
                        className={cn("w-full text-left px-3 py-1.5 text-xs rounded-md transition-colors",
                          activeDoc === child.id ? "text-convix-700 bg-convix-50 font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}>
                        {child.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 bg-white rounded-xl border border-border overflow-y-auto">
        {doc ? (
          <div className="max-w-2xl mx-auto px-8 py-8">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
              <Bot className="w-3.5 h-3.5" />
              <span>Axon AI Docs</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-foreground">{doc.title}</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-6">{doc.title}</h1>
            {doc.content}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p className="text-sm">Select a topic from the sidebar</p>
          </div>
        )}
      </div>
    </div>
  );
}
