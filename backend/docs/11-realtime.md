# Real-Time Layer (Socket.io)

Socket.io powers live updates in the dashboard — incoming messages, handoff alerts, agent status changes, and credit balance updates. The widget itself uses SSE (not Socket.io) for streaming responses.

## Architecture

```
Dashboard browser
       │  socket.io-client
       ▼
Socket.io Server (same Express process)
       │
   authenticate socket (JWT from handshake)
       │
   join workspace room: `ws:{workspaceId}`
   join conversation room (optional): `conv:{conversationId}`
       │
Backend services emit events to rooms
when things happen (new message, handoff, etc.)
```

---

## Socket.io Setup

```ts
// src/socket/socket.ts
import { Server } from 'socket.io';
import type { Server as HttpServer } from 'http';
import { verifyAccessToken } from '../services/auth/token.service';

export function createSocketServer(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: env.FRONTEND_URL,
      credentials: true,
    },
    path: '/socket.io',
  });

  // Auth middleware — verify JWT passed in handshake
  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;
    if (!token) return next(new Error('MISSING_TOKEN'));

    try {
      const payload = verifyAccessToken(token);
      socket.data.userId = payload.sub;
      socket.data.workspaceId = payload.workspaceId;
      next();
    } catch {
      next(new Error('INVALID_TOKEN'));
    }
  });

  io.on('connection', (socket) => {
    const { workspaceId } = socket.data;

    // Auto-join workspace room
    socket.join(`ws:${workspaceId}`);

    // Allow joining a specific conversation room for focused monitoring
    socket.on('join_conversation', (conversationId: string) => {
      socket.join(`conv:${conversationId}`);
    });

    socket.on('leave_conversation', (conversationId: string) => {
      socket.leave(`conv:${conversationId}`);
    });

    socket.on('disconnect', () => {
      // Socket.io handles room cleanup automatically
    });
  });

  return io;
}
```

---

## Event Catalogue

All events are emitted from backend services — never from the client. The client only emits `join_conversation` and `leave_conversation`.

### `new_message`
Emitted when the AI (or human agent) sends a message in any conversation.

**Room**: `ws:{workspaceId}` and `conv:{conversationId}`

```ts
io.to(`ws:${workspaceId}`).to(`conv:${conversationId}`).emit('new_message', {
  conversationId: string,
  message: {
    id: string,
    role: 'ASSISTANT' | 'SYSTEM' | 'HUMAN_AGENT',
    content: string,
    confidence?: number,
    latencyMs?: number,
    createdAt: string,
  },
});
```

---

### `user_message`
Emitted when a user message arrives from any channel (so dashboard shows it live).

**Room**: `ws:{workspaceId}`

```ts
io.to(`ws:${workspaceId}`).emit('user_message', {
  conversationId: string,
  message: {
    id: string,
    role: 'USER',
    content: string,
    channelType: ChannelType,
    createdAt: string,
  },
});
```

---

### `handoff_triggered`
Emitted when a conversation is handed off.

**Room**: `ws:{workspaceId}`

```ts
io.to(`ws:${workspaceId}`).emit('handoff_triggered', {
  conversationId: string,
  handoffId: string,
  trigger: HandoffTrigger,
  destination: HandoffDest,
  summary: string,
  agentId: string,
});
```

---

### `conversation_status_changed`
Emitted when a conversation's status changes (OPEN → HANDED_OFF → RESOLVED, etc.).

**Room**: `ws:{workspaceId}`

```ts
io.to(`ws:${workspaceId}`).emit('conversation_status_changed', {
  conversationId: string,
  status: ConversationStatus,
  updatedAt: string,
});
```

---

### `agent_status_changed`
Emitted when an agent is activated or deactivated.

**Room**: `ws:{workspaceId}`

```ts
io.to(`ws:${workspaceId}`).emit('agent_status_changed', {
  agentId: string,
  status: 'ACTIVE' | 'INACTIVE',
});
```

---

### `credits_updated`
Emitted after every credit deduction so the dashboard balance updates live.

**Room**: `ws:{workspaceId}`

```ts
io.to(`ws:${workspaceId}`).emit('credits_updated', {
  balance: number,
  delta: number,
  reason: CreditReason,
});
```

---

## Socket Service (used by backend services)

```ts
// src/services/realtime/socket.service.ts
let _io: Server;

export function setSocketServer(io: Server): void {
  _io = io;
}

export const socketService = {
  emitToWorkspace<T>(workspaceId: string, event: string, data: T): void {
    _io?.to(`ws:${workspaceId}`).emit(event, data);
  },

  emitToConversation<T>(conversationId: string, event: string, data: T): void {
    _io?.to(`conv:${conversationId}`).emit(event, data);
  },
};
```

Usage in `src/index.ts`:

```ts
const httpServer = createServer(app);
const io = createSocketServer(httpServer);
setSocketServer(io);
httpServer.listen(env.PORT);
```

---

## Frontend Usage (Next.js)

```ts
// frontend/lib/socket.ts
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(accessToken: string): Socket {
  if (socket?.connected) return socket;

  socket = io(process.env.NEXT_PUBLIC_SOCKET_URL!, {
    auth: { token: accessToken },
    transports: ['websocket'],
  });

  return socket;
}
```

In a dashboard component:

```ts
useEffect(() => {
  const s = getSocket(accessToken);

  s.on('handoff_triggered', (data) => {
    toast.error(`Handoff: ${data.trigger}`, { description: data.summary });
  });

  s.on('credits_updated', ({ balance }) => {
    setCreditBalance(balance);
  });

  return () => {
    s.off('handoff_triggered');
    s.off('credits_updated');
  };
}, []);
```

---

## Scaling Considerations

When running multiple backend instances (horizontal scaling), Socket.io rooms need to be shared across processes. Use the Redis adapter:

```ts
import { createAdapter } from '@socket.io/redis-adapter';

const pubClient = redis.duplicate();
const subClient = redis.duplicate();
io.adapter(createAdapter(pubClient, subClient));
```

This ensures that an event emitted from instance A reaches clients connected to instance B.
