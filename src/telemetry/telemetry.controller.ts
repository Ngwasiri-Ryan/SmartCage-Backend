import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TelemetryService } from './telemetry.service';
import { CreateTelemetryDto } from './dto/create-telemetry.dto';

@Controller('telemetry')
export class TelemetryController {
  constructor(private readonly telemetryService: TelemetryService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateTelemetryDto) {
    return this.telemetryService.create(dto);
  }

  @Get('latest')
  getLatest() {
    return this.telemetryService.getLatest();
  }

  @Get('history')
  getHistory(@Query('hours') hours?: string) {
    const h = hours ? Math.min(parseInt(hours, 10), 168) : 24;
    return this.telemetryService.getHistory(h);
  }
}
