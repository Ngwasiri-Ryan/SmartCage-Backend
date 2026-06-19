import { Module } from '@nestjs/common';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';
import { AlertsModule } from '../alerts/alerts.module';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [AlertsModule, GatewayModule],
  controllers: [FeedController],
  providers: [FeedService],
})
export class FeedModule {}
