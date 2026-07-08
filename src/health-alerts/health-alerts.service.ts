import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TelemetryGateway } from '../gateway/telemetry.gateway';
import { promises as fs } from 'fs';
import { join } from 'path';

@Injectable()
export class HealthAlertsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: TelemetryGateway,
  ) {}

  async create(data: { cameraId: number; movementScore: number; description: string; file?: any }) {
    let snapshotPath: string | null = null;

    if (data.file) {
      const uploadDir = join(process.cwd(), 'uploads', 'snapshots');
      await fs.mkdir(uploadDir, { recursive: true });
      const fileExt = data.file.originalname.split('.').pop() ?? 'jpg';
      const fileName = `chick_health_${Date.now()}.${fileExt}`;
      const filePath = join(uploadDir, fileName);
      await fs.writeFile(filePath, data.file.buffer);
      snapshotPath = `/uploads/snapshots/${fileName}`;
    }

    const alert = await this.prisma.healthAlert.create({
      data: {
        cameraId: data.cameraId,
        movementScore: data.movementScore,
        description: data.description,
        snapshotPath,
      },
      include: { camera: true },
    });

    // Broadcast via WebSocket
    this.gateway.emitHealthAlert(alert);

    return alert;
  }

  async findAll(cameraId?: number) {
    return this.prisma.healthAlert.findMany({
      where: cameraId ? { cameraId } : {},
      include: { camera: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
