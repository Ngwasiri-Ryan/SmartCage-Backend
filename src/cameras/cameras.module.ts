import { Module } from '@nestjs/common';
import { CamerasService } from './cameras.service';
import { CamerasController } from './cameras.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AIGatewayModule } from '../ai-gateway/ai-gateway.module';

@Module({
  imports: [PrismaModule, AIGatewayModule],
  controllers: [CamerasController],
  providers: [CamerasService],
  exports: [CamerasService],
})
export class CamerasModule {}
