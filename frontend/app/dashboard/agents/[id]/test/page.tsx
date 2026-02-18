"use client";
import { use, useState, useRef, useEffect } from "react";
import { mockAgents, mockKnowledgeItems } from "@/lib/mock/data";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Bot, User, Send, Mic, MicOff, Phone, PhoneOff, FileText, Link2, Timer, Zap, Brain, Hash } from "lucide-react";
import { cn } from "@/lib/utils";

// TODO: REPLACE WITH API — POST /agents/:id/chat, /agents/:id/call

const MOCK_RESPONSES = [
  "Thanks for reaching out! I'm happy to help with that. Could you provide a bit more context so I can give you the most accurate answer?",
  "Great question! Based on the knowledge I have access to, here's what I can tell you: the system is designed to handle this scenario by automatically routing the request to the appropriate handler.",
  "I understand your concern. Let me check the relevant information for you... Based on our documentation, the recommended approach is to follow the standard procedure outlined in the setup guide.",
  "That's a common question! The short answer is yes — this is fully supported. You can configure this behavior in the agent settings under the Advanced tab.",
  "I appreciate your patience. I want to make sure I give you accurate information. From what I know, the best way to handle this is to contact support with your account ID and they'll be able to assist you directly.",
];

interface ChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  latency?: number;
  confidence?: number;
  tokens?: number;
  knowledgeRefs?: string[];
}

type Mode = "chat" | "voice";
type CallState = "idle" | "connecting" | "active" | "ended";

export default function AgentTestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const agent = mockAgents.find(a => a.id === id);
  if (!agent) notFound();

  const kb = mockKnowledgeItems[id] ?? [];
  const [mode, setMode] = useState<Mode>("chat");

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Voice state
  const [callState, setCallState] = useState<CallState>("idle");
  const [callDuration, setCallDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [postCallSummary, setPostCallSummary] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || thinking) return;
    const userMsg: ChatMessage = { id: `m_${Date.now()}`, role: "user", content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setThinking(true);
    const latency = 800 + Math.floor(Math.random() * 700);
    await new Promise(r => setTimeout(r, latency));
    const response = MOCK_RESPONSES[messages.length % MOCK_RESPONSES.length];
    const confidence = 0.72 + Math.random() * 0.26;
    const tokens = 80 + Math.floor(Math.random() * 200);
    const usedKb = kb.slice(0, Math.floor(Math.random() * (kb.length + 1)));
    const aiMsg: ChatMessage = {
      id: `m_${Date.now() + 1}`, role: "ai", content: response,
      latency, confidence: Math.round(confidence * 100) / 100,
      tokens, knowledgeRefs: usedKb.map(k => k.title),
    };
    // TTS via Web Speech API (graceful fallback)
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        const utt = new SpeechSynthesisUtterance(response);
        utt.rate = 1.0; utt.volume = 0.6;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utt);
      } catch { /* ignore */ }
    }
    setMessages(prev => [...prev, aiMsg]);
    setThinking(false);
  };

  const startCall = () => {
    setCallState("connecting");
    setCallDuration(0);
    setPostCallSummary(null);
    setTimeout(() => {
      setCallState("active");
      timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
    }, 1500);
  };

  const endCall = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCallState("ended");
    const dur = callDuration;
    setPostCallSummary(`Call lasted ${Math.floor(dur / 60)}m ${dur % 60}s. The agent handled the conversation with an estimated 87% confidence. No handoff was triggered. 3 knowledge references were used during the session.`);
  };

  const formatDuration = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const latestAI = [...messages].reverse().find(m => m.role === "ai");

  return (
    <div className="animate-fade-in h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/agents" className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-convix-100 flex items-center justify-center">
            <Bot className="w-4 h-4 text-convix-600" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground">{agent.name} — Test Environment</h1>
            <p className="text-xs text-muted-foreground">Responses are simulated · No real API calls</p>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="ml-auto flex items-center bg-muted rounded-lg p-1 gap-1">
          <button onClick={() => setMode("chat")}
            className={cn("px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
              mode === "chat" ? "bg-white shadow text-foreground" : "text-muted-foreground hover:text-foreground"
            )}>
            Chat
          </button>
          <button onClick={() => setMode("voice")}
            className={cn("px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
              mode === "voice" ? "bg-white shadow text-foreground" : "text-muted-foreground hover:text-foreground"
            )}>
            Voice Call
          </button>
        </div>
      </div>

      {mode === "chat" ? (
        <div className="flex gap-4 flex-1 min-h-0" style={{ height: "calc(100vh - 12rem)" }}>
          {/* Chat panel */}
          <div className="flex-1 bg-white rounded-xl border border-border flex flex-col min-h-0">
            <div className="px-4 py-3 border-b border-border shrink-0">
              <span className="text-xs font-medium text-muted-foreground">Chat with {agent.name}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-2">
                  <Bot className="w-10 h-10 opacity-20" />
                  <p className="text-sm">Send a message to start testing {agent.name}</p>
                </div>
              )}
              {messages.map(msg => (
                <div key={msg.id} className={cn("flex gap-2.5 max-w-[85%]", msg.role === "user" ? "self-start" : "self-end ml-auto flex-row-reverse")}>
                  <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0",
                    msg.role === "user" ? "bg-muted" : "bg-convix-100"
                  )}>
                    {msg.role === "user" ? <User className="w-3.5 h-3.5 text-muted-foreground" /> : <Bot className="w-3.5 h-3.5 text-convix-600" />}
                  </div>
                  <div className={cn("rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                    msg.role === "user" ? "bg-muted text-foreground" : "bg-convix-600 text-white"
                  )}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {thinking && (
                <div className="flex gap-2.5 max-w-[85%] self-end ml-auto flex-row-reverse">
                  <div className="w-7 h-7 rounded-full bg-convix-100 flex items-center justify-center shrink-0">
                    <Bot className="w-3.5 h-3.5 text-convix-600" />
                  </div>
                  <div className="rounded-2xl px-3.5 py-3 bg-convix-600 text-white flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: "100ms" }} />
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: "200ms" }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="border-t border-border p-3 shrink-0 flex gap-2">
              <input value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                placeholder={`Message ${agent.name}...`}
                className="flex-1 px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-convix-500 bg-muted/30" />
              <button onClick={sendMessage} disabled={!input.trim() || thinking}
                className="p-2 bg-convix-600 text-white rounded-lg hover:bg-convix-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Debug sidebar */}
          <div className="w-64 space-y-3 shrink-0 overflow-y-auto">
            <div className="bg-white rounded-xl border border-border p-4">
              <h3 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wide">Debug Info</h3>
              {latestAI ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Timer className="w-3 h-3" /> Latency
                    </div>
                    <span className="text-xs font-semibold text-foreground">{latestAI.latency} ms</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Zap className="w-3 h-3" /> Confidence
                    </div>
                    <span className={cn("text-xs font-semibold",
                      (latestAI.confidence ?? 0) >= 0.8 ? "text-green-600" :
                      (latestAI.confidence ?? 0) >= 0.6 ? "text-yellow-600" : "text-red-600"
                    )}>
                      {((latestAI.confidence ?? 0) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Hash className="w-3 h-3" /> Tokens
                    </div>
                    <span className="text-xs font-semibold text-foreground">{latestAI.tokens}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Send a message to see debug info.</p>
              )}
            </div>

            {latestAI?.knowledgeRefs && latestAI.knowledgeRefs.length > 0 && (
              <div className="bg-white rounded-xl border border-border p-4">
                <h3 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wide">Knowledge Used</h3>
                <div className="space-y-1.5">
                  {latestAI.knowledgeRefs.map((ref, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-convix-700 bg-convix-50 rounded-md px-2 py-1.5">
                      <Brain className="w-3 h-3 shrink-0" />
                      <span className="truncate">{ref}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl border border-border p-4">
              <h3 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wide">Agent Knowledge</h3>
              {kb.length > 0 ? (
                <div className="space-y-2">
                  {kb.map(item => (
                    <div key={item.id} className="flex items-start gap-2 text-xs">
                      {item.type === "url" ? <Link2 className="w-3.5 h-3.5 text-convix-600 shrink-0 mt-0.5" /> : <FileText className="w-3.5 h-3.5 text-convix-600 shrink-0 mt-0.5" />}
                      <span className="text-muted-foreground leading-tight">{item.title}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No knowledge items configured.</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Voice Call Mode */
        <div className="flex gap-4 flex-1 min-h-0">
          <div className="flex-1 bg-white rounded-xl border border-border flex flex-col items-center justify-center p-8 gap-6">
            {callState === "idle" && (
              <>
                <div className="w-24 h-24 rounded-full bg-convix-50 flex items-center justify-center">
                  <Bot className="w-12 h-12 text-convix-400" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-foreground">{agent.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">Ready to start a simulated voice call</p>
                </div>
                <button onClick={startCall}
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 transition-colors">
                  <Phone className="w-5 h-5" /> Start Call
                </button>
              </>
            )}

            {callState === "connecting" && (
              <>
                <div className="relative w-24 h-24">
                  <div className="absolute inset-0 rounded-full bg-convix-200 animate-ping opacity-40" />
                  <div className="relative w-24 h-24 rounded-full bg-convix-100 flex items-center justify-center">
                    <Bot className="w-12 h-12 text-convix-600" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground animate-pulse">Connecting to {agent.name}...</p>
              </>
            )}

            {callState === "active" && (
              <>
                <div className="relative w-24 h-24">
                  <div className="absolute inset-0 rounded-full bg-green-200 animate-ping opacity-30" />
                  <div className="absolute inset-2 rounded-full bg-green-100 animate-ping opacity-40" style={{ animationDelay: "0.2s" }} />
                  <div className="relative w-24 h-24 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center">
                    <Bot className="w-12 h-12 text-green-600" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-foreground">In call with {agent.name}</p>
                  <div className="flex items-center gap-1.5 justify-center mt-1">
                    <Timer className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm font-mono text-muted-foreground">{formatDuration(callDuration)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button onClick={() => setMuted(!muted)}
                    className={cn("w-12 h-12 rounded-full flex items-center justify-center transition-colors",
                      muted ? "bg-red-100 text-red-600" : "bg-muted text-foreground hover:bg-muted/80"
                    )}>
                    {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>
                  <button onClick={endCall}
                    className="w-14 h-14 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition-colors">
                    <PhoneOff className="w-6 h-6" />
                  </button>
                </div>
                {muted && <p className="text-xs text-red-500">Microphone muted</p>}
              </>
            )}

            {callState === "ended" && postCallSummary && (
              <div className="max-w-sm text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                  <Phone className="w-8 h-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Call Ended</p>
                  <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{postCallSummary}</p>
                </div>
                <button onClick={() => { setCallState("idle"); setCallDuration(0); setPostCallSummary(null); }}
                  className="px-5 py-2 bg-convix-600 text-white text-sm font-medium rounded-lg hover:bg-convix-700 transition-colors">
                  Start New Call
                </button>
              </div>
            )}
          </div>

          {/* Voice debug sidebar */}
          <div className="w-64 space-y-3 shrink-0">
            <div className="bg-white rounded-xl border border-border p-4">
              <h3 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wide">Call Info</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className={cn("font-medium", callState === "active" ? "text-green-600" : "text-foreground")}>{callState}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Duration</span><span className="font-medium font-mono">{formatDuration(callDuration)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Agent</span><span className="font-medium">{agent.name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Mic</span><span className={cn("font-medium", muted ? "text-red-600" : "text-green-600")}>{muted ? "Muted" : "Active"}</span></div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-border p-4">
              <h3 className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">Agent Knowledge</h3>
              {kb.length > 0 ? kb.map(item => (
                <div key={item.id} className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                  {item.type === "url" ? <Link2 className="w-3 h-3 text-convix-500 shrink-0" /> : <FileText className="w-3 h-3 text-convix-500 shrink-0" />}
                  {item.title}
                </div>
              )) : <p className="text-xs text-muted-foreground">No knowledge configured.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
