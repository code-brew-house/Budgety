import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { Frequency } from '@prisma/client';

export class UpdateRecurringExpenseDto {
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Transform(({ value }) =>
    value != null ? Math.trunc(value * 100) / 100 : value,
  )
  amount?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(Frequency)
  frequency?: Frequency;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
