import { Controller, Get, Post, Body, Query, UploadedFile, UseInterceptors, ParseIntPipe, Optional } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { HealthAlertsService } from './health-alerts.service';

@Controller('health-alerts')
export class HealthAlertsController {
  constructor(private readonly healthAlertsService: HealthAlertsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  create(
    @Body('cameraId', ParseIntPipe) cameraId: number,
    @Body('movementScore') movementScore: string,
    @Body('description') description: string,
    @UploadedFile() file: any,
  ) {
    const scoreVal = parseFloat(movementScore);
    return this.healthAlertsService.create({
      cameraId,
      movementScore: isNaN(scoreVal) ? 0.0 : scoreVal,
      description,
      file,
    });
  }

  @Get()
  findAll(@Query('cameraId') cameraId?: string) {
    const parsedId = cameraId ? parseInt(cameraId, 10) : NaN;
    return this.healthAlertsService.findAll(isNaN(parsedId) ? undefined : parsedId);
  }
}
