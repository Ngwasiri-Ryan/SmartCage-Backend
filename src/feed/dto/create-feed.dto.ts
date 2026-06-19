import { IsEnum, IsNumber, Min, Max } from 'class-validator';

type FeedSlot = 'MORNING' | 'AFTERNOON' | 'NIGHT';

export class CreateFeedDto {
  @IsEnum(['MORNING', 'AFTERNOON', 'NIGHT'])
  slot: FeedSlot;

  @IsNumber()
  @Min(0)
  @Max(1000)
  weightKg: number;
}
