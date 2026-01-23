import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Emit agent status update to all connected clients
   */
  emitAgentStatusUpdate(agentId: string, status: string) {
    this.server.emit('agent:status', {
      agentId,
      status,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit agent heartbeat to all connected clients
   */
  emitAgentHeartbeat(agentId: string, data: any) {
    this.server.emit('agent:heartbeat', {
      agentId,
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit agent enrolled event
   */
  emitAgentEnrolled(agent: any) {
    this.server.emit('agent:enrolled', {
      agent,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit agent deleted event
   */
  emitAgentDeleted(agentId: string) {
    this.server.emit('agent:deleted', {
      agentId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit session started event
   */
  emitSessionStarted(session: any) {
    this.server.emit('session:started', {
      session,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit session ended event
   */
  emitSessionEnded(sessionId: string) {
    this.server.emit('session:ended', {
      sessionId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Subscribe to agent updates
   */
  @SubscribeMessage('subscribe:agents')
  handleSubscribeAgents(client: Socket) {
    this.logger.log(`Client ${client.id} subscribed to agent updates`);
    client.join('agents');
    return { subscribed: true };
  }

  /**
   * Unsubscribe from agent updates
   */
  @SubscribeMessage('unsubscribe:agents')
  handleUnsubscribeAgents(client: Socket) {
    this.logger.log(`Client ${client.id} unsubscribed from agent updates`);
    client.leave('agents');
    return { unsubscribed: true };
  }
}
