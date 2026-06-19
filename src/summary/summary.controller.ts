import { Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { SummaryService } from './summary.service';

@Controller('summary')
export class SummaryController {
  constructor(private readonly summaryService: SummaryService) {}

  @Get('today')
  getToday() {
    return this.summaryService.getToday();
  }

  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  generate() {
    return this.summaryService.generate();
  }
}
