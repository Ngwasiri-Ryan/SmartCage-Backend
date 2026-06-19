import { Controller, Get } from '@nestjs/common';
import { RelayService } from './relay.service';

@Controller('relay')
export class RelayController {
  constructor(private readonly relayService: RelayService) {}

  @Get('state')
  getState() {
    return this.relayService.getState();
  }
}
