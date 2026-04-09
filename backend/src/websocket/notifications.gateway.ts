import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/notifications',
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private connectedClients = new Map<string, string>();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (token) {
        const payload = this.jwtService.verify(token, {
          secret: this.configService.get<string>('jwt.secret') ?? 'fallback_secret',
        });
        this.connectedClients.set(client.id, payload.sub);
        client.join(`user:${payload.sub}`);
        this.logger.log(`Client connected: ${client.id} (user: ${payload.sub})`);
      } else {
        client.join('public');
        this.logger.log(`Anonymous client connected: ${client.id}`);
      }
    } catch {
      client.join('public');
      this.logger.warn(`Client connected without valid token: ${client.id}`);
    }
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    this.logger.log(`Ping from ${client.id}`);
    client.emit('pong', { message: 'pong', timestamp: new Date(), data });
  }

  notifyUserCreated(user: any) {
    this.server.emit('notification', {
      type: 'USER_CREATED',
      message: `New user created: ${user.firstName} ${user.lastName}`,
      data: user,
      timestamp: new Date(),
    });
    this.logger.log(`Notification sent: USER_CREATED for ${user.email}`);
  }

  notifyUserUpdated(user: any) {
    this.server.emit('notification', {
      type: 'USER_UPDATED',
      message: `User updated: ${user.firstName} ${user.lastName}`,
      data: user,
      timestamp: new Date(),
    });
    this.logger.log(`Notification sent: USER_UPDATED for ${user.email}`);
  }

  notifyUserDeleted(userId: string) {
    this.server.emit('notification', {
      type: 'USER_DELETED',
      message: `User deleted with ID: ${userId}`,
      data: { userId },
      timestamp: new Date(),
    });
    this.logger.log(`Notification sent: USER_DELETED for ${userId}`);
  }

  notifyLogin(user: any) {
    this.server.to(`user:${user.id}`).emit('notification', {
      type: 'LOGIN_SUCCESS',
      message: `Welcome back, ${user.firstName}!`,
      data: { userId: user.id },
      timestamp: new Date(),
    });
  }
}