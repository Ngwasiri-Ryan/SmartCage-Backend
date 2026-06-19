import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type AlertType = 'TEMPERATURE' | 'AMMONIA' | 'FEED' | 'COMBINED';
type AlertSeverity = 'CAUTION' | 'WARNING' | 'CRITICAL' | 'EMERGENCY';

@Injectable()
export class AlertsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.alert.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteAll() {
    const result = await this.prisma.alert.deleteMany();
    return { status: 'ok', deleted: result.count };
  }

  /**
   * Creates an alert only if no identical description exists for today.
   * Returns the created alert or null if it was a duplicate.
   */
  async createIfNotExists(
    type: AlertType,
    severity: AlertSeverity,
    description: string,
  ) {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const existing = await this.prisma.alert.findFirst({
      where: {
        description,
        createdAt: { gte: todayStart },
      },
    });

    if (existing) return null;

    return this.prisma.alert.create({
      data: { type, severity, description },
    });
  }
}
