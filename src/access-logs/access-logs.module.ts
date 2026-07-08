import { Module } from '@nestjs/common';
import { AccessLogsService } from './access-logs.service';
import { AccessLogsController } from './access-logs.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [PrismaModule, GatewayModule],
  controllers: [AccessLogsController],
  providers: [AccessLogsService],
  exports: [AccessLogsService],
})
export class AccessLogsModule {}
