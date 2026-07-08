import { Controller, Get, Post, Body, UploadedFile, UseInterceptors, ParseIntPipe } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AccessLogsService } from './access-logs.service';

@Controller('access-logs')
export class AccessLogsController {
  constructor(private readonly accessLogsService: AccessLogsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  create(
    @Body('cameraId', ParseIntPipe) cameraId: number,
    @Body('personnelId') personnelId: string,
    @Body('isAuthorized') isAuthorized: string,
    @Body('matchedName') matchedName: string,
    @UploadedFile() file: any,
  ) {
    const parsedPersonnelId = personnelId ? parseInt(personnelId, 10) : NaN;
    return this.accessLogsService.create({
      cameraId,
      personnelId: isNaN(parsedPersonnelId) ? undefined : parsedPersonnelId,
      isAuthorized: isAuthorized === 'true',
      matchedName,
      file,
    });
  }

  @Get()
  findAll() {
    return this.accessLogsService.findAll();
  }
}
