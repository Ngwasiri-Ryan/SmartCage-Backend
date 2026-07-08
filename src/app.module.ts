import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { GatewayModule } from './gateway/gateway.module';
import { TelemetryModule } from './telemetry/telemetry.module';
import { FeedModule } from './feed/feed.module';
import { AlertsModule } from './alerts/alerts.module';
import { RelayModule } from './relay/relay.module';
import { SummaryModule } from './summary/summary.module';
import { CamerasModule } from './cameras/cameras.module';
import { PersonnelModule } from './personnel/personnel.module';
import { HealthAlertsModule } from './health-alerts/health-alerts.module';
import { AccessLogsModule } from './access-logs/access-logs.module';
import { AIGatewayModule } from './ai-gateway/ai-gateway.module';

@Module({
  imports: [
    PrismaModule,    // Global — PrismaService available everywhere
    GatewayModule,   // Global gateway — TelemetryGateway available everywhere
    AlertsModule,
    TelemetryModule,
    FeedModule,
    RelayModule,
    SummaryModule,
    CamerasModule,
    PersonnelModule,
    HealthAlertsModule,
    AccessLogsModule,
    AIGatewayModule,
  ],
})
export class AppModule {}
