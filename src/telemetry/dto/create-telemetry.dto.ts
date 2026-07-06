import { IsBoolean, IsNumber, Max, Min } from 'class-validator';

export class CreateTelemetryDto {
  @IsNumber()
  @Min(-10)
  @Max(80)
  temperature: number;

  @IsNumber()
  @Min(0)
  @Max(500)
  ammonia: number;

  @IsNumber()
  @Min(0)
  @Max(1000)
  feedWeight: number;

  @IsBoolean()
  fanActive: boolean;

  @IsBoolean()
  heaterActive: boolean;
}
