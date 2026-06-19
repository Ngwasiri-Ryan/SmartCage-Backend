import {
  Body,
  Controller,
  Get,
  Post,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FeedService } from './feed.service';
import { CreateFeedDto } from './dto/create-feed.dto';

@Controller('feed')
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Post('reading')
  @HttpCode(HttpStatus.CREATED)
  createReading(@Body() dto: CreateFeedDto) {
    return this.feedService.createReading(dto);
  }

  @Get('today')
  getToday() {
    return this.feedService.getToday();
  }

  @Get('history')
  getHistory() {
    return this.feedService.getHistory();
  }
}
