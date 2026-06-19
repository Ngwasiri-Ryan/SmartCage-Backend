import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RelayService {
  constructor(private readonly prisma: PrismaService) {}

  async getState() {
    const latest = await this.prisma.telemetryReading.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (!latest) {
      return {
        fanActive: false,
        heaterActive: false,
        derivedFrom: null,
      };
    }

    return {
      fanActive: latest.fanActive,
      heaterActive: latest.heaterActive,
      derivedFrom: {
        ammoniaPpm: latest.ammonia,
        temperatureC: latest.temperature,
        readingId: latest.id,
        readingAt: latest.createdAt,
      },
    };
  }
}
