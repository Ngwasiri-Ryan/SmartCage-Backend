import { Injectable } from '@nestjs/common';

@Injectable()
export class AIGatewayService {
  private readonly aiServiceUrl = process.env.AI_SERVICE_URL ?? 'http://localhost:8000';

  async startStream(cameraId: number, rtspUrl: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.aiServiceUrl}/start-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cameraId, rtspUrl }),
      });
      return response.ok;
    } catch (e) {
      console.error(`[AIGateway] Failed to start stream for camera #${cameraId}:`, e.message);
      return false;
    }
  }

  async stopStream(cameraId: number): Promise<boolean> {
    try {
      const response = await fetch(`${this.aiServiceUrl}/stop-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cameraId }),
      });
      return response.ok;
    } catch (e) {
      console.error(`[AIGateway] Failed to stop stream for camera #${cameraId}:`, e.message);
      return false;
    }
  }

  async generateFaceEmbedding(personnelId: number, angle: string, imagePath: string): Promise<number[]> {
    try {
      const response = await fetch(`${this.aiServiceUrl}/register-face`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personnelId, angle, imagePath }),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      return data.embedding as number[];
    } catch (e) {
      console.error(`[AIGateway] Failed to generate face embedding for personnel #${personnelId}:`, e.message);
      throw e;
    }
  }
}
