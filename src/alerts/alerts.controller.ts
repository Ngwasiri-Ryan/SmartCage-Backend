import { Controller, Delete, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { AlertsService } from './alerts.service';

@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  findAll() {
    return this.alertsService.findAll();
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  deleteAll() {
    return this.alertsService.deleteAll();
  }
}
