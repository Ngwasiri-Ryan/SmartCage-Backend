import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TelemetryGateway } from '../gateway/telemetry.gateway';
import { AlertsService } from '../alerts/alerts.service';
import { CreateFeedDto } from './dto/create-feed.dto';

type FeedSlot = 'MORNING' | 'AFTERNOON' | 'NIGHT';

@Injectable()
export class FeedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: TelemetryGateway,
    private readonly alertsService: AlertsService,
  ) {}

  // ─── Ingest a single 8-hour interval reading ─────────────────────────────

  async createReading(dto: CreateFeedDto) {
    const today = this.todayMidnightUtc();

    // Upsert: if a reading for this slot today already exists, overwrite it
    await this.prisma.feedReading.upsert({
      where: { slot_date: { slot: dto.slot, date: today } },
      update: { weightKg: dto.weightKg },
      create: { slot: dto.slot, weightKg: dto.weightKg, date: today },
    });

    // Attempt to compute daily total
    const dailyTotal = await this.computeDailyTotal(today);

    // Evaluate feed-related alert rules
    await this.runFeedAlertEngine();

    // Emit live update
    const todayState = await this.getToday();
    this.gateway.emitFeedUpdate(todayState);

    return {
      status: 'ok',
      slot: dto.slot,
      weightKg: dto.weightKg,
      dailyTotal,
    };
  }

  // ─── Get today's intervals + total ───────────────────────────────────────

  async getToday() {
    const today = this.todayMidnightUtc();
    const readings = await this.prisma.feedReading.findMany({
      where: { date: today },
    });

    const intervals: Record<FeedSlot, number | null> = {
      MORNING: null,
      AFTERNOON: null,
      NIGHT: null,
    };
    let total = 0;
    for (const r of readings) {
      intervals[r.slot] = r.weightKg;
      total += r.weightKg;
    }

    return {
      date: today.toISOString().split('T')[0],
      intervals,
      totalKg: parseFloat(total.toFixed(2)),
      isComplete: readings.length === 3,
    };
  }

  // ─── Get last 7 days of daily summaries ──────────────────────────────────

  async getHistory() {
    const summaries = await this.prisma.dailyFeedSummary.findMany({
      orderBy: { date: 'asc' },
      take: 7,
    });
    return summaries.map((s) => ({
      date: s.date.toISOString().split('T')[0],
      totalKg: s.totalKg,
      isDeclineTrend: s.isDeclineTrend,
    }));
  }

  // ─── Compute and upsert daily total ──────────────────────────────────────

  private async computeDailyTotal(date: Date): Promise<number | null> {
    const readings = await this.prisma.feedReading.findMany({
      where: { date },
    });
    if (readings.length < 3) return null;

    const total = parseFloat(
      readings.reduce((sum, r) => sum + r.weightKg, 0).toFixed(2),
    );

    // Compute decline trend from last 3 summaries
    const recent = await this.prisma.dailyFeedSummary.findMany({
      orderBy: { date: 'desc' },
      take: 2,
    });
    let isDeclineTrend = false;
    if (recent.length === 2) {
      isDeclineTrend = total < recent[0].totalKg && recent[0].totalKg < recent[1].totalKg;
    }

    await this.prisma.dailyFeedSummary.upsert({
      where: { date },
      update: { totalKg: total, isDeclineTrend },
      create: { date, totalKg: total, isDeclineTrend },
    });

    return total;
  }

  // ─── Feed Alert Engine ────────────────────────────────────────────────────

  private async runFeedAlertEngine() {
    // Rule 1: Declining trend (2 consecutive daily drops)
    const recent3 = await this.prisma.dailyFeedSummary.findMany({
      orderBy: { date: 'desc' },
      take: 3,
    });
    if (recent3.length === 3) {
      const [d0, d1, d2] = recent3;
      if (d0.totalKg < d1.totalKg && d1.totalKg < d2.totalKg) {
        const alert = await this.alertsService.createIfNotExists(
          'FEED',
          'WARNING',
          'Feed consumption declining for 2 consecutive days — check bird health',
        );
        if (alert) this.gateway.emitAlertNew(alert);
      }
    }

    // Rule 2: Mechanical check — any 8-hour reading < 5% of 3-day avg
    const last3DaySummaries = await this.prisma.dailyFeedSummary.findMany({
      orderBy: { date: 'desc' },
      take: 3,
    });
    if (last3DaySummaries.length > 0) {
      const avgDaily =
        last3DaySummaries.reduce((s, d) => s + d.totalKg, 0) /
        last3DaySummaries.length;
      const avgInterval = avgDaily / 3;
      const threshold = avgInterval * 0.05;

      const today = this.todayMidnightUtc();
      const todayReadings = await this.prisma.feedReading.findMany({
        where: { date: today },
      });
      for (const r of todayReadings) {
        if (r.weightKg < threshold) {
          const alert = await this.alertsService.createIfNotExists(
            'FEED',
            'WARNING',
            'Feeder may be blocked (8-hour cycle very low) — check equipment',
          );
          if (alert) this.gateway.emitAlertNew(alert);
          break;
        }
      }
    }
  }

  // ─── Helper ───────────────────────────────────────────────────────────────

  private todayMidnightUtc(): Date {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }
}
