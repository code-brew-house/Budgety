import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { Frequency } from '@prisma/client';

export class CreateRecurringExpenseDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  @Transform(({ value }) =>
    value != null ? Math.trunc(value * 100) / 100 : value,
  )
  amount!: number;

  @IsNotEmpty()
  @IsString()
  description!: string;

  @IsNotEmpty()
  @IsEnum(Frequency)
  frequency!: Frequency;

  @IsNotEmpty()
  @IsDateString()
  startDate!: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsNotEmpty()
  @IsString()
  categoryId!: string;
}
