import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { GatewayModule } from './gateway/gateway.module';
import { TelemetryModule } from './telemetry/telemetry.module';
import { FeedModule } from './feed/feed.module';
import { AlertsModule } from './alerts/alerts.module';
import { RelayModule } from './relay/relay.module';
import { SummaryModule } from './summary/summary.module';

@Module({
  imports: [
    PrismaModule,    // Global — PrismaService available everywhere
    GatewayModule,   // Global gateway — TelemetryGateway available everywhere
    AlertsModule,
    TelemetryModule,
    FeedModule,
    RelayModule,
    SummaryModule,
  ],
})
export class AppModule {}
