import { Module } from '@nestjs/common';
import { AIGatewayService } from './ai-gateway.service';

@Module({
  providers: [AIGatewayService],
  exports: [AIGatewayService],
})
export class AIGatewayModule {}
