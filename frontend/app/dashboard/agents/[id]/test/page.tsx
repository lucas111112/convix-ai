"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { authenticatedFetch, clearAccessToken, getAccessToken } from "@/lib/auth";
import { notFound, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  FileText,
  Hash,
  Link2,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Send,
  Timer,
  User,
  Zap,
  Brain,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  latency?: number;
  confidence?: number;
  tokens?: number;
  knowledgeRefs?: string[];
}

interface KnowledgeItem {
  id: string;
  title: string;
  type: string;
}

interface AgentDoc {
  id: string;
  title: string;
  type: string;
  status?: string;
  isActive?: boolean;
}

interface AgentPayload {
  agent: {
    id: string;
    name: string;
    systemPrompt: string;
    knowledgeDocs?: AgentDoc[];
  };
}

interface ChatPayload {
  conversationId: string;
  message: {
    role: string;
    content: string;
    confidence: number;
    latencyMs: number;
    tokens?: number;
  };
}

type Mode = "chat" | "voice";
type CallState = "idle" | "connecting" | "active" | "ended";
type AgentMode = "loading" | "ready" | "not-found";

function isSessionExpired(err: string): boolean {
  return (
    err.toLowerCase().includes("unauthorized") ||
    err.toLowerCase().includes("expired") ||
    err.toLowerCase().includes("invalid token")
  );
}

export default function AgentTestPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { id } = params;

  const [mode, setMode] = useState<Mode>("chat");
  const [agentMode, setAgentMode] = useState<AgentMode>("loading");
  const [agentName, setAgentName] = useState("Agent");
  const [systemPrompt, setSystemPrompt] = useState("No system prompt configured.");
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([]);
  const [agentLoadError, setAgentLoadError] = useState<string | null>(null);

  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Voice state
  const [callState, setCallState] = useState<CallState>("idle");
  const [callDuration, setCallDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [postCallSummary, setPostCallSummary] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceMessages, setVoiceMessages] = useState<ChatMessage[]>([]);
  const [voiceStatus, setVoiceStatus] = useState<string>("");

  // Refs for voice resources
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const callStateRef = useRef<CallState>("idle");
  const voiceConvIdRef = useRef<string | undefined>(undefined);
  const mutedRef = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      recognitionRef.current?.stop();
      mediaStreamRef.current?.getTracks().forEach(t => t.stop());
      window.speechSynthesis?.cancel();
    };
  }, []);

  useEffect(() => {
    if (!getAccessToken()) {
      router.push("/login");
      return;
    }

    let canceled = false;
    const fetchAgent = async () => {
      setAgentMode("loading");
      setAgentLoadError(null);

      try {
        const payload = await authenticatedFetch<AgentPayload>(`/v1/agents/${id}`, {
          method: "GET",
        });
        if (canceled) return;

        setAgentName(payload.agent.name);
        setSystemPrompt(payload.agent.systemPrompt || "No system prompt configured.");
        setKnowledgeItems(
          (payload.agent.knowledgeDocs ?? []).filter(d => d.isActive !== false).map((doc) => ({
            id: doc.id,
            title: doc.title,
            type: doc.type,
          })),
        );
        setAgentMode("ready");
      } catch (error) {
        if (canceled) return;
        setAgentMode("not-found");
        setAgentLoadError(
          error instanceof Error
            ? error.message
            : "No agent found for this ID.",
        );
      }
    };

    void fetchAgent();
    return () => {
      canceled = true;
    };
  }, [id, router]);

  if (agentMode === "not-found") {
    notFound();
  }

  const sendMessage = async () => {
    if (!input.trim() || thinking) return;
    if (!getAccessToken()) {
      router.push("/login");
      return;
    }
    if (agentMode !== "ready") {
      setChatError("Agent is still loading. Please wait.");
      return;
    }

    const userMessageText = input.trim();
    const userMsg: ChatMessage = {
      id: `m_${Date.now()}`,
      role: "user",
      content: userMessageText,
    };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setThinking(true);
    setChatError(null);

    try {
      const start = performance.now();
      const chatPayload: ChatPayload = await authenticatedFetch<ChatPayload>(`/v1/agents/${id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map((message) => ({ role: message.role === "user" ? "user" : "assistant", content: message.content })),
          conversationId,
          stream: false,
        }),
      });
      const latency = Math.round(performance.now() - start);
      setConversationId(chatPayload.conversationId);
      setMessages((prev) => [
        ...prev,
        {
          id: `m_${Date.now() + 1}`,
          role: "ai",
          content: chatPayload.message.content,
          latency,
          confidence: chatPayload.message.confidence,
          tokens: chatPayload.message.tokens,
        },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to get a response.";
      if (isSessionExpired(message)) {
        clearAccessToken();
        router.push("/login");
      }
      setChatError(message);
    } finally {
      setThinking(false);
    }
  };

  // ── Voice call implementation ─────────────────────────────────────────────

  const speakText = useCallback((text: string, onDone?: () => void) => {
    if (!window.speechSynthesis) { onDone?.(); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.lang = "en-US";
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => { setIsSpeaking(false); onDone?.(); };
    utterance.onerror = () => { setIsSpeaking(false); onDone?.(); };
    window.speechSynthesis.speak(utterance);
  }, []);

  const startListening = useCallback(() => {
    if (callStateRef.current !== "active") return;
    if (mutedRef.current) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionClass: any =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      toast.error("Speech recognition is not supported in this browser. Try Chrome, Edge, or Safari.");
      return;
    }

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript.trim();
      if (!transcript || callStateRef.current !== "active") return;
      setIsListening(false);
      setVoiceStatus(`You said: "${transcript}"`);

      const userMsg: ChatMessage = { id: `vm_${Date.now()}`, role: "user", content: transcript };
      setVoiceMessages(prev => [...prev, userMsg]);

      try {
        setVoiceStatus("Agent is thinking…");
        const payload = await authenticatedFetch<ChatPayload>(`/v1/agents/${id}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "user", content: transcript }],
            conversationId: voiceConvIdRef.current,
            stream: false,
            isVoiceCall: true,
          }),
        });

        voiceConvIdRef.current = payload.conversationId;
        const aiMsg: ChatMessage = { id: `vm_${Date.now() + 1}`, role: "ai", content: payload.message.content };
        setVoiceMessages(prev => [...prev, aiMsg]);

        setVoiceStatus("Agent speaking…");
        speakText(payload.message.content, () => {
          setVoiceStatus("Listening…");
          if (callStateRef.current === "active") {
            setTimeout(() => startListening(), 300);
          }
        });
      } catch {
        if (callStateRef.current === "active") {
          setVoiceStatus("Error — listening again…");
          setTimeout(() => startListening(), 1000);
        }
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      if (callStateRef.current === "active") {
        setVoiceStatus("Listening…");
        setTimeout(() => startListening(), 500);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    setVoiceStatus("Listening…");
  }, [id, speakText]);

  const startCall = async () => {
    // Check for Speech Recognition support first
    const hasSpeechRecognition =
      "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
    if (!hasSpeechRecognition) {
      toast.error("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      setCallState("connecting");
      callStateRef.current = "connecting";
      setCallDuration(0);
      setPostCallSummary(null);
      setVoiceMessages([]);
      voiceConvIdRef.current = undefined;

      setTimeout(() => {
        setCallState("active");
        callStateRef.current = "active";
        timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);

        // Greet the user then start listening
        speakText(`Hi! I'm ${agentName}. How can I help you today?`, () => {
          setVoiceStatus("Listening…");
          startListening();
        });
      }, 1000);
    } catch {
      toast.error("Microphone access denied. Please allow microphone access to start a voice call.");
    }
  };

  const endCall = () => {
    // Stop recognition
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    recognitionRef.current = null;

    // Stop speech synthesis
    try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }

    // Stop media stream
    mediaStreamRef.current?.getTracks().forEach(t => t.stop());
    mediaStreamRef.current = null;

    // Stop timer
    if (timerRef.current) clearInterval(timerRef.current);

    callStateRef.current = "ended";
    setCallState("ended");
    setIsListening(false);
    setIsSpeaking(false);
    setVoiceStatus("");

    const dur = callDuration;
    const msgCount = voiceMessages.length;
    setPostCallSummary(
      `Call lasted ${Math.floor(dur / 60)}m ${dur % 60}s. ${msgCount} messages exchanged during the session.`
    );
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    mutedRef.current = next;
    if (next) {
      // Muting: stop current recognition
      try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    } else {
      // Unmuting: restart listening if in active call
      if (callStateRef.current === "active" && !isSpeaking) {
        setTimeout(() => startListening(), 200);
      }
    }
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
            <h1 className="text-sm font-bold text-foreground">{agentName} — Test Environment</h1>
            <p className="text-xs text-muted-foreground">Live backend responses · Uses this agent's system prompt</p>
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

      {agentMode === "loading" ? (
        <div className="bg-white rounded-xl border border-border px-4 py-3 text-sm text-muted-foreground">
          Loading agent configuration...
        </div>
      ) : null}

      {agentLoadError ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          {agentLoadError}
        </div>
      ) : null}

      {chatError ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          {chatError}
        </div>
      ) : null}

      {mode === "chat" ? (
        <div className="flex gap-4 flex-1 min-h-0" style={{ height: "calc(100vh - 12rem)" }}>
          {/* Chat panel */}
          <div className="flex-1 bg-white rounded-xl border border-border flex flex-col min-h-0">
            <div className="px-4 py-3 border-b border-border shrink-0">
              <span className="text-xs font-medium text-muted-foreground">Chat with {agentName}</span>
            </div>
            <div className="px-4 py-2 border-b border-border shrink-0 bg-slate-50">
              <p className="text-xs text-muted-foreground font-mono">{systemPrompt}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-2">
                  <Bot className="w-10 h-10 opacity-20" />
                  <p className="text-sm">Send a message to start testing {agentName}</p>
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
                placeholder={`Message ${agentName}...`}
                className="flex-1 px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-convix-500 bg-muted/30" />
              <button onClick={sendMessage} disabled={!input.trim() || thinking || agentMode !== "ready"}
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
                    <span className="text-xs font-semibold text-foreground">{latestAI.tokens ?? "n/a"}</span>
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
              {knowledgeItems.length > 0 ? (
                <div className="space-y-2">
                  {knowledgeItems.map(item => (
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
          <div className="flex-1 bg-white rounded-xl border border-border flex flex-col min-h-0">
            {/* Voice conversation transcript */}
            {voiceMessages.length > 0 && (
              <div className="flex-1 overflow-y-auto p-4 space-y-3 border-b border-border">
                {voiceMessages.map(msg => (
                  <div key={msg.id} className={cn("flex gap-2 max-w-[85%]", msg.role === "user" ? "self-start" : "self-end ml-auto flex-row-reverse")}>
                    <div className={cn("w-6 h-6 rounded-full flex items-center justify-center shrink-0",
                      msg.role === "user" ? "bg-muted" : "bg-convix-100"
                    )}>
                      {msg.role === "user" ? <User className="w-3 h-3 text-muted-foreground" /> : <Bot className="w-3 h-3 text-convix-600" />}
                    </div>
                    <div className={cn("rounded-xl px-3 py-2 text-xs leading-relaxed",
                      msg.role === "user" ? "bg-muted text-foreground" : "bg-convix-600 text-white"
                    )}>
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Voice call controls */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6">
              {callState === "idle" && (
                <>
                  <div className="w-24 h-24 rounded-full bg-convix-50 flex items-center justify-center">
                    <Bot className="w-12 h-12 text-convix-400" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-foreground">{agentName}</p>
                    <p className="text-sm text-muted-foreground mt-1">Click Start Call to connect via microphone</p>
                    <p className="text-xs text-muted-foreground mt-1">Requires microphone permission · Chrome recommended</p>
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
                  <p className="text-sm text-muted-foreground animate-pulse">Connecting to {agentName}...</p>
                </>
              )}

              {callState === "active" && (
                <>
                  <div className="relative w-24 h-24">
                    {isListening && (
                      <>
                        <div className="absolute inset-0 rounded-full bg-green-200 animate-ping opacity-30" />
                        <div className="absolute inset-2 rounded-full bg-green-100 animate-ping opacity-40" style={{ animationDelay: "0.2s" }} />
                      </>
                    )}
                    {isSpeaking && (
                      <>
                        <div className="absolute inset-0 rounded-full bg-convix-200 animate-ping opacity-30" />
                        <div className="absolute inset-2 rounded-full bg-convix-100 animate-ping opacity-40" style={{ animationDelay: "0.2s" }} />
                      </>
                    )}
                    <div className={cn("relative w-24 h-24 rounded-full border-2 flex items-center justify-center",
                      isListening ? "bg-green-50 border-green-200" : isSpeaking ? "bg-convix-50 border-convix-200" : "bg-muted border-border"
                    )}>
                      <Bot className={cn("w-12 h-12", isListening ? "text-green-600" : isSpeaking ? "text-convix-600" : "text-muted-foreground")} />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-foreground">In call with {agentName}</p>
                    <div className="flex items-center gap-1.5 justify-center mt-1">
                      <Timer className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-sm font-mono text-muted-foreground">{formatDuration(callDuration)}</span>
                    </div>
                    {voiceStatus && (
                      <p className={cn("text-xs mt-2 font-medium",
                        isListening ? "text-green-600" : isSpeaking ? "text-convix-600" : "text-muted-foreground"
                      )}>
                        {voiceStatus}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <button onClick={toggleMute}
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
                  <button onClick={() => { setCallState("idle"); setCallDuration(0); setPostCallSummary(null); setVoiceMessages([]); }}
                    className="px-5 py-2 bg-convix-600 text-white text-sm font-medium rounded-lg hover:bg-convix-700 transition-colors">
                    Start New Call
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Voice debug sidebar */}
          <div className="w-64 space-y-3 shrink-0">
            <div className="bg-white rounded-xl border border-border p-4">
              <h3 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wide">Call Info</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className={cn("font-medium", callState === "active" ? "text-green-600" : "text-foreground")}>{callState}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Duration</span><span className="font-medium font-mono">{formatDuration(callDuration)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Agent</span><span className="font-medium">{agentName}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Mic</span><span className={cn("font-medium", muted ? "text-red-600" : "text-green-600")}>{muted ? "Muted" : "Active"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Listening</span><span className={cn("font-medium", isListening ? "text-green-600" : "text-muted-foreground")}>{isListening ? "Yes" : "No"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Speaking</span><span className={cn("font-medium", isSpeaking ? "text-convix-600" : "text-muted-foreground")}>{isSpeaking ? "Yes" : "No"}</span></div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-border p-4">
              <h3 className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">Agent Knowledge</h3>
              {knowledgeItems.length > 0 ? knowledgeItems.map(item => (
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
