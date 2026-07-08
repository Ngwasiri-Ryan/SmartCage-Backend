import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AIGatewayService } from '../ai-gateway/ai-gateway.service';

@Injectable()
export class CamerasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiGateway: AIGatewayService,
  ) {}

  async create(data: { name: string; rtspUrl: string; zone: string }) {
    const camera = await this.prisma.camera.create({
      data: {
        name: data.name,
        rtspUrl: data.rtspUrl,
        zone: data.zone,
        active: true,
      },
    });

    // Notify AI service to begin processing stream in background
    try {
      await this.aiGateway.startStream(camera.id, camera.rtspUrl);
    } catch (e) {
      console.warn(`[CamerasService] AI stream start failed: ${e.message}`);
    }

    return camera;
  }

  async findAll() {
    return this.prisma.camera.findMany();
  }

  async findOne(id: number) {
    const camera = await this.prisma.camera.findUnique({ where: { id } });
    if (!camera) throw new NotFoundException(`Camera #${id} not found`);
    return camera;
  }

  async delete(id: number) {
    // Notify AI service to stop stream
    try {
      await this.aiGateway.stopStream(id);
    } catch (e) {
      console.warn(`[CamerasService] AI stream stop failed: ${e.message}`);
    }

    return this.prisma.camera.delete({ where: { id } });
  }
}
