import { Server } from 'socket.io';

let _io: Server | null = null;

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
