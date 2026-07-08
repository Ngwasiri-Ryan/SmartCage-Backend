import { Controller, Get, Post, Param, Body, UploadedFiles, UseInterceptors, ParseIntPipe } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { PersonnelService } from './personnel.service';

@Controller('personnel')
export class PersonnelController {
  constructor(private readonly personnelService: PersonnelService) {}

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'front', maxCount: 1 },
      { name: 'left', maxCount: 1 },
      { name: 'right', maxCount: 1 },
    ]),
  )
  create(
    @Body() body: { name: string; role: string },
    @UploadedFiles() files: { front?: any[]; left?: any[]; right?: any[] },
  ) {
    return this.personnelService.registerWithFaces(
      body.name,
      body.role,
      files.front?.[0],
      files.left?.[0],
      files.right?.[0],
    );
  }

  @Get()
  findAll() {
    return this.personnelService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.personnelService.findOne(id);
  }
}
