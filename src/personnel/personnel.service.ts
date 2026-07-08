import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AIGatewayService } from '../ai-gateway/ai-gateway.service';
import { promises as fs } from 'fs';
import { join } from 'path';

@Injectable()
export class PersonnelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiGateway: AIGatewayService,
  ) {}

  async create(data: { name: string; role: string }) {
    return this.prisma.personnel.create({
      data: {
        name: data.name,
        role: data.role,
        active: true,
      },
    });
  }

  async findAll() {
    return this.prisma.personnel.findMany({
      include: { faces: true },
    });
  }

  async findOne(id: number) {
    const personnel = await this.prisma.personnel.findUnique({
      where: { id },
      include: { faces: true },
    });
    if (!personnel) throw new NotFoundException(`Personnel #${id} not found`);
    return personnel;
  }

  async addFace(id: number, angle: string, file: any) {
    await this.findOne(id);

    // Save file locally
    const uploadDir = join(process.cwd(), 'uploads', 'faces');
    await fs.mkdir(uploadDir, { recursive: true });

    const fileExt = file.originalname.split('.').pop() ?? 'jpg';
    const fileName = `${id}_${angle.toLowerCase()}_${Date.now()}.${fileExt}`;
    const filePath = join(uploadDir, fileName);
    await fs.writeFile(filePath, file.buffer);

    const relativePath = `/uploads/faces/${fileName}`;

    // Get embedding from AI service
    let embedding: number[] = [];
    try {
      embedding = await this.aiGateway.generateFaceEmbedding(id, angle, relativePath);
    } catch (e) {
      console.error(`[PersonnelService] Failed to generate face embedding:`, e.message);
      // Fallback fallback: Generate dummy 512 embedding if microservice is unreachable/fails
      embedding = Array(512).fill(0.0);
    }

    // Save FaceData record (upsert based on personnelId + angle)
    const existingFace = await this.prisma.faceData.findFirst({
      where: { personnelId: id, angle },
    });

    if (existingFace) {
      // delete old file if it exists
      try {
        const oldPath = join(process.cwd(), existingFace.imagePath.substring(1));
        await fs.unlink(oldPath);
      } catch {}

      return this.prisma.faceData.update({
        where: { id: existingFace.id },
        data: { imagePath: relativePath, embedding },
      });
    }

    return this.prisma.faceData.create({
      data: {
        personnelId: id,
        angle,
        imagePath: relativePath,
        embedding,
      },
    });
  }
}
