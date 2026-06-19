import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TelemetryGateway } from '../gateway/telemetry.gateway';
import { AlertsService } from '../alerts/alerts.service';
import { CreateTelemetryDto } from './dto/create-telemetry.dto';

type AlertType = 'TEMPERATURE' | 'AMMONIA' | 'FEED' | 'COMBINED';
type AlertSeverity = 'CAUTION' | 'WARNING' | 'CRITICAL' | 'EMERGENCY';

@Injectable()
export class TelemetryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: TelemetryGateway,
    private readonly alertsService: AlertsService,
  ) {}

  async create(dto: CreateTelemetryDto) {
    // 1. Persist reading
    const reading = await this.prisma.telemetryReading.create({ data: dto });

    // 2. Run alert engine
    const alertsTriggered = await this.runAlertEngine(
      dto.temperature,
      dto.ammonia,
    );

    // 3. Emit live telemetry update to all connected Flutter clients
    this.gateway.emitTelemetryUpdate(reading);

    // 4. Emit relay:change if state changed from previous
    await this.checkRelayChange(dto.fanActive, dto.heaterActive, reading.id);

    return { status: 'ok', id: reading.id, alertsTriggered };
  }

  async getLatest() {
    return this.prisma.telemetryReading.findFirst({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getHistory(hours: number = 24) {
    const since = new Date();
    since.setHours(since.getHours() - hours);
    return this.prisma.telemetryReading.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true, temperature: true, ammonia: true },
    });
  }

  // ─── Alert Engine ─────────────────────────────────────────────────────────

  private async runAlertEngine(
    temperature: number,
    ammonia: number,
  ): Promise<number> {
    const rules: Array<{
      condition: boolean;
      type: AlertType;
      severity: AlertSeverity;
      description: string;
    }> = [
      {
        condition: temperature < 15,
        type: 'TEMPERATURE',
        severity: 'WARNING',
        description: 'Very cold temperatures detected — check heating',
      },
      {
        condition: temperature > 40,
        type: 'TEMPERATURE',
        severity: 'WARNING',
        description: 'Very hot temperatures detected — check ventilation',
      },
      {
        condition: ammonia >= 10 && ammonia < 25,
        type: 'AMMONIA',
        severity: 'CAUTION',
        description: 'Ammonia level entering watch zone (Caution)',
      },
      {
        condition: ammonia >= 25 && ammonia < 50,
        type: 'AMMONIA',
        severity: 'WARNING',
        description: 'Elevated Ammonia - ventilation automated (Warning)',
      },
      {
        condition: ammonia >= 50 && ammonia <= 100,
        type: 'AMMONIA',
        severity: 'CRITICAL',
        description: 'Hazardous Ammonia: ventilation at full cap (Critical)',
      },
      {
        condition: ammonia > 100,
        type: 'AMMONIA',
        severity: 'EMERGENCY',
        description: 'Severe Ammonia: Evacuate birds immediately (Emergency)',
      },
    ];

    let triggered = 0;
    for (const rule of rules) {
      if (rule.condition) {
        const created = await this.alertsService.createIfNotExists(
          rule.type,
          rule.severity,
          rule.description,
        );
        if (created) {
          this.gateway.emitAlertNew(created);
          triggered++;
        }
      }
    }
    return triggered;
  }

  // ─── Relay Change Detection ───────────────────────────────────────────────

  private async checkRelayChange(
    fanActive: boolean,
    heaterActive: boolean,
    currentId: number,
  ) {
    const previous = await this.prisma.telemetryReading.findFirst({
      where: { id: { lt: currentId } },
      orderBy: { createdAt: 'desc' },
    });

    if (!previous) return;

    if (
      previous.fanActive !== fanActive ||
      previous.heaterActive !== heaterActive
    ) {
      this.gateway.emitRelayChange({ fanActive, heaterActive });
    }
  }
}
