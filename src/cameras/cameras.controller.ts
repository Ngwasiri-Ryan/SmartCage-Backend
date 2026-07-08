import { Controller, Get, Post, Patch, Delete, Param, Body, ParseIntPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { CamerasService } from './cameras.service';

@Controller('cameras')
export class CamerasController {
  constructor(private readonly camerasService: CamerasService) {}

  @Post()
  create(@Body() body: { name: string; rtspUrl: string; zone: string }) {
    return this.camerasService.create(body);
  }

  @Get()
  findAll() {
    return this.camerasService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.camerasService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string; rtspUrl?: string; zone?: string; active?: boolean },
  ) {
    return this.camerasService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.camerasService.delete(id);
  }
}
