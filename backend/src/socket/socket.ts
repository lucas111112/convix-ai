import { Server } from 'socket.io';
import type { Server as HttpServer } from 'http';
import { env } from '../config/env';
import { logger } from '../lib/logger';
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

      if (!payload.workspaceId) {
        return next(new Error('NO_WORKSPACE'));
      }

      next();
    } catch {
      next(new Error('INVALID_TOKEN'));
    }
  });

  io.on('connection', (socket) => {
    const { workspaceId } = socket.data as { workspaceId: string; userId: string };

    // Auto-join workspace room
    socket.join(`ws:${workspaceId}`);
    logger.debug({ workspaceId, socketId: socket.id }, 'Client connected to workspace room');

    // Allow joining a specific conversation room for focused monitoring
    socket.on('join_conversation', (conversationId: string) => {
      socket.join(`conv:${conversationId}`);
      logger.debug({ conversationId, socketId: socket.id }, 'Client joined conversation room');
    });

    socket.on('leave_conversation', (conversationId: string) => {
      socket.leave(`conv:${conversationId}`);
      logger.debug({ conversationId, socketId: socket.id }, 'Client left conversation room');
    });

    socket.on('disconnect', (reason) => {
      logger.debug({ socketId: socket.id, reason }, 'Client disconnected');
    });
  });

  return io;
}
