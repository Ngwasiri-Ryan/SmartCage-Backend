import { Controller, Get, Post, Param, Body, UploadedFile, UseInterceptors, ParseIntPipe } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PersonnelService } from './personnel.service';

@Controller('personnel')
export class PersonnelController {
  constructor(private readonly personnelService: PersonnelService) {}

  @Post()
  create(@Body() body: { name: string; role: string }) {
    return this.personnelService.create(body);
  }

  @Get()
  findAll() {
    return this.personnelService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.personnelService.findOne(id);
  }

  @Post(':id/face')
  @UseInterceptors(FileInterceptor('file'))
  addFace(
    @Param('id', ParseIntPipe) id: number,
    @Body('angle') angle: string,
    @UploadedFile() file: any,
  ) {
    return this.personnelService.addFace(id, angle, file);
  }
}
