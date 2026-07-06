import { Module } from '@nestjs/common';
import { TelemetryController } from './telemetry.controller';
import { TelemetryService } from './telemetry.service';
import { AlertsModule } from '../alerts/alerts.module';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [AlertsModule, GatewayModule],
  controllers: [TelemetryController],
  providers: [TelemetryService],
  exports: [TelemetryService],
})
export class TelemetryModule { }
