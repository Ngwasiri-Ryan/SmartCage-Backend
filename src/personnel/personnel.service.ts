import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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

  async registerWithFaces(name: string, role: string, front: any, left: any, right: any) {
    if (!front || !left || !right) {
      throw new BadRequestException('All three face angles (front, left, right) are required.');
    }

    const uploadDir = join(process.cwd(), 'uploads', 'faces');
    await fs.mkdir(uploadDir, { recursive: true });

    const timestamp = Date.now();
    const frontExt = front.originalname.split('.').pop() ?? 'jpg';
    const leftExt = left.originalname.split('.').pop() ?? 'jpg';
    const rightExt = right.originalname.split('.').pop() ?? 'jpg';

    // Temporary paths
    const tempFrontPath = join(uploadDir, `temp_front_${timestamp}.${frontExt}`);
    const tempLeftPath = join(uploadDir, `temp_left_${timestamp}.${leftExt}`);
    const tempRightPath = join(uploadDir, `temp_right_${timestamp}.${rightExt}`);

    // Save temporary files
    await fs.writeFile(tempFrontPath, front.buffer);
    await fs.writeFile(tempLeftPath, left.buffer);
    await fs.writeFile(tempRightPath, right.buffer);

    const relativeTempFront = `/uploads/faces/temp_front_${timestamp}.${frontExt}`;
    const relativeTempLeft = `/uploads/faces/temp_left_${timestamp}.${leftExt}`;
    const relativeTempRight = `/uploads/faces/temp_right_${timestamp}.${rightExt}`;

    const validationErrors: Record<string, string> = {};
    const embeddings: Record<string, number[]> = {};

    // Validate FRONT
    try {
      const res = await this.aiGateway.validateFace(relativeTempFront);
      if (res.status === 'error') {
        validationErrors['front'] = res.error || 'unknown_validation_error';
      } else {
        embeddings['FRONT'] = res.embedding || Array(512).fill(0.0);
      }
    } catch (e) {
      embeddings['FRONT'] = Array(512).fill(0.0);
    }

    // Validate LEFT
    try {
      const res = await this.aiGateway.validateFace(relativeTempLeft);
      if (res.status === 'error') {
        validationErrors['left'] = res.error || 'unknown_validation_error';
      } else {
        embeddings['LEFT'] = res.embedding || Array(512).fill(0.0);
      }
    } catch (e) {
      embeddings['LEFT'] = Array(512).fill(0.0);
    }

    // Validate RIGHT
    try {
      const res = await this.aiGateway.validateFace(relativeTempRight);
      if (res.status === 'error') {
        validationErrors['right'] = res.error || 'unknown_validation_error';
      } else {
        embeddings['RIGHT'] = res.embedding || Array(512).fill(0.0);
      }
    } catch (e) {
      embeddings['RIGHT'] = Array(512).fill(0.0);
    }

    // Clean up if there are validation errors
    if (Object.keys(validationErrors).length > 0) {
      try {
        await fs.unlink(tempFrontPath);
      } catch {}
      try {
        await fs.unlink(tempLeftPath);
      } catch {}
      try {
        await fs.unlink(tempRightPath);
      } catch {}

      throw new BadRequestException({
        statusCode: 400,
        message: 'Face validation failed for one or more angles.',
        errors: validationErrors,
      });
    }

    // Success flow: Create Personnel profile
    const personnel = await this.prisma.personnel.create({
      data: {
        name,
        role,
        active: true,
      },
    });

    const id = personnel.id;

    // Final file names
    const frontName = `${id}_front_${timestamp}.${frontExt}`;
    const leftName = `${id}_left_${timestamp}.${leftExt}`;
    const rightName = `${id}_right_${timestamp}.${rightExt}`;

    const finalFrontPath = join(uploadDir, frontName);
    const finalLeftPath = join(uploadDir, leftName);
    const finalRightPath = join(uploadDir, rightName);

    // Rename temp files to final paths
    await fs.rename(tempFrontPath, finalFrontPath);
    await fs.rename(tempLeftPath, finalLeftPath);
    await fs.rename(tempRightPath, finalRightPath);

    const relativeFront = `/uploads/faces/${frontName}`;
    const relativeLeft = `/uploads/faces/${leftName}`;
    const relativeRight = `/uploads/faces/${rightName}`;

    // Create FaceData records in database
    await this.prisma.faceData.createMany({
      data: [
        { personnelId: id, angle: 'FRONT', imagePath: relativeFront, embedding: embeddings['FRONT'] },
        { personnelId: id, angle: 'LEFT', imagePath: relativeLeft, embedding: embeddings['LEFT'] },
        { personnelId: id, angle: 'RIGHT', imagePath: relativeRight, embedding: embeddings['RIGHT'] },
      ],
    });

    return this.findOne(id);
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
}
