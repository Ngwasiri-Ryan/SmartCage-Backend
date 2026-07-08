import { Module } from '@nestjs/common';
import { HealthAlertsService } from './health-alerts.service';
import { HealthAlertsController } from './health-alerts.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [PrismaModule, GatewayModule],
  controllers: [HealthAlertsController],
  providers: [HealthAlertsService],
  exports: [HealthAlertsService],
})
export class HealthAlertsModule {}
