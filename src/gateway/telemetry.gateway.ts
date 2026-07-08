import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: process.env.WS_CORS_ORIGIN ?? '*',
  },
})
export class TelemetryGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TelemetryGateway.name);

  afterInit() {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // ─── Emit Methods (called by services) ───────────────────────────────────

  emitTelemetryUpdate(data: object) {
    this.server.emit('telemetry:update', data);
  }

  emitFeedUpdate(data: object) {
    this.server.emit('feed:update', data);
  }

  emitAlertNew(data: object) {
    this.server.emit('alert:new', data);
  }

  emitHealthAlert(data: object) {
    this.server.emit('health-alert:new', data);
  }

  emitAccessLog(data: object) {
    this.server.emit('access-log:new', data);
  }

  emitRelayChange(data: { fanActive: boolean; heaterActive: boolean }) {
    this.server.emit('relay:change', {
      ...data,
      changedAt: new Date().toISOString(),
    });
  }
}
