export {
  UserRole,
  Plan,
  AgentStatus,
  AgentMode,
  HandoffDest,
  ChannelType,
  KnowledgeType,
  KnowledgeStatus,
  ConversationStatus,
  MessageRole,
  HandoffTrigger,
  CreditReason,
} from '@prisma/client';

export interface InboundMessage {
  channelType: import('@prisma/client').ChannelType;
  customerId: string;
  customerName?: string;
  content: string;
  externalId?: string;
  metadata?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    pages: number;
    limit: number;
  };
}
