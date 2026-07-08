import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly client: PrismaClient;

  constructor() {
    const connectionString = process.env.DATABASE_URL!;
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    this.client = new PrismaClient({ adapter } as any);
  }

  // ── Model accessors ───────────────────────────────────────────────────────

  get telemetryReading() {
    return this.client.telemetryReading;
  }

  get feedReading() {
    return this.client.feedReading;
  }

  get dailyFeedSummary() {
    return this.client.dailyFeedSummary;
  }

  get alert() {
    return this.client.alert;
  }

  get dailyAISummary() {
    return this.client.dailyAISummary;
  }

  get camera() {
    return this.client.camera;
  }

  get personnel() {
    return this.client.personnel;
  }

  get faceData() {
    return this.client.faceData;
  }

  get healthAlert() {
    return this.client.healthAlert;
  }

  get accessLog() {
    return this.client.accessLog;
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  async onModuleInit() {
    await this.client.$connect();
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
  }
}
