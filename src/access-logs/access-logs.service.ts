import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TelemetryGateway } from '../gateway/telemetry.gateway';
import { promises as fs } from 'fs';
import { join } from 'path';

@Injectable()
export class AccessLogsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: TelemetryGateway,
  ) {}

  async create(data: {
    cameraId: number;
    personnelId?: number;
    isAuthorized: boolean;
    matchedName: string;
    file?: any;
  }) {
    let snapshotPath: string | null = null;

    if (data.file) {
      const uploadDir = join(process.cwd(), 'uploads', 'snapshots');
      await fs.mkdir(uploadDir, { recursive: true });
      const fileExt = data.file.originalname.split('.').pop() ?? 'jpg';
      const fileName = `access_${Date.now()}.${fileExt}`;
      const filePath = join(uploadDir, fileName);
      await fs.writeFile(filePath, data.file.buffer);
      snapshotPath = `/uploads/snapshots/${fileName}`;
    }

    const log = await this.prisma.accessLog.create({
      data: {
        cameraId: data.cameraId,
        personnelId: data.personnelId ?? null,
        isAuthorized: data.isAuthorized,
        matchedName: data.matchedName,
        snapshotPath,
      },
      include: { camera: true, personnel: true },
    });

    // Broadcast via WS
    this.gateway.emitAccessLog(log);

    return log;
  }

  async findAll() {
    return this.prisma.accessLog.findMany({
      include: { camera: true, personnel: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
