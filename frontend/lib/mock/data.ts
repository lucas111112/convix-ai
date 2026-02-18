// TODO: REPLACE WITH API — all exports in this file come from real API endpoints in Phase 3

export type ConversationStatus = "active" | "handed_off" | "resolved" | "abandoned";
export type ChannelType = "web" | "whatsapp" | "sms" | "instagram" | "messenger" | "email";

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
  sentiment: number;
  intentScore: number;
  revenueAttributed: number;
  handoffReason?: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
}

// TODO: REPLACE WITH API — GET /stores/:id/conversations
export const mockConversations: Conversation[] = [
  {
    id: "conv_001",
    customerName: "Emma Rodriguez",
    customerEmail: "emma@example.com",
    channel: "web",
    status: "resolved",
    lastMessage: "Thank you so much, that's exactly what I needed!",
    messageCount: 8,
    sentiment: 0.87,
    intentScore: 0.92,
    revenueAttributed: 149.99,
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    messages: [
      { id: "m1", role: "user", content: "Hi! Do you have the Aria Sneakers in size 9?", timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
      { id: "m2", role: "ai", content: "Hey Emma! Yes, we have the Aria Sneakers in size 9 in both White/Gold and Black/Silver. They're one of our best sellers! Would you like me to add them to your cart?", confidence: 0.95, timestamp: new Date(Date.now() - 1000 * 60 * 14).toISOString() },
      { id: "m3", role: "user", content: "What's the return policy if they don't fit?", timestamp: new Date(Date.now() - 1000 * 60 * 13).toISOString() },
      { id: "m4", role: "ai", content: "Great question! We offer free returns within 30 days of purchase. If they don't fit perfectly, just use the prepaid label in your package. Exchanges are also free and ship within 2 business days.", confidence: 0.97, timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString() },
      { id: "m5", role: "user", content: "Perfect, I'll take the White/Gold!", timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString() },
      { id: "m6", role: "ai", content: "Awesome choice! I've added the Aria Sneakers (White/Gold, Size 9) to your cart. Your total comes to $149.99 with free shipping. Ready to checkout?", confidence: 0.98, timestamp: new Date(Date.now() - 1000 * 60 * 9).toISOString() },
      { id: "m7", role: "user", content: "Thank you so much, that's exactly what I needed!", timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
      { id: "m8", role: "ai", content: "You're welcome! Your order is confirmed. You'll receive a shipping confirmation within 24 hours. Enjoy your new Arias! 🎉", confidence: 0.99, timestamp: new Date(Date.now() - 1000 * 60 * 4).toISOString() },
    ],
  },
  {
    id: "conv_002",
    customerName: "James Patel",
    customerEmail: "james.patel@email.com",
    channel: "whatsapp",
    status: "handed_off",
    lastMessage: "This is completely unacceptable. I want to speak to a manager.",
    messageCount: 6,
    sentiment: -0.72,
    intentScore: 0.15,
    revenueAttributed: 0,
    handoffReason: "Anger detected + unresolved after 3 attempts",
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    messages: [
      { id: "m1", role: "user", content: "My order #4892 was supposed to arrive 3 days ago and it's still not here!", timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString() },
      { id: "m2", role: "ai", content: "I'm so sorry about the delay, James! Let me check order #4892 right now... I can see it's currently with the carrier. There was an unexpected delay in your area due to weather. The updated ETA is tomorrow by 8 PM.", confidence: 0.71, timestamp: new Date(Date.now() - 1000 * 60 * 44).toISOString() },
      { id: "m3", role: "user", content: "I was told that yesterday too! This is completely unacceptable. I want to speak to a manager.", timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
      { id: "m4", role: "ai", content: "I completely understand your frustration, and I sincerely apologize. You're right to be upset. I'm connecting you with our customer support team right now — they'll be able to provide a full resolution.", confidence: 0.31, timestamp: new Date(Date.now() - 1000 * 60 * 29).toISOString() },
      { id: "m5", role: "human_agent", content: "Hi James, this is Sarah from the support team. I've reviewed your case and I'm escalating this to our logistics partner right now. I'll also be issuing a full refund of shipping costs and a $20 store credit for the inconvenience.", timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
      { id: "m6", role: "user", content: "Thank you Sarah. I appreciate that.", timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString() },
    ],
  },
  {
    id: "conv_003",
    customerName: "Aisha Okonkwo",
    customerEmail: "aisha.o@gmail.com",
    channel: "instagram",
    status: "active",
    lastMessage: "Do you ship internationally to Nigeria?",
    messageCount: 3,
    sentiment: 0.45,
    intentScore: 0.68,
    revenueAttributed: 0,
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 1).toISOString(),
    messages: [
      { id: "m1", role: "user", content: "Hi! I saw your post about the new summer collection 😍", timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
      { id: "m2", role: "ai", content: "Hey Aisha! So glad you love it 🌟 The summer collection just dropped — we have some amazing new pieces. Any styles catching your eye?", confidence: 0.94, timestamp: new Date(Date.now() - 1000 * 60 * 4).toISOString() },
      { id: "m3", role: "user", content: "Do you ship internationally to Nigeria?", timestamp: new Date(Date.now() - 1000 * 60 * 1).toISOString() },
    ],
  },
  {
    id: "conv_004",
    customerName: "Marcus Chen",
    customerEmail: "marcus.chen@work.com",
    channel: "sms",
    status: "resolved",
    lastMessage: "Got it, thanks!",
    messageCount: 4,
    sentiment: 0.6,
    intentScore: 0.55,
    revenueAttributed: 0,
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    messages: [
      { id: "m1", role: "user", content: "How do I cancel my subscription?", timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString() },
      { id: "m2", role: "ai", content: "Hi Marcus! To cancel your subscription, go to Account → Subscription → Cancel Plan. You'll retain access until the end of your billing period. Need help with anything else?", confidence: 0.91, timestamp: new Date(Date.now() - 1000 * 60 * 119).toISOString() },
      { id: "m3", role: "user", content: "What if I want to pause instead?", timestamp: new Date(Date.now() - 1000 * 60 * 100).toISOString() },
      { id: "m4", role: "ai", content: "Great option! You can pause for 1–3 months under Account → Subscription → Pause Plan. Your data stays safe and you can resume anytime.", confidence: 0.94, timestamp: new Date(Date.now() - 1000 * 60 * 98).toISOString() },
    ],
  },
  {
    id: "conv_005",
    customerName: "Sophie Turner",
    customerEmail: "sophiet@example.co.uk",
    channel: "web",
    status: "active",
    lastMessage: "Can I get a discount if I buy 3?",
    messageCount: 5,
    sentiment: 0.72,
    intentScore: 0.89,
    revenueAttributed: 0,
    createdAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    messages: [
      { id: "m1", role: "user", content: "I'm looking for a gift for my sister's birthday", timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString() },
      { id: "m2", role: "ai", content: "How lovely! What does she like? I can help you find the perfect gift from our collection.", confidence: 0.88, timestamp: new Date(Date.now() - 1000 * 60 * 7).toISOString() },
      { id: "m3", role: "user", content: "She loves skincare. Do you have gift sets?", timestamp: new Date(Date.now() - 1000 * 60 * 6).toISOString() },
      { id: "m4", role: "ai", content: "Yes! Our Glow Gift Set ($89) is a bestseller — it includes the Vitamin C serum, hyaluronic moisturizer, and eye cream. We also do free gift wrapping!", confidence: 0.96, timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
      { id: "m5", role: "user", content: "Can I get a discount if I buy 3?", timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString() },
    ],
  },
  {
    id: "conv_006",
    customerName: "Tyler Brooks",
    customerEmail: "tyler.b@outlook.com",
    channel: "messenger",
    status: "abandoned",
    lastMessage: "Never mind",
    messageCount: 2,
    sentiment: 0.1,
    intentScore: 0.2,
    revenueAttributed: 0,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2.5).toISOString(),
    messages: [
      { id: "m1", role: "user", content: "Do you have size XL in the cargo pants?", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString() },
      { id: "m2", role: "user", content: "Never mind", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2.5).toISOString() },
    ],
  },
];

// TODO: REPLACE WITH API — GET /stores/:id/analytics/overview
export const mockAnalyticsOverview = {
  totalConversations: 2847,
  conversationsChange: +18.4,
  revenueAttributed: 48920,
  revenueChange: +23.1,
  handoffRate: 6.8,
  handoffChange: -1.2,
  avgResponseTime: 1.3,
  responseTimeChange: -0.4,
  resolutionRate: 94.2,
  resolutionChange: +2.1,
  activeNow: 12,
};

// TODO: REPLACE WITH API — GET /stores/:id/analytics/volume
export const mockVolumeData = [
  { date: "Feb 11", conversations: 89, resolved: 82 },
  { date: "Feb 12", conversations: 102, resolved: 95 },
  { date: "Feb 13", conversations: 94, resolved: 88 },
  { date: "Feb 14", conversations: 128, resolved: 119 },
  { date: "Feb 15", conversations: 115, resolved: 107 },
  { date: "Feb 16", conversations: 97, resolved: 91 },
  { date: "Feb 17", conversations: 143, resolved: 132 },
  { date: "Feb 18", conversations: 156, resolved: 144 },
];

// TODO: REPLACE WITH API — GET /stores/:id/analytics/channels
export const mockChannelData = [
  { channel: "Web Chat", conversations: 1240, revenue: 22400, handoffRate: 5.2, color: "#6366f1" },
  { channel: "WhatsApp", conversations: 748, revenue: 14800, handoffRate: 8.1, color: "#25d366" },
  { channel: "Instagram", conversations: 412, revenue: 7200, handoffRate: 7.4, color: "#e1306c" },
  { channel: "SMS", conversations: 289, revenue: 3100, handoffRate: 4.9, color: "#3b82f6" },
  { channel: "Messenger", conversations: 158, revenue: 1420, handoffRate: 6.2, color: "#1877f2" },
];

// TODO: REPLACE WITH API — GET /stores/:id/analytics/questions
export const mockTopQuestions = [
  { question: "Where is my order?", count: 342, handoffRate: 3.2, category: "Order Tracking" },
  { question: "What is your return policy?", count: 289, handoffRate: 1.1, category: "Policy" },
  { question: "Do you ship internationally?", count: 198, handoffRate: 4.5, category: "Shipping" },
  { question: "How do I cancel my subscription?", count: 167, handoffRate: 8.4, category: "Account" },
  { question: "Do you have this in my size?", count: 154, handoffRate: 2.1, category: "Product" },
  { question: "Can I change my order?", count: 142, handoffRate: 12.3, category: "Order Management" },
  { question: "How long does shipping take?", count: 128, handoffRate: 0.8, category: "Shipping" },
];

// TODO: REPLACE WITH API — GET /stores/:id/channels
export const mockChannels = [
  { id: "ch_web", type: "web", name: "Web Chat", description: "Embedded widget on your website", isActive: true, conversations: 1240, icon: "💬" },
  { id: "ch_wa", type: "whatsapp", name: "WhatsApp", description: "WhatsApp Business via Meta Cloud API", isActive: true, conversations: 748, icon: "💚" },
  { id: "ch_ig", type: "instagram", name: "Instagram DMs", description: "Respond to Instagram direct messages", isActive: true, conversations: 412, icon: "📸" },
  { id: "ch_sms", type: "sms", name: "SMS", description: "Text messaging via Twilio", isActive: false, conversations: 0, icon: "📱" },
  { id: "ch_msg", type: "messenger", name: "Facebook Messenger", description: "Facebook Page messaging", isActive: false, conversations: 0, icon: "💙" },
  { id: "ch_email", type: "email", name: "Email", description: "Inbound email support", isActive: false, conversations: 0, icon: "📧" },
  { id: "ch_slack", type: "slack", name: "Slack", description: "B2B customer workspace messaging", isActive: false, conversations: 0, icon: "🟨" },
];

// TODO: REPLACE WITH API — GET /stores/:id/training
export const mockTrainingDocs = [
  { id: "doc_001", title: "Product FAQ", type: "FAQ", wordCount: 1240, status: "indexed", isActive: true, createdAt: "2024-01-15" },
  { id: "doc_002", title: "Return & Refund Policy", type: "POLICY", wordCount: 480, status: "indexed", isActive: true, createdAt: "2024-01-15" },
  { id: "doc_003", title: "Product Catalog Q1 2024", type: "PRODUCT_CATALOG", wordCount: 8920, status: "indexed", isActive: true, createdAt: "2024-02-01" },
  { id: "doc_004", title: "Shipping Information", type: "URL", wordCount: 320, status: "indexed", isActive: true, createdAt: "2024-02-10" },
  { id: "doc_005", title: "Size Guide", type: "MANUAL", wordCount: 560, status: "pending", isActive: false, createdAt: "2024-02-18" },
];
