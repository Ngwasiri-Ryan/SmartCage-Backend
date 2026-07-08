import { Module } from '@nestjs/common';
import { PersonnelService } from './personnel.service';
import { PersonnelController } from './personnel.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AIGatewayModule } from '../ai-gateway/ai-gateway.module';

@Module({
  imports: [PrismaModule, AIGatewayModule],
  controllers: [PersonnelController],
  providers: [PersonnelService],
  exports: [PersonnelService],
})
export class PersonnelModule {}
