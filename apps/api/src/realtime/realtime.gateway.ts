import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { JwtPayload, canSeeAllConversations } from '@else-chat/shared';

@WebSocketGateway({
  cors: {
    origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),
    credentials: true,
  },
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private jwt: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.headers.authorization || '').replace('Bearer ', '');
      if (!token) {
        client.disconnect();
        return;
      }
      const payload = await this.jwt.verifyAsync<JwtPayload>(token);
      client.data.user = payload;
      if (payload.tenantId) {
        client.join(`tenant:${payload.tenantId}`);
        client.join(`user:${payload.sub}`);
      }
      this.logger.log(`WS connected ${payload.email}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const email = client.data?.user?.email;
    if (email) this.logger.log(`WS disconnected ${email}`);
  }

  emitToTenant(tenantId: string, event: string, data: unknown) {
    this.server.to(`tenant:${tenantId}`).emit(event, data);
  }

  emitConversationMessage(
    conversation: {
      id: string;
      tenantId: string;
      assignedToId: string | null;
      status: string;
    },
    message: unknown,
  ) {
    const payload = { conversationId: conversation.id, message };

    // Broadcast to tenant room — clients filter by role/assignment
    this.server
      .to(`tenant:${conversation.tenantId}`)
      .emit('message.created', {
        ...payload,
        visibility: {
          conversationId: conversation.id,
          assignedToId: conversation.assignedToId,
          status: conversation.status,
        },
      });
  }

  shouldDeliverToUser(
    user: JwtPayload,
    visibility: {
      assignedToId: string | null;
      status: string;
    },
  ) {
    if (canSeeAllConversations(user.role)) return true;
    if (visibility.status === 'WAITING') return true;
    return visibility.assignedToId === user.sub;
  }
}
