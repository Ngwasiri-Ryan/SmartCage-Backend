import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SummaryService {
  constructor(private readonly prisma: PrismaService) {}

  async getToday() {
    const today = this.todayMidnightUtc();
    const summary = await this.prisma.dailyAISummary.findUnique({
      where: { date: today },
    });
    if (!summary) throw new NotFoundException('No summary generated yet for today');
    return {
      date: today.toISOString().split('T')[0],
      summary: summary.summary,
      generatedAt: summary.date,
    };
  }

  async generate() {
    // Fetch latest telemetry
    const latest = await this.prisma.telemetryReading.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    // Fetch last 3 daily feed summaries
    const feedHistory = await this.prisma.dailyFeedSummary.findMany({
      orderBy: { date: 'desc' },
      take: 3,
    });

    const temperature = latest?.temperature ?? 24;
    const ammonia = latest?.ammonia ?? 0;
    const isDeclineTrend = feedHistory.length > 0 && feedHistory[0].isDeclineTrend;

    const summaryText = this.buildSummaryText(temperature, ammonia, isDeclineTrend);

    const today = this.todayMidnightUtc();
    const record = await this.prisma.dailyAISummary.upsert({
      where: { date: today },
      update: { summary: summaryText },
      create: { date: today, summary: summaryText },
    });

    return {
      date: today.toISOString().split('T')[0],
      summary: record.summary,
      generatedAt: record.date,
    };
  }

  // ─── Rule-based summary (offline-safe, no external API required) ──────────

  private buildSummaryText(
    temperature: number,
    ammonia: number,
    isDeclineTrend: boolean,
  ): string {
    if (ammonia >= 50) {
      return 'Critical ammonia hazard! Automated fans are fully engaged. Inspect coop immediately.';
    }
    if (temperature < 15) {
      return 'Low temperature threshold crossed. Heater relay engaged to safeguard chicks.';
    }
    if (temperature > 40) {
      return 'Extreme heat stress risk. Fan relays working at maximum speed capacity.';
    }
    if (isDeclineTrend && ammonia >= 25) {
      return 'Combined Risk: Ammonia high and feed intake dropping. High risk of flock illness.';
    }
    if (isDeclineTrend) {
      return 'Feed intake is dropping consecutive days. Assess flock for clinical symptoms.';
    }
    if (ammonia >= 25) {
      return 'Ammonia levels high. Automated ventilation fans activated to restore equilibrium.';
    }
    return 'Temperature and ammonia are within safe limits. Feed intake is steady.';
  }

  private todayMidnightUtc(): Date {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }
}
